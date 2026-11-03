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
      {/* Top Bar Overlay */}
      <div
        onMouseMove={onUserInteraction}
        onTouchStart={onUserInteraction}
        className={`absolute top-0 inset-x-0 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent transition-all duration-300 ease-in-out z-20 ${
          isVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
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
          {/* External Player Compatibility / Sandbox Mode Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserInteraction?.();
              setIsSandboxModalOpen(true);
            }}
            title={`Compatibilidad del reproductor: ${
              slot.sandboxMode === 'standard'
                ? 'Protección estándar (Con sandbox restrictivo)'
                : 'Compatibilidad sin sandbox (Activo)'
            }`}
            className={`p-1.5 rounded-lg transition ${
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

          {/* Popout / Floating window */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserInteraction?.();
              handleOpenPopup();
            }}
            title="Abrir en ventana flotante independiente (sin restricciones de marco)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-white/10 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Edit / Change URL */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserInteraction?.();
              onEdit();
            }}
            title="Cambiar enlace de la transmisión"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Reload Stream */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserInteraction?.();
              onReload();
            }}
            title="Recargar transmisión (Atajo: R)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Focus / Hero Stage Toggle */}
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
            className={`p-1.5 rounded-lg transition ${
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

          {/* Close Stream */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserInteraction?.();
              onClose();
            }}
            title="Cerrar y vaciar este recuadro"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Bar Overlay with Audio Priority in Lower Right */}
      <div
        onMouseMove={onUserInteraction}
        onTouchStart={onUserInteraction}
        className={`absolute bottom-0 inset-x-0 p-2.5 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-all duration-300 ease-in-out z-20 ${
          isVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Aspect ratio toggle (contain / cover) */}
          {onToggleAspectRatio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.();
                onToggleAspectRatio();
              }}
              title={`Ajuste de pantalla actual: ${slot.aspectRatio}`}
              className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-300 hover:text-white border border-white/10 hover:bg-white/10 transition flex items-center gap-1 cursor-pointer"
            >
              <Scaling className="w-3 h-3" />
              <span className="uppercase">{slot.aspectRatio}</span>
            </button>
          )}
        </div>

        {/* Global Priority Audio Button (Corner Lower-Right) */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUserInteraction?.();
              onToggleAudio();
            }}
            title={
              isAudioActive
                ? 'Sonido activo en esta transmisión. Haz clic para silenciar.'
                : 'Activar sonido (silenciará automáticamente las demás transmisiones)'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs shadow-lg transition-all border cursor-pointer select-none active:scale-95 ${
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
