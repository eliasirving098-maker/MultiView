/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

interface Html5PlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const Html5Player: React.FC<Html5PlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Register all current and dynamically added media elements (video & audio) within this slot container
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // Direct synchronous registration for the primary video element
    const unregisterVideo = globalAudioManager.registerMediaElement(
      slot.id,
      video,
      slot.volume
    );

    // Dynamic observer for any additional audio/video tracks injected at runtime
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

  // Synchronize audio state when isUnmuted or volume updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isUnmuted;
    if (isUnmuted) {
      video.volume = slot.volume ?? 1;
      video.play().catch(() => {});
    }
  }, [isUnmuted, slot.volume]);

  // Video source loading and event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !slot.url) return;

    onStatusChange?.('loading', 'none');
    video.src = slot.url;
    video.muted = !isUnmuted;

    const handleCanPlay = () => {
      video.muted = !isUnmuted;
      video
        .play()
        .then(() => onStatusChange?.('playing', 'none'))
        .catch(() => {
          // Autoplay policy fallback: mute and play
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
        'No se pudo reproducir el archivo de video. Verifique la URL y CORS.'
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
