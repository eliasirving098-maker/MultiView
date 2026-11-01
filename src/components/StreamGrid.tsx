/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Tv, X, ArrowLeft, Maximize2 } from 'lucide-react';
import { StreamSlot } from '../types/stream';
import { StreamPlayer } from './StreamPlayer';
import { StreamControls } from './StreamControls';
import { StreamInput } from './StreamInput';

interface StreamGridProps {
  streamCount: number;
  slots: StreamSlot[];
  maximizedSlotId: string | null;
  activeAudioSlotId: string | null;
  onToggleAudio: (slotId: string) => void;
  onSetMaximizedSlot: (slotId: string | null) => void;
  onAddStream: (index: number, url: string) => void;
  onRemoveStream: (index: number) => void;
  onReloadStream: (index: number) => void;
  onUpdateSlot: (index: number, patch: Partial<StreamSlot>) => void;
}

export const StreamGrid: React.FC<StreamGridProps> = ({
  streamCount,
  slots,
  maximizedSlotId,
  activeAudioSlotId,
  onToggleAudio,
  onSetMaximizedSlot,
  onAddStream,
  onRemoveStream,
  onReloadStream,
  onUpdateSlot,
}) => {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  const activeSlots = slots.slice(0, streamCount);
  const isMaximized = maximizedSlotId !== null;

  // Compute CSS grid configuration based on count
  const getGridClasses = () => {
    switch (streamCount) {
      case 1:
        return 'grid grid-cols-1 grid-rows-1';
      case 2:
        return 'grid grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1';
      case 3:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-rows-3 md:grid-rows-2 lg:grid-rows-1';
      case 4:
        return 'grid grid-cols-1 sm:grid-cols-2 grid-rows-4 sm:grid-rows-2';
      case 5:
        return 'grid grid-cols-1 sm:grid-cols-6 grid-rows-5 sm:grid-rows-2';
      case 6:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-rows-6 sm:grid-rows-3 lg:grid-rows-2';
      default:
        return 'grid grid-cols-2 grid-rows-2';
    }
  };

  // For 5 streams, give slots customized spans to fit symmetrically
  const getSlotSpanClass = (index: number) => {
    if (streamCount === 3) {
      // If 3 streams on md screens (2 cols): 1st two take 1 col each, 3rd spans 2 cols
      if (index === 2) {
        return 'md:col-span-2 lg:col-span-1';
      }
    }
    if (streamCount === 5) {
      // 5 streams in a 6-column grid:
      // Row 1: index 0 (span 2), index 1 (span 2), index 2 (span 2) = total 6
      // Row 2: index 3 (span 3), index 4 (span 3) = total 6 (balanced!)
      if (index < 3) {
        return 'sm:col-span-2 sm:row-span-1';
      } else {
        return 'sm:col-span-3 sm:row-span-1';
      }
    }
    return 'col-span-1 row-span-1';
  };

  return (
    <div className="relative w-full h-full flex flex-col p-1.5 sm:p-2 bg-[#101114] overflow-hidden select-none">
      {/* Maximized Exit Banner */}
      {isMaximized && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-emerald-500/40 shadow-2xl animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">
            Modo Maximizado — {slots.find((s) => s.id === maximizedSlotId)?.title || 'Stream Activo'}
          </span>
          <button
            onClick={() => onSetMaximizedSlot(null)}
            className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver (ESC)</span>
          </button>
        </div>
      )}

      {/* Grid container. In maximized mode, non-maximized slots are hidden via CSS to preserve background playback & buffer */}
      <div
        className={`w-full h-full gap-1.5 sm:gap-2 ${
          isMaximized ? 'flex' : getGridClasses()
        }`}
      >
        {activeSlots.map((slot, index) => {
          const isSlotMaximized = maximizedSlotId === slot.id;
          const isAudioActive = activeAudioSlotId === slot.id;
          const isEditing = editingSlotIndex === index;
          const hasStream = Boolean(slot.url && slot.type !== 'unsupported');

          // If another slot is maximized, hide this slot visually but keep it mounted!
          if (isMaximized && !isSlotMaximized) {
            return (
              <div
                key={slot.id}
                className="hidden"
                aria-hidden="true"
              >
                {/* Kept in DOM so audio & buffering continue seamlessly */}
                <StreamPlayer
                  slot={slot}
                  isUnmuted={isAudioActive}
                  onStatusChange={(status, error) => {
                    onUpdateSlot(index, { status, errorMessage: error });
                  }}
                />
              </div>
            );
          }

          return (
            <div
              key={slot.id}
              className={`relative rounded-xl overflow-hidden bg-[#191b20] border transition-all duration-200 flex flex-col group ${
                isSlotMaximized
                  ? 'w-full h-full border-emerald-500/50 shadow-2xl ring-1 ring-emerald-500/30 z-20'
                  : `${getSlotSpanClass(index)} ${
                      isAudioActive
                        ? 'border-emerald-500/50 shadow-md shadow-emerald-950/20'
                        : 'border-white/10 hover:border-white/20'
                    }`
              }`}
            >
              {/* If slot is empty and not editing */}
              {!hasStream && !isEditing && (
                <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-4 text-center bg-[#15171c]/60 hover:bg-[#191b20] transition group/empty">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover/empty:text-emerald-400 group-hover/empty:border-emerald-500/40 group-hover/empty:bg-emerald-500/10 transition mb-3 shadow-inner">
                    <Tv className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-1">
                    CANAL {index + 1}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4 max-w-[200px]">
                    Espacio disponible para transmisión en vivo o video
                  </p>
                  <button
                    onClick={() => setEditingSlotIndex(index)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-950/40 hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ AGREGAR STREAM</span>
                  </button>
                </div>
              )}

              {/* If slot is editing URL */}
              {isEditing && (
                <div className="w-full h-full flex items-center justify-center p-2 bg-[#121418] overflow-y-auto">
                  <StreamInput
                    channelIndex={index}
                    initialUrl={slot.originalInput || slot.url}
                    onConfirm={(newUrl) => {
                      onAddStream(index, newUrl);
                      setEditingSlotIndex(null);
                    }}
                    onCancel={() => setEditingSlotIndex(null)}
                  />
                </div>
              )}

              {/* If slot has active stream */}
              {hasStream && !isEditing && (
                <>
                  {/* Video Player Engine */}
                  <div className="w-full h-full relative flex-1">
                    <StreamPlayer
                      slot={slot}
                      isUnmuted={isAudioActive}
                      onStatusChange={(status, error) => {
                        onUpdateSlot(index, { status, errorMessage: error });
                      }}
                      onRetry={() => onReloadStream(index)}
                      onReplaceUrl={(newUrl) => onAddStream(index, newUrl)}
                    />
                  </div>

                  {/* Overlaid Controls */}
                  <StreamControls
                    slot={slot}
                    isMaximized={isSlotMaximized}
                    isAudioActive={isAudioActive}
                    onToggleAudio={() => onToggleAudio(slot.id)}
                    onToggleMaximize={() =>
                      onSetMaximizedSlot(isSlotMaximized ? null : slot.id)
                    }
                    onReload={() => onReloadStream(index)}
                    onEdit={() => setEditingSlotIndex(index)}
                    onClose={() => onRemoveStream(index)}
                    onToggleAspectRatio={() => {
                      const next =
                        slot.aspectRatio === 'contain'
                          ? 'cover'
                          : slot.aspectRatio === 'cover'
                          ? '16/9'
                          : 'contain';
                      onUpdateSlot(index, { aspectRatio: next });
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
