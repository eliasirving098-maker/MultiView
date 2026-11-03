/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

interface YouTubePlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch {
        // Cross-origin message safety
      }
    }
  };

  // Register with global audio manager for exclusive single-active sound
  useEffect(() => {
    const unregister = globalAudioManager.registerIframeController(slot.id, (shouldBeMuted) => {
      const command = shouldBeMuted ? 'mute' : 'unMute';
      sendYouTubeCommand(command, []);
      if (!shouldBeMuted) {
        sendYouTubeCommand('setVolume', [100]);
        sendYouTubeCommand('playVideo', []);
      }
    });

    return unregister;
  }, [slot.id]);

  // Synchronize on isUnmuted prop change
  useEffect(() => {
    const command = isUnmuted ? 'unMute' : 'mute';
    sendYouTubeCommand(command, []);
    if (isUnmuted) {
      sendYouTubeCommand('setVolume', [100]);
    }
  }, [isUnmuted]);

  const targetSrc = slot.embedUrl || slot.url;

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
      <iframe
        ref={iframeRef}
        key={`yt-${slot.id}-${slot.reloadKey}`}
        src={targetSrc}
        title={slot.title || 'YouTube Player'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="origin-when-cross-origin"
        className="w-full h-full border-0 pointer-events-auto bg-black block m-0 p-0"
        onLoad={() => {
          onStatusChange?.('playing', 'none');
          // Send initial audio state to player
          const initialCmd = isUnmuted ? 'unMute' : 'mute';
          sendYouTubeCommand(initialCmd, []);
          if (isUnmuted) {
            sendYouTubeCommand('setVolume', [100]);
          }
        }}
        onError={() => {
          onStatusChange?.('error', 'iframe-error', 'Error al cargar reproductor oficial de YouTube.');
        }}
      />
    </div>
  );
};
