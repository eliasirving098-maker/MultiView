/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

interface TwitchPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const TwitchPlayer: React.FC<TwitchPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendTwitchMessage = (muted: boolean) => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: muted ? 'mute' : 'unMute' }),
          '*'
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ type: 'player', data: { muted } }),
          '*'
        );
      } catch {
        // Cross-origin safety
      }
    }
  };

  useEffect(() => {
    const unregister = globalAudioManager.registerIframeController(slot.id, (shouldBeMuted) => {
      sendTwitchMessage(shouldBeMuted);
    });
    return unregister;
  }, [slot.id]);

  useEffect(() => {
    sendTwitchMessage(!isUnmuted);
  }, [isUnmuted]);

  const targetSrc = slot.embedUrl || slot.url;

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
      <iframe
        ref={iframeRef}
        key={`twitch-${slot.id}-${slot.reloadKey}`}
        src={targetSrc}
        title={slot.title || 'Twitch Player'}
        allow="autoplay; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-full border-0 pointer-events-auto bg-black block m-0 p-0"
        onLoad={() => {
          onStatusChange?.('playing', 'none');
          sendTwitchMessage(!isUnmuted);
        }}
        onError={() => {
          onStatusChange?.('error', 'iframe-error', 'Error al cargar reproductor de Twitch.');
        }}
      />
    </div>
  );
};
