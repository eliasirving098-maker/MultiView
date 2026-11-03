/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

interface VimeoPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const VimeoPlayer: React.FC<VimeoPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendVimeoMessage = (method: string, value: any) => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ method, value }),
          '*'
        );
      } catch {
        // Cross-origin safety
      }
    }
  };

  useEffect(() => {
    const unregister = globalAudioManager.registerIframeController(slot.id, (shouldBeMuted) => {
      sendVimeoMessage('setVolume', shouldBeMuted ? 0 : 1);
      sendVimeoMessage(shouldBeMuted ? 'mute' : 'unmute', null);
    });
    return unregister;
  }, [slot.id]);

  useEffect(() => {
    sendVimeoMessage('setVolume', isUnmuted ? 1 : 0);
  }, [isUnmuted]);

  const targetSrc = slot.embedUrl || slot.url;

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
      <iframe
        ref={iframeRef}
        key={`vimeo-${slot.id}-${slot.reloadKey}`}
        src={targetSrc}
        title={slot.title || 'Vimeo Player'}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="origin"
        className="w-full h-full border-0 pointer-events-auto bg-black block m-0 p-0"
        onLoad={() => {
          onStatusChange?.('playing', 'none');
          sendVimeoMessage('setVolume', isUnmuted ? 1 : 0);
        }}
        onError={() => {
          onStatusChange?.('error', 'iframe-error', 'Error al cargar reproductor de Vimeo.');
        }}
      />
    </div>
  );
};
