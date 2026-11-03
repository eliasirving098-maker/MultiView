/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Layers,
  Sparkles,
  Shield,
  Volume2,
  Tv,
  ArrowRight,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import { LayoutSelectorCards } from '../components/LayoutSelector';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { storageService } from '../services/storageService';
import { SavedPreset } from '../types/stream';

interface HomeProps {
  initialCount: number;
  onStartMultiview: (count: number) => void;
  onStartWithPreset: (preset: SavedPreset) => void;
}

export const Home: React.FC<HomeProps> = ({
  initialCount,
  onStartMultiview,
  onStartWithPreset,
}) => {
  const [selectedCount, setSelectedCount] = useState<number>(initialCount);
  const [presets, setPresets] = useState<SavedPreset[]>(() => storageService.getPresets());

  const handleStart = () => {
    storageService.saveStreamCount(selectedCount);
    onStartMultiview(selectedCount);
  };

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Banner / Navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#14151a]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-950/50">
            <div className="w-full h-full bg-[#101114] rounded-[10px] flex items-center justify-center font-mono font-black text-sm text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-400">
              MV
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider text-white font-mono flex items-center gap-2">
              MULTIVIEW
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <span className="text-[10px] text-slate-400 tracking-widest font-mono uppercase">
              PLATAFORMA MULTISTREAM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-5xl mx-auto w-full text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>REPRODUCCIÓN SIMULTÁNEA DE 1 A 6 TRANSMISIONES</span>
        </div>

        {/* Hero Title & Subtitle per prompt specification */}
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Todo lo que quieres ver, en una sola pantalla.
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal">
          Visualiza simultáneamente múltiples streams de YouTube, Twitch, Vimeo, HLS (.m3u8), MPEG-DASH y videos directos con control de audio prioritario centralizado.
        </p>

        {/* Question card per prompt */}
        <div className="w-full bg-[#15171d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
              ¿Cuántas transmisiones deseas visualizar simultáneamente?
            </h3>
            <p className="text-xs text-slate-400">
              Selecciona una distribución optimizada. Podrás cambiarla o ajustarla en cualquier momento.
            </p>
          </div>

          {/* 6 Selectable Options with Visual Representations */}
          <LayoutSelectorCards
            selectedCount={selectedCount}
            onSelect={(count) => setSelectedCount(count)}
          />

          {/* Start Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm sm:text-base tracking-wide transition-all shadow-xl shadow-emerald-950/50 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>Iniciar MULTIVIEW ({selectedCount} STREAMS)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Presets Section */}
        {presets.length > 0 && (
          <div className="w-full max-w-3xl text-left bg-[#15171d]/60 border border-white/5 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                O inicia directamente con una configuración predefinida:
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {presets.slice(0, 3).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onStartWithPreset(preset)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#191b20] hover:bg-[#20232a] border border-white/5 hover:border-emerald-500/30 text-left transition group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition truncate">
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {preset.streamCount} streams • {preset.category}
                    </p>
                  </div>
                  <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 fill-current shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
          <div className="p-4 rounded-2xl bg-[#15171d]/40 border border-white/5">
            <div className="flex items-center gap-2 text-emerald-400 mb-1.5 font-mono text-xs font-semibold">
              <Volume2 className="w-4 h-4" />
              <span>GESTOR DE AUDIO ÚNICO</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solo un stream tiene sonido activo a la vez para evitar cacofonía. Al activar uno, los demás se silencian al instante.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#15171d]/40 border border-white/5">
            <div className="flex items-center gap-2 text-cyan-400 mb-1.5 font-mono text-xs font-semibold">
              <Layers className="w-4 h-4" />
              <span>DISTRIBUCIÓN ADAPTABLE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enfoque tipo Meet/Zoom: convierte cualquier transmisión en principal mientras las demás continúan reproduciéndose en vivo.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#15171d]/40 border border-white/5">
            <div className="flex items-center gap-2 text-indigo-400 mb-1.5 font-mono text-xs font-semibold">
              <Shield className="w-4 h-4" />
              <span>COMPATIBILIDAD TOTAL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detección automática de fuentes: HLS (.m3u8), MPEG-DASH (.mpd), YouTube, Twitch, Vimeo, Dailymotion y archivos directos MP4.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
        MULTIVIEW PWA • Todo lo que quieres ver, en una sola pantalla.
      </footer>
    </div>
  );
};
