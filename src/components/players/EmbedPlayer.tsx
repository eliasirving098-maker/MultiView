/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DiagnosticCode, StreamSlot } from '../../types/stream';
import { DEFAULT_EMBED_ALLOW } from '../../services/iframeParser';
import {
  globalAudioManager,
  sendDailymotionAudioCommand,
} from '../../services/audioManager';

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
  // - 'no-sandbox' (default): Absolutely NO sandbox attribute is added to the iframe tag
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

  // Determine if this is a known player with a documented control API
  const isDailymotion =
    slot.type === 'dailymotion' ||
    /dailymotion\.com|dai\.ly/i.test(targetSrc);

  // Audio coordination registration
  useEffect(() => {
    const iframe = iframeRef.current;
    let unregisterSameOriginMedia: (() => void) | null = null;

    if (isDailymotion) {
      // Documented API: Dailymotion postMessage
      const unregister = globalAudioManager.registerIframeController(
        slot.id,
        (shouldBeMuted) => {
          sendDailymotionAudioCommand(iframeRef.current, shouldBeMuted);
        },
        true // controllable
      );
      return unregister;
    }

    // For generic iframes, check same-origin accessibility on mount/load
    const checkSameOrigin = () => {
      try {
        const doc = iframe?.contentDocument;
        if (doc) {
          // Same-origin accessible: we can control all media elements directly
          unregisterSameOriginMedia = globalAudioManager.observeContainerMedia(
            slot.id,
            doc.body,
            slot.volume
          );
          globalAudioManager.setSlotControllability(slot.id, 'controllable');
          return true;
        }
      } catch {
        // Cross-origin security boundary reached
      }
      return false;
    };

    const isSameOriginAccessible = checkSameOrigin();

    if (!isSameOriginAccessible) {
      // Cross-origin with NO documented control API:
      // Acknowledge technical impossibility of remote muting due to browser SOP.
      // Mark accurately as uncontrollable so UI informs user honestly.
      globalAudioManager.setSlotControllability(slot.id, 'uncontrollable');
    }

    return () => {
      if (unregisterSameOriginMedia) {
        unregisterSameOriginMedia();
      }
    };
  }, [slot.id, slot.volume, isDailymotion, targetSrc]);

  // Synchronize on isUnmuted prop changes for documented API players
  useEffect(() => {
    if (isDailymotion) {
      sendDailymotionAudioCommand(iframeRef.current, !isUnmuted);
    }
  }, [isUnmuted, isDailymotion]);

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
          onStatusChange?.(
            'external-loaded',
            'unobservable-cross-origin',
            'Reproductor embed cargado correctamente en su marco.'
          );

          // Verify if iframe is same-origin or Dailymotion
          if (isDailymotion) {
            sendDailymotionAudioCommand(iframeRef.current, !isUnmuted);
          } else {
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
          }
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
