/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager, sendIframeAudioCommands } from '../../services/audioManager';

interface WebPagePlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const WebPagePlayer: React.FC<WebPagePlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const targetSrc = slot.embedUrl || slot.url;

  // Register with globalAudioManager to mute when another stream is unmuted
  useEffect(() => {
    const unregister = globalAudioManager.registerIframeController(slot.id, (shouldBeMuted) => {
      sendIframeAudioCommands(iframeRef.current, shouldBeMuted);
    });
    return unregister;
  }, [slot.id]);

  // Synchronize on isUnmuted prop changes
  useEffect(() => {
    sendIframeAudioCommands(iframeRef.current, !isUnmuted);
  }, [isUnmuted]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center group/webpage">
      <iframe
        ref={iframeRef}
        key={`webpage-${slot.id}-${slot.reloadKey}`}
        src={targetSrc}
        title={slot.title || 'Página Web Externa'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-full border-0 pointer-events-auto bg-white/5 block m-0 p-0"
        onLoad={() => {
          onStatusChange?.(
            'external-loaded',
            'unobservable-cross-origin',
            'Página web cargada. Si contiene reproductores anidados, se ejecutan en su contexto original.'
          );
          sendIframeAudioCommands(iframeRef.current, !isUnmuted);
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
};
