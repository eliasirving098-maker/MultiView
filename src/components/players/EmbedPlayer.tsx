/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { DEFAULT_EMBED_ALLOW } from '../../services/iframeParser';
import { globalAudioManager, sendIframeAudioCommands } from '../../services/audioManager';

interface EmbedPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
}

export const EmbedPlayer: React.FC<EmbedPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const customAttrs = slot.customIframeAttributes || {};
  const targetSrc = slot.embedUrl || slot.url;
  const allowPermissions = customAttrs.allow || DEFAULT_EMBED_ALLOW;
  const referrerPolicy: ReferrerPolicy = customAttrs.referrerPolicy || 'no-referrer-when-downgrade';
  const allowFullScreen = customAttrs.allowFullScreen !== false;

  // External player compatibility mode:
  // - 'standard': Enforces controlled sandbox
  // - 'no-sandbox' (default): Absolutely NO sandbox attribute is added to the iframe tag, allowing
  //   external players (AuraSports, Streamec, Clappr, JWPlayer) to load their subframes, workers, and decoders.
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
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center group/embed">
      <iframe
        ref={iframeRef}
        key={`embed-${slot.id}-${slot.reloadKey}-${slot.sandboxMode || 'no-sandbox'}`}
        src={targetSrc}
        title={customAttrs.title || slot.title || 'Reproductor Embed'}
        allow={allowPermissions}
        allowFullScreen={allowFullScreen}
        referrerPolicy={referrerPolicy}
        sandbox={sandboxAttribute}
        className="w-full h-full border-0 pointer-events-auto bg-black m-0 p-0 block"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflow: 'hidden',
        }}
        onLoad={() => {
          // Cross-origin iframes cannot be introspected due to browser Same-Origin Policy.
          // Explicitly register external-loaded status with unobservable-cross-origin.
          onStatusChange?.(
            'external-loaded',
            'unobservable-cross-origin',
            'Reproductor embed cargado correctamente en su marco.'
          );
          // Send initial audio state to player
          sendIframeAudioCommands(iframeRef.current, !isUnmuted);
        }}
        onError={() => {
          onStatusChange?.(
            'error',
            'iframe-error',
            'Error al cargar el documento del reproductor embed.'
          );
        }}
      />
    </div>
  );
};
