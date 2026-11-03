/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  Edit2,
  Scaling,
  Play,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { StreamSlot } from '../types/stream';
import { StreamStatus } from './StreamStatus';

interface StreamControlsProps {
  slot: StreamSlot;
  isMaximized: boolean;
  isAudioActive: boolean;
  onToggleAudio: () => void;
  onToggleMaximize: () => void;
  onReload: () => void;
  onEdit: () => void;
  onClose: () => void;
  onTogglePlayPause?: () => void;
  onToggleAspectRatio?: () => void;
}

export const StreamControls: React.FC<StreamControlsProps> = ({
  slot,
  isMaximized,
  isAudioActive,
  onToggleAudio,
  onToggleMaximize,
  onReload,
  onEdit,
  onClose,
  onTogglePlayPause,
  onToggleAspectRatio,
}) => {
  const handleOpenPopup = () => {
    const targetUrl = slot.originalInput || slot.url;
    if (!targetUrl) return;
    const width = 1000;
    const height = 650;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    window.open(
      targetUrl,
      `mv_player_${slot.id}`,
      `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes`
    );
  };

  return (
    <>
      {/* Top Bar Overlay */}
      <div className="absolute top-0 inset-x-0 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity z-20">
        <div className="pointer-events-auto flex items-center gap-2 min-w-0 pr-2">
          <StreamStatus
            type={slot.type}
            status={slot.status}
            isAudioActive={isAudioActive}
            channelIndex={slot.index}
          />
          <span
            className="text-[11px] font-medium text-slate-200 truncate max-w-[140px] sm:max-w-[220px] drop-shadow-md hidden sm:inline"
            title={slot.title || slot.url}
          >
            {slot.title || slot.url}
          </span>
        </div>

        {/* Action icons */}
        <div className="pointer-events-auto flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
          {/* Popout / Floating window */}
          <button
            onClick={handleOpenPopup}
            title="Abrir en ventana flotante independiente (sin restricciones de marco)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-white/10 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Edit / Change URL */}
          <button
            onClick={onEdit}
            title="Cambiar enlace de la transmisión"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Reload Stream */}
          <button
            onClick={onReload}
            title="Recargar transmisión (Atajo: R)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restaurar cuadrícula (ESC)' : 'Maximizar stream'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Stream */}
          <button
            onClick={onClose}
            title="Cerrar y vaciar este recuadro"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Bar Overlay with Audio Priority in Lower Right */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity z-20">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Aspect ratio toggle (contain / cover) */}
          {onToggleAspectRatio && (
            <button
              onClick={onToggleAspectRatio}
              title={`Ajuste de pantalla actual: ${slot.aspectRatio}`}
              className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-300 hover:text-white border border-white/10 hover:bg-white/10 transition flex items-center gap-1"
            >
              <Scaling className="w-3 h-3" />
              <span className="uppercase">{slot.aspectRatio}</span>
            </button>
          )}
        </div>

        {/* Global Priority Audio Button (Corner Lower-Right) */}
        <div className="pointer-events-auto">
          <button
            onClick={onToggleAudio}
            title={
              isAudioActive
                ? 'Sonido activo (Click para silenciar)'
                : 'Activar sonido de este stream (silenciará automáticamente todos los demás)'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs shadow-lg transition-all border ${
              isAudioActive
                ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-emerald-950/60 ring-2 ring-emerald-400/50 scale-105'
                : 'bg-black/70 hover:bg-black/90 text-slate-300 hover:text-white border-white/15'
            }`}
          >
            {isAudioActive ? (
              <>
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span>SONIDO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] text-slate-300">SILENCIADO</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
