/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'M', action: 'Silenciar / Activar sonido del stream seleccionado (respetando gestor único de audio)' },
    { key: 'ESC', action: 'Salir de modo maximizado individual o cerrar ventanas modales' },
    { key: 'F', action: 'Activar / Desactivar pantalla completa de la aplicación (Fullscreen API)' },
    { key: 'R', action: 'Recargar el stream activo o seleccionado' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#191b20] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#15171c]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Atajos de Teclado</h3>
              <p className="text-[11px] text-slate-400">Control rápido para centro de monitoreo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#101114] border border-white/5"
            >
              <kbd className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-mono font-bold text-emerald-400 shadow-sm shrink-0">
                {sc.key}
              </kbd>
              <p className="text-xs text-slate-300 leading-relaxed text-right">{sc.action}</p>
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#121418] border-t border-white/5 text-center">
          <p className="text-[11px] text-slate-500">
            * Los atajos se pausan automáticamente al escribir dentro de un campo de texto.
          </p>
        </div>
      </div>
    </div>
  );
};
