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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Register with globalAudioManager for direct synchronous muting
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const unregister = globalAudioManager.registerMediaElement(slot.id, video);
    return unregister;
  }, [slot.id]);

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
};
