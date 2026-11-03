/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StreamType } from '../types/stream';
import { Radio, AlertCircle, Loader2 } from 'lucide-react';

interface StreamStatusProps {
  type: StreamType;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'external-loaded' | 'error';
  isAudioActive: boolean;
  channelIndex: number;
}

export const StreamStatus: React.FC<StreamStatusProps> = ({
  type,
  status,
  isAudioActive,
  channelIndex,
}) => {
  const getSourceBadge = () => {
    switch (type) {
      case 'youtube':
        return { label: 'YouTube', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'twitch':
        return { label: 'Twitch', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'vimeo':
        return { label: 'Vimeo', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'dailymotion':
        return { label: 'Dailymotion', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'hls':
        return { label: 'HLS Live', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'dash':
        return { label: 'MPEG-DASH', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'html5':
        return { label: 'HTML5 Media', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'iframe-embed':
        return { label: 'Embed Doc', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'web-page':
        return { label: 'Página Web', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'blob-resource':
        return { label: 'Blob Local', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      default:
        return { label: 'Desconocido', color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const badge = getSourceBadge();

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Channel ID */}
      <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono tracking-wider font-semibold text-slate-300 border border-white/10 uppercase">
        CH {channelIndex + 1}
      </span>

      {/* Source platform */}
      {type !== 'unsupported' && (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border backdrop-blur-md ${badge.color}`}
        >
          {badge.label}
        </span>
      )}

      {/* Audio badge */}
      {isAudioActive ? (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-semibold text-emerald-400 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          AUDIO ON
        </span>
      ) : null}

      {/* Loading indicator */}
      {status === 'loading' && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-[10px] font-mono text-sky-300">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          CARGANDO
        </span>
      )}

      {/* External Loaded indicator (unobservable cross-origin frame) */}
      {status === 'external-loaded' && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-[10px] font-mono text-blue-300">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          EXTERNO ACTIVO
        </span>
      )}

      {/* Playing indicator */}
      {status === 'playing' && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          EN VIVO
        </span>
      )}

      {/* Error indicator */}
      {status === 'error' && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[10px] font-mono text-red-400">
          <AlertCircle className="w-2.5 h-2.5" />
          ERROR
        </span>
      )}
    </div>
  );
};
