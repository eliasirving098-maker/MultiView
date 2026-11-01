/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Check,
  X,
  Play,
  Layers,
  FolderCheck,
} from 'lucide-react';
import { SavedPreset, StreamSlot } from '../types/stream';
import { storageService } from '../services/storageService';

interface SavedPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlots: StreamSlot[];
  currentStreamCount: number;
  onLoadPreset: (preset: SavedPreset) => void;
}

export const SavedPresetsModal: React.FC<SavedPresetsModalProps> = ({
  isOpen,
  onClose,
  currentSlots,
  currentStreamCount,
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<SavedPreset['category']>('Personalizado');

  useEffect(() => {
    if (isOpen) {
      setPresets(storageService.getPresets());
      setIsCreating(false);
      setNewPresetName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const streams = currentSlots
      .slice(0, currentStreamCount)
      .filter((s) => s.url)
      .map((s) => ({
        index: s.index,
        url: s.originalInput || s.url,
        title: s.title || `Canal ${s.index + 1}`,
        type: s.type,
      }));

    const saved = storageService.savePreset({
      name: newPresetName.trim(),
      category: newPresetCategory,
      streamCount: currentStreamCount,
      streams,
    });

    setPresets([saved, ...presets]);
    setIsCreating(false);
    setNewPresetName('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storageService.deletePreset(id);
    setPresets(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#191b20] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#15171c]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Configuraciones Guardadas</h3>
              <p className="text-[11px] text-slate-400">
                Guarda tus combinaciones de transmisiones para cargarlas con un solo clic.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar: Create new */}
        <div className="p-3 border-b border-white/5 bg-[#121418] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {presets.length} plantilla{presets.length === 1 ? '' : 's'} disponible{presets.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Guardar Configuración Actual</span>
          </button>
        </div>

        {/* Create drawer */}
        {isCreating && (
          <form onSubmit={handleSaveCurrent} className="p-4 bg-[#14161a] border-b border-white/10 space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">Nombre de la configuración:</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Ej. Domingo de Fútbol, Noticias Globales, Cámaras..."
                className="w-full px-3 py-2 rounded-xl bg-[#101114] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Categoría:</span>
              {(['Fútbol', 'Noticias', 'Monitoreo', 'Entretenimiento', 'Personalizado'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewPresetCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                      newPresetCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Se guardarán los {currentStreamCount} recuadros actuales (
              {currentSlots.slice(0, currentStreamCount).filter((s) => s.url).length} streams activos).
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newPresetName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        {/* Preset list */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onLoadPreset(preset);
                onClose();
              }}
              className="group p-3.5 rounded-xl bg-[#121418] hover:bg-[#1f2229] border border-white/5 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center transition shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition truncate">
                      {preset.name}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/5">
                      {preset.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {preset.streamCount} streams configurados • {preset.streams.length} con enlace
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Eliminar preset"
                  onClick={(e) => handleDelete(preset.id, e)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 group-hover:bg-emerald-500 text-slate-300 group-hover:text-black text-xs font-semibold transition">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Cargar</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
