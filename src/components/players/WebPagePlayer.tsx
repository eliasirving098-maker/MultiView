/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { globalAudioManager } from '../../services/audioManager';

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

  // External player compatibility mode:
  // - 'standard': Enforces controlled sandbox
  // - 'no-sandbox' (default): Absolutely NO sandbox attribute is added to the iframe tag.
  const isNoSandbox = slot.sandboxMode !== 'standard';
  const sandboxAttribute = isNoSandbox
    ? undefined
    : 'allow-scripts allow-same-origin allow-forms allow-presentation';

  // Ensure absolute absence of sandbox attribute in DOM when in no-sandbox mode
  useEffect(() => {
    if (iframeRef.current && isNoSandbox) {
      if (iframeRef.current.hasAttribute('sandbox')) {
        iframeRef.current.removeAttribute('sandbox');
      }
    }
  }, [isNoSandbox, slot.reloadKey]);

  // Audio coordination registration
  useEffect(() => {
    let unregisterSameOriginMedia: (() => void) | null = null;

    const checkSameOrigin = () => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          // Same-origin accessible: we can control internal media elements directly
          unregisterSameOriginMedia = globalAudioManager.observeContainerMedia(
            slot.id,
            doc.body,
            slot.volume
          );
          globalAudioManager.setSlotControllability(slot.id, 'controllable');
          return true;
        }
      } catch {
        // Cross-origin SOP boundary
      }
      return false;
    };

    const isSameOriginAccessible = checkSameOrigin();

    if (!isSameOriginAccessible) {
      // Full cross-origin websites cannot be remotely muted from the outside
      // due to browser security restrictions. Acknowledge accurately without false claims.
      globalAudioManager.setSlotControllability(slot.id, 'uncontrollable');
    }

    return () => {
      if (unregisterSameOriginMedia) {
        unregisterSameOriginMedia();
      }
    };
  }, [slot.id, slot.volume, targetSrc]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center group/webpage">
      <iframe
        ref={iframeRef}
        key={`webpage-${slot.id}-${slot.reloadKey}-${slot.sandboxMode || 'no-sandbox'}`}
        src={targetSrc}
        title={slot.title || 'Página Web Externa'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        sandbox={sandboxAttribute}
        className="w-full h-full border-0 pointer-events-auto bg-white/5 block m-0 p-0"
        onLoad={() => {
          onStatusChange?.(
            'external-loaded',
            'unobservable-cross-origin',
            'Página web cargada. Si contiene reproductores anidados, se ejecutan en su contexto original.'
          );

          // Verify if iframe is same-origin
          try {
            const doc = iframeRef.current?.contentDocument;
            if (doc) {
              globalAudioManager.observeContainerMedia(slot.id, doc.body, slot.volume);
              globalAudioManager.setSlotControllability(slot.id, 'controllable');
            } else {
              globalAudioManager.setSlotControllability(slot.id, 'uncontrollable');
            }
          } catch {
            globalAudioManager.setSlotControllability(slot.id, 'uncontrollable');
          }
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
