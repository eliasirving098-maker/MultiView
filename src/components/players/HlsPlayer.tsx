/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

interface HlsPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Register primary video and observe all media elements within this slot container
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const unregisterVideo = globalAudioManager.registerMediaElement(
      slot.id,
      video,
      slot.volume
    );

    const unregisterContainer = globalAudioManager.observeContainerMedia(
      slot.id,
      container,
      slot.volume
    );

    return () => {
      unregisterVideo();
      unregisterContainer();
    };
  }, [slot.id, slot.volume]);

  // Synchronize audio state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isUnmuted;
    if (isUnmuted) {
      video.volume = slot.volume ?? 1;
      video.play().catch(() => {});
    }
  }, [isUnmuted, slot.volume]);

  // Hls.js lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !slot.url) return;

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
            // Fallback to muted playback if user hasn't interacted yet
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
                `Error fatal HLS (${data.details}). Verifique CORS en el manifest.`
              );
              hlsInstance?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = slot.url;
      video.addEventListener('loadedmetadata', () => {
        video.muted = !isUnmuted;
        video
          .play()
          .then(() => onStatusChange?.('playing', 'none'))
          .catch(() => onStatusChange?.('paused', 'none'));
      });
      video.addEventListener('error', () => {
        onStatusChange?.('error', 'playback-error', 'Error en stream HLS nativo.');
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
  }, [slot.url, slot.reloadKey]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden group"
    >
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
};
