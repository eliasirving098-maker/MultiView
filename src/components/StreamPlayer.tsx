/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { StreamSlot, StreamType } from '../types/stream';
import { globalAudioManager } from '../services/audioManager';
import { AlertTriangle, ExternalLink, RefreshCw, VolumeX, ShieldAlert, ArrowLeft } from 'lucide-react';
import { SportsStreamHelper } from './SportsStreamHelper';

interface StreamPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (status: StreamSlot['status'], errorMessage?: string) => void;
  onRetry?: () => void;
  onReplaceUrl?: (newUrl: string) => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
  onRetry,
  onReplaceUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isEmbedPlayer =
    slot.url.includes('/embed/') ||
    slot.url.includes('streamec') ||
    slot.url.includes('embedcenter') ||
    slot.url.includes('streamscenter');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isIframeBlocked, setIsIframeBlocked] = useState(false);
  const [isSportsIframeActive, setIsSportsIframeActive] = useState(() => isEmbedPlayer);

  // Clean error state on slot change or reloadKey
  useEffect(() => {
    setLoadError(null);
    setIsIframeBlocked(false);
    setIsSportsIframeActive(isEmbedPlayer);
  }, [slot.url, slot.reloadKey, isEmbedPlayer]);

  // Audio synchronization for HTML5 / HLS / DASH video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isUnmuted;
      if (isUnmuted) {
        videoRef.current.volume = slot.volume || 1;
        // Attempt playback with audio if browser suspended it
        videoRef.current.play().catch(() => {
          // Browser autoplay with sound restriction handled gracefully
        });
      }
    }
  }, [isUnmuted, slot.volume]);

  // Register iframe audio controller with global AudioManager
  useEffect(() => {
    if (
      slot.type === 'youtube' ||
      slot.type === 'vimeo' ||
      slot.type === 'twitch' ||
      slot.type === 'dailymotion'
    ) {
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
          // cross-origin postMessage safety
        }
      });

      return unregister;
    }
  }, [slot.id, slot.type]);

  // Engine instantiation for HLS
  useEffect(() => {
    if (slot.type !== 'hls' || !slot.url || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: Hls | null = null;
    onStatusChange?.('loading');

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
          .then(() => onStatusChange?.('playing'))
          .catch(() => {
            // If autoplay with sound failed, fallback to muted autoplay
            video.muted = true;
            video.play().then(() => onStatusChange?.('playing')).catch(() => {
              onStatusChange?.('paused');
            });
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
              setLoadError(`Error HLS (${data.details}). Verifique que la fuente permita CORS.`);
              onStatusChange?.('error', data.details);
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
        video.play().then(() => onStatusChange?.('playing')).catch(() => onStatusChange?.('paused'));
      });
      video.addEventListener('error', () => {
        setLoadError('Error cargando stream HLS nativo.');
        onStatusChange?.('error', 'Native HLS error');
      });
    } else {
      setLoadError('El navegador no admite reproducción HLS.');
      onStatusChange?.('error', 'HLS unsupported');
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [slot.url, slot.type, slot.reloadKey]);

  // Engine instantiation for MPEG-DASH
  useEffect(() => {
    if (slot.type !== 'dash' || !slot.url || !videoRef.current) return;

    const video = videoRef.current;
    onStatusChange?.('loading');
    let dashPlayer: dashjs.MediaPlayerClass | null = null;

    try {
      dashPlayer = dashjs.MediaPlayer().create();
      dashPlayer.initialize(video, slot.url, true);
      video.muted = !isUnmuted;

      dashPlayer.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
        onStatusChange?.('playing');
      });

      dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        console.error('DASH error', e);
        setLoadError('Error cargando transmisión MPEG-DASH. Puede requerir CORS.');
        onStatusChange?.('error', 'DASH error');
      });
    } catch (err: any) {
      setLoadError(`Fallo al inicializar reproductor DASH: ${err?.message}`);
      onStatusChange?.('error', err?.message);
    }

    return () => {
      if (dashPlayer) {
        dashPlayer.reset();
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [slot.url, slot.type, slot.reloadKey]);

  // Direct HTML5 Video (.mp4, .webm)
  useEffect(() => {
    if (slot.type !== 'html5' || !slot.url || !videoRef.current) return;

    const video = videoRef.current;
    onStatusChange?.('loading');
    video.src = slot.url;
    video.muted = !isUnmuted;

    const handleCanPlay = () => {
      video
        .play()
        .then(() => onStatusChange?.('playing'))
        .catch(() => {
          // Muted fallback
          video.muted = true;
          video.play().then(() => onStatusChange?.('playing')).catch(() => onStatusChange?.('paused'));
        });
    };

    const handleError = () => {
      setLoadError('No se pudo reproducir el archivo multimedia. Verifique la URL y CORS.');
      onStatusChange?.('error', 'HTML5 Media Error');
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

  // If there's an error, show clear error card
  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#14151a] text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-white mb-1">Error de Transmisión</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed font-mono">
          {loadError}
        </p>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
          <a
            href={slot.originalInput || slot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 border border-white/5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir en navegador</span>
          </a>
        </div>
      </div>
    );
  }

  // Render HTML5 / HLS / DASH container
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
          onPlay={() => onStatusChange?.('playing')}
          onPause={() => onStatusChange?.('paused')}
          onWaiting={() => onStatusChange?.('loading')}
          onPlaying={() => onStatusChange?.('playing')}
        />
      </div>
    );
  }

  // Render YouTube Iframe
  if (slot.type === 'youtube' && slot.embedUrl) {
    return (
      <div className="w-full h-full relative bg-black overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`yt-${slot.reloadKey}`}
          src={slot.embedUrl}
          title={slot.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      </div>
    );
  }

  // Render Twitch Iframe
  if (slot.type === 'twitch' && slot.embedUrl) {
    return (
      <div className="w-full h-full relative bg-black overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`twitch-${slot.reloadKey}`}
          src={slot.embedUrl}
          title={slot.title}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      </div>
    );
  }

  // Render Vimeo Iframe
  if (slot.type === 'vimeo' && slot.embedUrl) {
    return (
      <div className="w-full h-full relative bg-black overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`vimeo-${slot.reloadKey}`}
          src={slot.embedUrl}
          title={slot.title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      </div>
    );
  }

  // Render Dailymotion Iframe
  if (slot.type === 'dailymotion' && slot.embedUrl) {
    return (
      <div className="w-full h-full relative bg-black overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`dm-${slot.reloadKey}`}
          src={slot.embedUrl}
          title={slot.title}
          allow="autoplay; fullscreen; webkitallowfullscreen; mozallowfullscreen"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      </div>
    );
  }

  // Render Sports Portal with dedicated SportsStreamHelper
  if (slot.type === 'sports-portal') {
    if (!isSportsIframeActive) {
      return (
        <SportsStreamHelper
          slot={slot}
          onReplaceUrl={(newUrl) => onReplaceUrl?.(newUrl)}
          isIframeMode={isSportsIframeActive}
          onToggleIframeMode={() => setIsSportsIframeActive(true)}
        />
      );
    }

    return (
      <div className="w-full h-full relative bg-black overflow-hidden group/sports">
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={() => setIsSportsIframeActive(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black text-white text-[11px] font-medium border border-white/10 shadow-lg backdrop-blur-md transition"
          >
            <ArrowLeft className="w-3 h-3 text-emerald-400" />
            <span>Asistente Deportivo</span>
          </button>
        </div>
        <iframe
          ref={iframeRef}
          key={`sports-${slot.reloadKey}`}
          src={slot.embedUrl || slot.url}
          title={slot.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0 pointer-events-auto bg-black"
          onLoad={() => {
            onStatusChange?.('playing');
          }}
          onError={() => {
            setIsIframeBlocked(true);
            onStatusChange?.('error', 'Error al cargar iframe');
          }}
        />
        {isIframeBlocked && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-10">
            <ShieldAlert className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs text-slate-200 font-semibold mb-1">
              Inserción bloqueada por Cloudflare o X-Frame-Options
            </p>
            <p className="text-[11px] text-slate-400 mb-3 max-w-xs">
              El portal no permite mostrar su página completa en un marco debido a sus directivas de seguridad.
            </p>
            <button
              onClick={() => setIsSportsIframeActive(false)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md"
            >
              Abrir Asistente Deportivo / Extractor
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render Generic Web Iframe / Page
  if (slot.type === 'iframe' && slot.embedUrl) {
    return (
      <div className="w-full h-full relative bg-black overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`iframe-${slot.reloadKey}`}
          src={slot.embedUrl}
          title={slot.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0 pointer-events-auto bg-white/5"
          onLoad={() => {
            onStatusChange?.('playing');
          }}
          onError={() => {
            setIsIframeBlocked(true);
            onStatusChange?.('error');
          }}
        />
        {isIframeBlocked && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center z-10">
            <ShieldAlert className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs text-slate-200 font-semibold mb-1">
              Inserción bloqueada por la página externa (X-Frame-Options)
            </p>
            <p className="text-[11px] text-slate-400 mb-3 max-w-xs">
              Este sitio web no permite visualizarse dentro de recuadros de terceros por sus políticas de seguridad.
            </p>
            <a
              href={slot.originalInput || slot.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir directamente</span>
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#101114] text-slate-500 text-xs">
      Sin contenido reproducible
    </div>
  );
};
