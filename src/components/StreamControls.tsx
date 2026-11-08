/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  Edit2,
  Scaling,
  ExternalLink,
  Shield,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { SandboxMode, StreamSlot } from '../types/stream';
import { StreamStatus } from './StreamStatus';

interface StreamControlsProps {
  slot: StreamSlot;
  isMaximized: boolean;
  isAudioActive: boolean;
  isAudioControllable?: boolean;
  isVisible?: boolean;
  onUserInteraction?: () => void;
  onToggleAudio: () => void;
  onToggleMaximize: () => void;
  onReload: () => void;
  onEdit: () => void;
  onClose: () => void;
  onTogglePlayPause?: () => void;
  onToggleAspectRatio?: () => void;
  onUpdateSlot?: (patch: Partial<StreamSlot>) => void;
}

export const StreamControls: React.FC<StreamControlsProps> = ({
  slot,
  isMaximized,
  isAudioActive,
  isAudioControllable = true,
  isVisible = true,
  onUserInteraction,
  onToggleAudio,
  onToggleMaximize,
  onReload,
  onEdit,
  onClose,
  onToggleAspectRatio,
  onUpdateSlot,
}) => {
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [selectedSandboxMode, setSelectedSandboxMode] = useState<SandboxMode>(
    slot.sandboxMode || 'no-sandbox'
  );

  useEffect(() => {
    setSelectedSandboxMode(slot.sandboxMode || 'no-sandbox');
  }, [slot.sandboxMode]);

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

  const handleSaveSandboxMode = () => {
    onUpdateSlot?.({
      sandboxMode: selectedSandboxMode,
      reloadKey: slot.reloadKey + 1,
      status: 'loading',
    });
    setIsSandboxModalOpen(false);
  };

  return (
    <>
      {/* Lateral Controls Sidebar (Barra lateral en el margen derecho del recuadro) */}
      <div
        onMouseMove={onUserInteraction}
        onTouchStart={onUserInteraction}
        className={`absolute top-2 right-2 bottom-2 z-20 flex flex-col justify-between items-end pointer-events-none transition-all duration-300 ease-in-out ${
          isVisible
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-3'
        }`}
      >
        {/* Top Lateral: Estado del canal y título compacto */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 shadow-xl max-w-[200px] sm:max-w-[280px]">
          <StreamStatus
            type={slot.type}
            status={slot.status}
            isAudioActive={isAudioActive}
            channelIndex={slot.index}
          />
          <span
            className="text-[11px] font-medium text-slate-200 truncate drop-shadow-md hidden sm:inline"
            title={slot.title || slot.url}
          >
            {slot.title || slot.url}
          </span>
        </div>

        {/* Center Lateral: Barra lateral vertical de herramientas y controles */}
        <div className="pointer-events-auto my-auto flex flex-col items-center gap-1 bg-black/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl">
          {/* 1. Botón Prioritario de Sonido (Mute / Unmute con estados de control real) */}
          <div className="relative group/tool">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                onToggleAudio();
              }}
              title={
                isAudioActive
                  ? 'Sonido activo en esta transmisión. Clic para silenciar.'
                  : isAudioControllable === false
                  ? 'Silencio no garantizado: Este reproductor externo (cross-origin) no admite control remoto de audio. Siléncielo en los controles internos del reproductor.'
                  : 'Activar sonido (silenciará automáticamente las demás transmisiones)'
              }
              className={`p-2 rounded-xl transition-all border cursor-pointer select-none active:scale-95 flex items-center justify-center relative ${
                isAudioActive
                  ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/50 scale-105'
                  : isAudioControllable === false
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              {isAudioActive ? (
                <Volume2 className="w-4 h-4 animate-bounce" />
              ) : isAudioControllable === false ? (
                <div className="relative flex items-center justify-center">
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              {isAudioActive
                ? 'Sonido: ON (Clic para silenciar)'
                : isAudioControllable === false
                ? 'Silencio no garantizado (Reproductor cross-origin)'
                : 'Silenciado confirmado (Clic para activar)'}
            </span>
          </div>

          <div className="w-4 h-[1px] bg-white/10 my-0.5" />

          {/* 2. Enfoque / Transmisión Principal (Meet / Zoom stage) */}
          <div className="relative group/tool">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                onToggleMaximize();
              }}
              title={
                isMaximized
                  ? 'Restaurar cuadrícula equilibrada (ESC)'
                  : 'Convertir en transmisión principal (Enfoque tipo Meet / Zoom)'
              }
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isMaximized
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              {isMaximized ? 'Restaurar cuadrícula' : 'Transmisión principal'}
            </span>
          </div>

          {/* 3. Recargar Transmisión */}
          <div className="relative group/tool">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                onReload();
              }}
              title="Recargar transmisión (Atajo: R)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              Recargar transmisión
            </span>
          </div>

          {/* 4. Ajuste de Pantalla (contain / cover) */}
          {onToggleAspectRatio && (
            <div className="relative group/tool">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUserInteraction?.();
                  onToggleAspectRatio();
                }}
                title={`Ajuste de pantalla actual: ${slot.aspectRatio.toUpperCase()}`}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center justify-center"
              >
                <Scaling className="w-3.5 h-3.5" />
              </button>
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
                Ajuste: {slot.aspectRatio.toUpperCase()}
              </span>
            </div>
          )}

          {/* 5. Editar / Cambiar URL */}
          <div className="relative group/tool">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                onEdit();
              }}
              title="Cambiar enlace de la transmisión"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              Cambiar enlace
            </span>
          </div>

          {/* 6. Compatibilidad Sandbox del Reproductor */}
          <div className="relative group/tool">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                setIsSandboxModalOpen(true);
              }}
              title={`Compatibilidad del reproductor: ${
                slot.sandboxMode === 'standard'
                  ? 'Protección estándar (Con sandbox)'
                  : 'Compatibilidad sin sandbox (Activo)'
              }`}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                slot.sandboxMode === 'standard'
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {slot.sandboxMode === 'standard' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              {slot.sandboxMode === 'standard' ? 'Sandbox: Estándar' : 'Sandbox: Desactivado'}
            </span>
          </div>

          {/* 7. Ventana Flotante / Popout */}
          <div className="relative group/tool">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                handleOpenPopup();
              }}
              title="Abrir en ventana flotante independiente"
              className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-white/10 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              Ventana flotante
            </span>
          </div>

          <div className="w-4 h-[1px] bg-white/10 my-0.5" />

          {/* 8. Cerrar Transmisión */}
          <div className="relative group/tool">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                onClose();
              }}
              title="Cerrar y vaciar este recuadro"
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-medium font-mono rounded-md whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity shadow-lg border border-white/10 z-30">
              Cerrar stream
            </span>
          </div>
        </div>

        {/* Bottom Lateral: Espaciador inferior para centrado óptico */}
        <div className="h-1 pointer-events-none" />
      </div>

      {/* External Player Compatibility / Sandbox Mode Modal */}
      {isSandboxModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsSandboxModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#191b20] border border-white/10 p-5 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Compatibilidad del reproductor externo
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Canal {slot.index + 1} &bull; {slot.title || slot.url}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSandboxModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {/* Option 1: Compatibilidad sin sandbox */}
              <div
                onClick={() => setSelectedSandboxMode('no-sandbox')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedSandboxMode === 'no-sandbox'
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                    : 'bg-[#101114] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-semibold text-xs text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Compatibilidad sin sandbox (Recomendado)</span>
                  </div>
                  <input
                    type="radio"
                    name={`sandbox-mode-${slot.id}`}
                    checked={selectedSandboxMode === 'no-sandbox'}
                    onChange={() => setSelectedSandboxMode('no-sandbox')}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                  El iframe se renderiza <strong>sin el atributo sandbox</strong>. Permite que reproductores externos complejos (como AuraSports, Streamec, Clappr, JWPlayer) carguen decodificadores de video, web workers y submarcos sin bloqueos.
                </p>
                {selectedSandboxMode === 'no-sandbox' && (
                  <div className="mt-2.5 ml-6 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[10px] text-amber-300 leading-normal">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Advertencia de seguridad:</strong> El reproductor externo tendrá menos restricciones en su marco. Utiliza esta opción para fuentes externas de confianza.
                    </span>
                  </div>
                )}
              </div>

              {/* Option 2: Protección estándar */}
              <div
                onClick={() => setSelectedSandboxMode('standard')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedSandboxMode === 'standard'
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-950/30'
                    : 'bg-[#101114] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-semibold text-xs text-white">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Protección estándar</span>
                  </div>
                  <input
                    type="radio"
                    name={`sandbox-mode-${slot.id}`}
                    checked={selectedSandboxMode === 'standard'}
                    onChange={() => setSelectedSandboxMode('standard')}
                    className="accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                  Aplica un sandbox restrictivo (<code className="text-[10px] text-amber-300 font-mono">allow-scripts allow-same-origin allow-forms allow-presentation</code>). Algunos reproductores externos no admiten sandbox y mostrarán advertencia de bloqueo.
                </p>
              </div>
            </div>

            {/* Controlled Reload Notice */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 leading-relaxed font-mono">
              &bull; Al confirmar, se solicitará una recarga controlada de este reproductor (Canal {slot.index + 1}). Los demás streams continuarán reproduciéndose sin interrupción.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSandboxModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSandboxMode}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-lg shadow-emerald-950/40"
              >
                Guardar y Recargar Canal {slot.index + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
