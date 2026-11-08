/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as dashjs from 'dashjs';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

interface DashPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const DashPlayer: React.FC<DashPlayerProps> = ({
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

  // Dash.js lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !slot.url) return;

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
