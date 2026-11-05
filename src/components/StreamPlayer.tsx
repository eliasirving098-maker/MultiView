/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { DiagnosticCode, StreamSlot, StreamType } from '../types/stream';
import { DiagnosticBanner } from './DiagnosticBanner';
import { EmbedPlayer } from './players/EmbedPlayer';
import { Html5Player } from './players/Html5Player';
import { HlsPlayer } from './players/HlsPlayer';
import { DashPlayer } from './players/DashPlayer';
import { YouTubePlayer } from './players/YouTubePlayer';
import { TwitchPlayer } from './players/TwitchPlayer';
import { VimeoPlayer } from './players/VimeoPlayer';
import { WebPagePlayer } from './players/WebPagePlayer';

interface StreamPlayerProps {
  slot: StreamSlot;
  isUnmuted: boolean;
  onStatusChange?: (
    status: StreamSlot['status'],
    diagnosticCode?: DiagnosticCode,
    errorMessage?: string
  ) => void;
  onRetry?: () => void;
  onEditUrl?: () => void;
  onReplaceUrl?: (newUrl: string) => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  slot,
  isUnmuted,
  onStatusChange,
  onRetry,
  onEditUrl,
  onReplaceUrl,
}) => {
  // Determine effective player type, prioritizing iframe-embed if slot.embedUrl is present
  const effectiveType: StreamType =
    slot.manualOverrideType ||
    (slot.embedUrl ? 'iframe-embed' : slot.type);

  // Watchdog Timer (8 seconds): strictly avoid infinite loading
  useEffect(() => {
    if (slot.status !== 'loading' || slot.type === 'blob-resource') return;

    const timer = setTimeout(() => {
      if (slot.status === 'loading') {
        if (effectiveType === 'web-page') {
          onStatusChange?.(
            'error',
            'embedding-forbidden',
            'El sitio web no respondió a la inserción en marco (posible bloqueo por X-Frame-Options o CSP).'
          );
        } else {
          onStatusChange?.(
            'error',
            'timeout',
            'Tiempo de espera agotado (8 segundos). El servidor tardó en responder.'
          );
        }
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [slot.status, slot.reloadKey, effectiveType, onStatusChange]);

  // Blob resources are ephemeral memory objects bound to their creator tab
  if (slot.type === 'blob-resource') {
    return (
      <DiagnosticBanner
        slot={slot}
        onRetry={() => onRetry?.()}
        onEditUrl={() => onEditUrl?.()}
      />
    );
  }

  // Display DiagnosticBanner on explicit error status
  if (slot.status === 'error') {
    return (
      <DiagnosticBanner
        slot={slot}
        onRetry={() => onRetry?.()}
        onEditUrl={() => onEditUrl?.()}
      />
    );
  }

  // Render modular adapter based on effective source type
  switch (effectiveType) {
    case 'iframe-embed':
      return (
        <EmbedPlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'html5':
      return (
        <Html5Player
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'hls':
      return (
        <HlsPlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'dash':
      return (
        <DashPlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'youtube':
      return (
        <YouTubePlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'twitch':
      return (
        <TwitchPlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'vimeo':
      return (
        <VimeoPlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    case 'web-page':
      return (
        <WebPagePlayer
          slot={slot}
          isUnmuted={isUnmuted}
          onStatusChange={onStatusChange}
        />
      );

    default:
      // If embed URL exists, default to EmbedPlayer (Embed Priority!)
      if (slot.embedUrl || slot.url) {
        return (
          <EmbedPlayer
            slot={slot}
            isUnmuted={isUnmuted}
            onStatusChange={onStatusChange}
          />
        );
      }
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#101114] text-slate-500 text-xs">
          Sin contenido reproducible
        </div>
      );
  }
};
