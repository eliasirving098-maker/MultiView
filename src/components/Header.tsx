/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutGrid,
  Maximize,
  Minimize,
  Bookmark,
  Volume2,
  VolumeX,
  HelpCircle,
  Home,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { MiniLayoutDiagram } from './LayoutSelector';

interface HeaderProps {
  streamCount: number;
  activeSlotsCount: number;
  activeAudioSlotId: string | null;
  onSelectStreamCount: (count: number) => void;
  onMuteAllAudio: () => void;
  onOpenPresets: () => void;
  onOpenShortcuts: () => void;
  onNavigateHome: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streamCount,
  activeSlotsCount,
  activeAudioSlotId,
  onSelectStreamCount,
  onMuteAllAudio,
  onOpenPresets,
  onOpenShortcuts,
  onNavigateHome,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [pendingReduceCount, setPendingReduceCount] = useState<number | null>(null);

  const handleCountClick = (count: number) => {
    if (count === streamCount) return;

    // Check if reducing and if any discarded slots have active streams
    if (count < streamCount) {
      if (activeSlotsCount > count) {
        setPendingReduceCount(count);
        return;
      }
    }
    onSelectStreamCount(count);
  };

  const confirmReduce = () => {
    if (pendingReduceCount !== null) {
      onSelectStreamCount(pendingReduceCount);
      setPendingReduceCount(null);
    }
  };

  return (
    <>
      <header className="h-14 bg-[#14151a] border-b border-white/10 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-30">
        {/* Left: Brand and Home */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            title="Volver a la pantalla de bienvenida"
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-0.5 shadow-md shadow-emerald-950/40">
              <div className="w-full h-full bg-[#101114] rounded-[10px] flex items-center justify-center">
                <span className="font-mono font-black text-xs text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-400">
                  MV
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wider text-white group-hover:text-emerald-400 transition font-mono">
                  MULTIVIEW
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden md:block">
                CENTRO MULTIMEDIA
              </p>
            </div>
          </button>
        </div>

        {/* Center: Stream Count Switcher (1 to 6) */}
        <div className="hidden sm:flex items-center gap-1 bg-[#101114] p-1 rounded-xl border border-white/5">
          <span className="text-[10px] font-mono font-medium text-slate-400 px-2 uppercase">
            STREAMS:
          </span>
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const isCurrent = streamCount === num;
            return (
              <button
                key={num}
                onClick={() => handleCountClick(num)}
                title={`Cambiar a ${num} transmisiones simultáneas`}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{num}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile stream count dropdown */}
          <div className="sm:hidden">
            <select
              value={streamCount}
              onChange={(e) => handleCountClick(parseInt(e.target.value, 10))}
              className="bg-[#101114] text-xs text-white border border-white/10 rounded-lg px-2 py-1 font-mono focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} STREAMS
                </option>
              ))}
            </select>
          </div>

          {/* Master Audio Indicator */}
          <button
            onClick={onMuteAllAudio}
            title={
              activeAudioSlotId
                ? `Sonido activo en ${activeAudioSlotId.toUpperCase()}. Clic para silenciar todo.`
                : 'Todos los streams están silenciados.'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border transition ${
              activeAudioSlotId
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            {activeAudioSlotId ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-semibold text-[11px] hidden md:inline">
                  {activeAudioSlotId.replace('slot-', 'CANAL ')}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] hidden md:inline">TODO MUTE</span>
              </>
            )}
          </button>

          {/* Presets Modal Button */}
          <button
            onClick={onOpenPresets}
            title="Guardar o cargar configuraciones"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs transition"
          >
            <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline text-xs">Guardados</span>
          </button>

          {/* Fullscreen API Toggle */}
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition"
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Maximize className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={onOpenShortcuts}
            title="Atajos de teclado"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton compact />
        </div>
      </header>

      {/* Confirmation Modal when reducing stream count with active streams */}
      {pendingReduceCount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#191b20] border border-amber-500/30 p-5 shadow-2xl text-left">
            <div className="flex items-center gap-2.5 text-amber-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-semibold text-white text-sm">¿Reducir a {pendingReduceCount} streams?</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Actualmente hay transmisiones activas en los canales que quedarán fuera de la vista. Se detendrán y se ocultarán los recuadros sobrantes.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingReduceCount(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReduce}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
