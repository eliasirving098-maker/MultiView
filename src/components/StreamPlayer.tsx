/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { DiagnosticCode, StreamSlot } from '../types/stream';
import { getProviderConfig } from '../services/providerAdapters';
import { globalAudioManager } from '../services/audioManager';
import { DiagnosticBanner } from './DiagnosticBanner';

interface StreamPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
  onRetry?: () => void;
  onEditUrl?: () => void;
  onReplaceUrl?: (newUrl: string) => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
  onRetry,
  onEditUrl,
  onReplaceUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // 1. Audio synchronization for HTML5 / HLS / DASH video elements
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isUnmuted;
      if (isUnmuted) {
        videoRef.current.volume = slot.volume || 1;
        videoRef.current.play().catch(() => {
          // Autoplay policy handled gracefully
        });
      }
    }
  }, [isUnmuted, slot.volume]);

  // 2. Audio control for official external players supporting postMessage API
  useEffect(() => {
    if (slot.type === 'youtube' || slot.type === 'vimeo') {
      const unregister = globalAudioManager.registerIframeController(slot.id, (shouldBeMuted) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) return;

        try {
          if (slot.type === 'youtube') {
            const command = shouldBeMuted ? 'mute' : 'unMute';
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: command, args: '' }),
              '*'
            );
            if (!shouldBeMuted) {
              iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
                '*'
              );
            }
          } else if (slot.type === 'vimeo') {
            const val = shouldBeMuted ? 0 : 1;
            iframe.contentWindow.postMessage(
              JSON.stringify({ method: 'setVolume', value: val }),
              '*'
            );
          }
        } catch {
          // Cross-origin postMessage safety
        }
      });

      return unregister;
    }
  }, [slot.id, slot.type]);

  // 3. Watchdog Timer (8 seconds): Never leave a stream in infinite loading
  useEffect(() => {
    if (slot.status !== 'loading' || slot.type === 'blob-resource') return;

    const timer = setTimeout(() => {
      if (slot.status === 'loading') {
        if (slot.classification === 'web-page') {
          onStatusChange?.(
            'error',
            'embedding-forbidden',
            'El sitio web no respondió a la inserción en marco (posible bloqueo por X-Frame-Options o CSP).'
          );
        } else {
          onStatusChange?.(
            'error',
            'timeout',
            'Tiempo de espera agotado (8 segundos). El servidor tardó en responder.'
          );
        }
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [slot.status, slot.reloadKey, slot.type, slot.classification, onStatusChange]);

  // 4. HLS Engine Lifecycle
  useEffect(() => {
    if (slot.type !== 'hls' || !slot.url || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: Hls | null = null;
    onStatusChange?.('loading', 'none');

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hlsInstance.loadSource(slot.url);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = !isUnmuted;
        video
          .play()
          .then(() => onStatusChange?.('playing', 'none'))
          .catch(() => {
            // Autoplay with sound restricted, fallback to muted autoplay
            video.muted = true;
            video
              .play()
              .then(() => onStatusChange?.('playing', 'none'))
              .catch(() => onStatusChange?.('paused', 'none'));
          });
      });

      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsInstance?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance?.recoverMediaError();
              break;
            default:
              onStatusChange?.(
                'error',
                'playback-error',
                `Error fatal HLS (${data.details}). Verifique CORS.`
              );
              hlsInstance?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari HLS
      video.src = slot.url;
      video.addEventListener('loadedmetadata', () => {
        video.muted = !isUnmuted;
        video
          .play()
          .then(() => onStatusChange?.('playing', 'none'))
          .catch(() => onStatusChange?.('paused', 'none'));
      });
      video.addEventListener('error', () => {
        onStatusChange?.('error', 'playback-error', 'Error en el stream HLS nativo.');
      });
    } else {
      onStatusChange?.('error', 'incompatible-resource', 'El navegador no admite reproducción HLS.');
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [slot.url, slot.type, slot.reloadKey]);

  // 5. MPEG-DASH Engine Lifecycle
  useEffect(() => {
    if (slot.type !== 'dash' || !slot.url || !videoRef.current) return;

    const video = videoRef.current;
    onStatusChange?.('loading', 'none');
    let dashPlayer: dashjs.MediaPlayerClass | null = null;

    try {
      dashPlayer = dashjs.MediaPlayer().create();
      dashPlayer.initialize(video, slot.url, true);
      video.muted = !isUnmuted;

      dashPlayer.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
        onStatusChange?.('playing', 'none');
      });

      dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        console.error('DASH error', e);
        onStatusChange?.(
          'error',
          'playback-error',
          'Error cargando transmisión MPEG-DASH. Puede requerir CORS.'
        );
      });
    } catch (err: any) {
      onStatusChange?.(
        'error',
        'initialization-error',
        `Fallo al inicializar reproductor DASH: ${err?.message}`
      );
    }

    return () => {
      if (dashPlayer) {
        dashPlayer.reset();
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [slot.url, slot.type, slot.reloadKey]);

  // 6. Direct HTML5 Video Lifecycle (.mp4, .webm)
  useEffect(() => {
    if (slot.type !== 'html5' || !slot.url || !videoRef.current) return;

    const video = videoRef.current;
    onStatusChange?.('loading', 'none');
    video.src = slot.url;
    video.muted = !isUnmuted;

    const handleCanPlay = () => {
      video
        .play()
        .then(() => onStatusChange?.('playing', 'none'))
        .catch(() => {
          video.muted = true;
          video
            .play()
            .then(() => onStatusChange?.('playing', 'none'))
            .catch(() => onStatusChange?.('paused', 'none'));
        });
    };

    const handleError = () => {
      onStatusChange?.(
        'error',
        'playback-error',
        'No se pudo reproducir el archivo multimedia. Verifique la URL y CORS.'
      );
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeAttribute('src');
      video.load();
    };
  }, [slot.url, slot.type, slot.reloadKey]);

  // 7. Blob Resource: Incompatible by design across origins / contexts
  if (slot.type === 'blob-resource') {
    return (
      <DiagnosticBanner
        slot={slot}
        onRetry={() => onRetry?.()}
        onEditUrl={() => onEditUrl?.()}
      />
    );
  }

  // 8. If slot has error or non-ignorable diagnostic, display DiagnosticBanner
  if (slot.status === 'error') {
    return (
      <DiagnosticBanner
        slot={slot}
        onRetry={() => onRetry?.()}
        onEditUrl={() => onEditUrl?.()}
      />
    );
  }

  // 9. Render Direct Media (HTML5 / HLS / DASH)
  if (slot.type === 'html5' || slot.type === 'hls' || slot.type === 'dash') {
    return (
      <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden group">
        <video
          ref={videoRef}
          playsInline
          loop
          autoPlay
          controls={false}
          className={`w-full h-full ${
            slot.aspectRatio === 'contain'
              ? 'object-contain'
              : slot.aspectRatio === 'cover'
              ? 'object-cover'
              : 'aspect-video object-contain'
          }`}
          onPlay={() => onStatusChange?.('playing', 'none')}
          onPause={() => onStatusChange?.('paused', 'none')}
          onWaiting={() => onStatusChange?.('loading', 'none')}
          onPlaying={() => onStatusChange?.('playing', 'none')}
        />
      </div>
    );
  }

  // 10. Render Official Platform Embeds (YouTube, Twitch, Vimeo, Dailymotion)
  if (
    (slot.type === 'youtube' ||
      slot.type === 'twitch' ||
      slot.type === 'vimeo' ||
      slot.type === 'dailymotion') &&
    slot.embedUrl
  ) {
    const config = getProviderConfig(slot.type);

    return (
      <div className="w-full h-full relative bg-black overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`${slot.type}-${slot.reloadKey}`}
          src={slot.embedUrl}
          title={slot.title}
          allow={config.allow}
          allowFullScreen={config.allowFullScreen}
          referrerPolicy={config.referrerPolicy}
          className="w-full h-full border-0 pointer-events-auto"
          onLoad={() => {
            onStatusChange?.('playing', 'none');
          }}
          onError={() => {
            onStatusChange?.('error', 'iframe-error', 'Error al cargar reproductor oficial.');
          }}
        />
      </div>
    );
  }

  // 11. Render Authorized Embed Documents (iframe-embed, e.g. streamec.st/embed/ch32.php)
  if (slot.type === 'iframe-embed' && (slot.embedUrl || slot.url)) {
    const config = getProviderConfig('iframe-embed');
    const targetSrc = slot.embedUrl || slot.url;

    return (
      <div className="w-full h-full relative bg-black overflow-hidden group/embed">
        <iframe
          ref={iframeRef}
          key={`embed-${slot.reloadKey}`}
          src={targetSrc}
          title={slot.title}
          allow={config.allow}
          allowFullScreen={config.allowFullScreen}
          referrerPolicy={config.referrerPolicy}
          className="w-full h-full border-0 pointer-events-auto bg-black"
          onLoad={() => {
            // Because cross-origin iframes are restricted by the browser's Same-Origin Policy,
            // we explicitly report external-loaded with unobservable-cross-origin.
            onStatusChange?.(
              'external-loaded',
              'unobservable-cross-origin',
              'Documento embed cargado en su marco original.'
            );
          }}
          onError={() => {
            onStatusChange?.(
              'error',
              'iframe-error',
              'Error al cargar documento embed en el marco.'
            );
          }}
        />
      </div>
    );
  }

  // 12. Render Web Page / Portal (web-page, e.g. tvsportslive.fr/baltimore-ravens-vs-buffalo-bills/)
  if (slot.type === 'web-page' && (slot.embedUrl || slot.url)) {
    const config = getProviderConfig('web-page');
    const targetSrc = slot.embedUrl || slot.url;

    return (
      <div className="w-full h-full relative bg-black overflow-hidden group/webpage">
        <iframe
          ref={iframeRef}
          key={`webpage-${slot.reloadKey}`}
          src={targetSrc}
          title={slot.title}
          allow={config.allow}
          allowFullScreen={config.allowFullScreen}
          referrerPolicy={config.referrerPolicy}
          className="w-full h-full border-0 pointer-events-auto bg-white/5"
          onLoad={() => {
            onStatusChange?.(
              'external-loaded',
              'unobservable-cross-origin',
              'Página web cargada. El estado del reproductor interno no es observable por Same-Origin Policy.'
            );
          }}
          onError={() => {
            onStatusChange?.(
              'error',
              'embedding-forbidden',
              'La página web externa bloqueó la inserción en marco.'
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#101114] text-slate-500 text-xs">
      Sin contenido reproducible
    </div>
  );
};
