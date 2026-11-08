/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Tv, ArrowLeft, Pin } from 'lucide-react';
import { SandboxMode, StreamSlot, StreamType } from '../types/stream';
import { AddStreamOptions } from '../hooks/useStreams';
import { StreamPlayer } from './StreamPlayer';
import { StreamControls } from './StreamControls';
import { StreamInput } from './StreamInput';

interface StreamGridProps {
  streamCount: number;
  slots: StreamSlot[];
  maximizedSlotId: string | null;
  activeAudioSlotId: string | null;
  uncontrollableSlots?: string[];
  onToggleAudio: (slotId: string) => void;
  onSetMaximizedSlot: (slotId: string | null) => void;
  onAddStream: (
    index: number,
    url: string,
    manualOverrideType?: StreamType,
    sandboxMode?: SandboxMode,
    options?: AddStreamOptions
  ) => void;
  onRemoveStream: (index: number) => void;
  onReloadStream: (index: number) => void;
  onUpdateSlot: (index: number, patch: Partial<StreamSlot>) => void;
}

interface StreamSlotTileProps {
  slot: StreamSlot;
  index: number;
  isFocusMode: boolean;
  maximizedSlotId: string | null;
  activeAudioSlotId: string | null;
  uncontrollableSlots?: string[];
  isEditing: boolean;
  onSetEditingSlotIndex: (index: number | null) => void;
  onSetMaximizedSlot: (slotId: string | null) => void;
  onToggleAudio: (slotId: string) => void;
  onAddStream: (
    index: number,
    url: string,
    manualOverrideType?: StreamType,
    sandboxMode?: SandboxMode,
    options?: AddStreamOptions
  ) => void;
  onRemoveStream: (index: number) => void;
  onReloadStream: (index: number) => void;
  onUpdateSlot: (index: number, patch: Partial<StreamSlot>) => void;
  slotStyle: React.CSSProperties;
  standardSpanClass: string;
}

const StreamSlotTile: React.FC<StreamSlotTileProps> = ({
  slot,
  index,
  isFocusMode,
  maximizedSlotId,
  activeAudioSlotId,
  uncontrollableSlots = [],
  isEditing,
  onSetEditingSlotIndex,
  onSetMaximizedSlot,
  onToggleAudio,
  onAddStream,
  onRemoveStream,
  onReloadStream,
  onUpdateSlot,
  slotStyle,
  standardSpanClass,
}) => {
  const isSlotFocused = isFocusMode && slot.id === maximizedSlotId;
  const isSecondaryInFocusMode = isFocusMode && !isSlotFocused;
  const isAudioActive = activeAudioSlotId === slot.id;
  const isAudioControllable = !uncontrollableSlots.includes(slot.id);
  const hasStream = Boolean(slot.url && slot.type !== 'unsupported');

  // Auto-hide controls after 2.5 seconds of user inactivity
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 2500);
  }, []);

  // Show controls briefly when stream loads or changes, then auto-hide
  useEffect(() => {
    if (hasStream) {
      resetControlsTimer();
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [hasStream, slot.url, slot.reloadKey, resetControlsTimer]);

  const handleMouseLeave = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Smoothly fade out when cursor leaves the tile
    hideTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 350);
  };

  return (
    <div
      style={slotStyle}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onMouseLeave={handleMouseLeave}
      onTouchStart={resetControlsTimer}
      onClick={() => {
        resetControlsTimer();
        // Clicking a secondary stream in Focus Mode smoothly converts it into the main hero stream!
        if (isSecondaryInFocusMode && hasStream && !isEditing) {
          onSetMaximizedSlot(slot.id);
        }
      }}
      className={`relative rounded-xl overflow-hidden bg-[#191b20] border transition-all duration-200 flex flex-col group min-h-0 ${
        isSlotFocused
          ? 'border-emerald-500/60 shadow-2xl ring-2 ring-emerald-500/40 z-20'
          : isSecondaryInFocusMode
          ? 'border-white/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/30 cursor-pointer'
          : `${standardSpanClass} ${
              isAudioActive
                ? 'border-emerald-500/50 shadow-md shadow-emerald-950/20'
                : 'border-white/10 hover:border-white/20'
            }`
      }`}
    >
      {/* Secondary stream hover badge in Focus Mode - auto hides when inactive */}
      {isSecondaryInFocusMode && hasStream && !isEditing && (
        <div
          className={`absolute top-2 left-2 z-25 transition-all duration-300 pointer-events-none ${
            isControlsVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-1'
          }`}
        >
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/40 shadow-lg backdrop-blur-xs">
            <Pin className="w-3 h-3" />
            Hacer principal
          </span>
        </div>
      )}

      {/* Empty slot state */}
      {!hasStream && !isEditing && (
        <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center p-4 text-center bg-[#15171c]/60 hover:bg-[#191b20] transition group/empty">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover/empty:text-emerald-400 group-hover/empty:border-emerald-500/40 group-hover/empty:bg-emerald-500/10 transition mb-2.5 shadow-inner">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-[11px] sm:text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-1">
            CANAL {index + 1}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mb-3 max-w-[180px]">
            Espacio disponible para transmisión
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetEditingSlotIndex(index);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-950/40 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ AGREGAR</span>
          </button>
        </div>
      )}

      {/* Editing slot URL */}
      {isEditing && (
        <div
          className="w-full h-full flex items-center justify-center p-2 bg-[#121418] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <StreamInput
            channelIndex={index}
            initialUrl={slot.originalInput || slot.url}
            initialEmbedUrl={slot.embedUrl}
            initialSandboxMode={slot.sandboxMode || 'no-sandbox'}
            onConfirm={(newUrl, manualOverrideType, sandboxMode, options) => {
              onAddStream(index, newUrl, manualOverrideType, sandboxMode, options);
              onSetEditingSlotIndex(null);
            }}
            onCancel={() => onSetEditingSlotIndex(null)}
          />
        </div>
      )}

      {/* Active stream player with auto-hiding controls */}
      {hasStream && !isEditing && (
        <>
          <div className="w-full h-full relative flex-1 min-h-0">
            <StreamPlayer
              slot={slot}
              isUnmuted={isAudioActive}
              onStatusChange={(status, diagnosticCode, error) => {
                onUpdateSlot(index, { status, diagnosticCode, errorMessage: error });
              }}
              onRetry={() => onReloadStream(index)}
              onEditUrl={() => onSetEditingSlotIndex(index)}
              onReplaceUrl={(newUrl) => onAddStream(index, newUrl)}
            />
          </div>

          <StreamControls
            slot={slot}
            isMaximized={isSlotFocused}
            isAudioActive={isAudioActive}
            isAudioControllable={isAudioControllable}
            isVisible={isControlsVisible}
            onUserInteraction={resetControlsTimer}
            onUpdateSlot={(patch) => onUpdateSlot(index, patch)}
            onToggleAudio={() => {
              resetControlsTimer();
              onToggleAudio(slot.id);
            }}
            onToggleMaximize={() => {
              resetControlsTimer();
              // Toggle focus mode: if already focused, restore balanced grid; if not, make it principal
              onSetMaximizedSlot(isSlotFocused ? null : slot.id);
            }}
            onReload={() => {
              resetControlsTimer();
              onReloadStream(index);
            }}
            onEdit={() => onSetEditingSlotIndex(index)}
            onClose={() => onRemoveStream(index)}
            onToggleAspectRatio={() => {
              resetControlsTimer();
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
};

export const StreamGrid: React.FC<StreamGridProps> = ({
  streamCount,
  slots,
  maximizedSlotId,
  activeAudioSlotId,
  uncontrollableSlots = [],
  onToggleAudio,
  onSetMaximizedSlot,
  onAddStream,
  onRemoveStream,
  onReloadStream,
  onUpdateSlot,
}) => {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Auto-hide Focus Mode Banner after 2.5s of inactivity
  const [isFocusBannerVisible, setIsFocusBannerVisible] = useState(true);
  const focusBannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetFocusBannerTimer = useCallback(() => {
    setIsFocusBannerVisible(true);
    if (focusBannerTimerRef.current) {
      clearTimeout(focusBannerTimerRef.current);
    }
    focusBannerTimerRef.current = setTimeout(() => {
      setIsFocusBannerVisible(false);
    }, 2500);
  }, []);

  const activeSlots = slots.slice(0, streamCount);
  const isFocusMode = maximizedSlotId !== null && activeSlots.some((s) => s.id === maximizedSlotId);
  const secondarySlots = activeSlots.filter((s) => s.id !== maximizedSlotId);
  const secondaryCount = secondarySlots.length;

  useEffect(() => {
    if (isFocusMode) {
      resetFocusBannerTimer();
    }
    return () => {
      if (focusBannerTimerRef.current) {
        clearTimeout(focusBannerTimerRef.current);
      }
    };
  }, [isFocusMode, maximizedSlotId, resetFocusBannerTimer]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Standard Balanced Grid classes when Focus Mode is NOT active
  const getStandardGridClasses = () => {
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

  // For 5 streams in standard grid, balance symmetrically
  const getStandardSlotSpanClass = (index: number) => {
    if (streamCount === 3 && index === 2) {
      return 'md:col-span-2 lg:col-span-1';
    }
    if (streamCount === 5) {
      if (index < 3) {
        return 'sm:col-span-2 sm:row-span-1';
      } else {
        return 'sm:col-span-3 sm:row-span-1';
      }
    }
    return 'col-span-1 row-span-1';
  };

  // Compute container style for Google Meet / Zoom stage + secondary filmstrip
  const getContainerStyle = (): React.CSSProperties => {
    if (!isFocusMode) return {};

    if (secondaryCount === 0) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        gap: '0.5rem',
      };
    }

    if (isDesktop) {
      return {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) clamp(260px, 26vw, 360px)',
        gridTemplateRows: `repeat(${secondaryCount}, minmax(0, 1fr))`,
        gap: '0.5rem',
      };
    }

    // Mobile / Tablet Portrait
    return {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: `minmax(220px, 52vh) repeat(${secondaryCount}, minmax(130px, 1fr))`,
      gap: '0.5rem',
      overflowY: 'auto',
    };
  };

  // Compute individual slot placement in Focus Mode without unmounting
  const getSlotStyle = (slot: StreamSlot): React.CSSProperties => {
    if (!isFocusMode) return {};

    const isSlotFocused = slot.id === maximizedSlotId;

    if (isSlotFocused) {
      if (secondaryCount === 0) {
        return { gridColumn: '1 / -1', gridRow: '1 / -1' };
      }
      if (isDesktop) {
        return { gridColumn: '1 / 2', gridRow: '1 / -1' };
      }
      return { gridColumn: '1 / 2', gridRow: '1 / 2' };
    }

    // Secondary slot position
    const secIndex = secondarySlots.findIndex((s) => s.id === slot.id);
    if (isDesktop) {
      return {
        gridColumn: '2 / 3',
        gridRow: `${secIndex + 1} / ${secIndex + 2}`,
      };
    }

    // Mobile secondary position
    return {
      gridColumn: '1 / 2',
      gridRow: `${secIndex + 2} / ${secIndex + 3}`,
    };
  };

  const focusedSlot = slots.find((s) => s.id === maximizedSlotId);

  return (
    <div
      onMouseMove={isFocusMode ? resetFocusBannerTimer : undefined}
      onTouchStart={isFocusMode ? resetFocusBannerTimer : undefined}
      className="relative w-full h-full flex flex-col p-1.5 sm:p-2 bg-[#101114] overflow-hidden select-none"
    >
      {/* Top Banner when in Focus Mode (Google Meet / Zoom stage) - auto hides on idle */}
      {isFocusMode && (
        <div
          onMouseEnter={() => {
            setIsFocusBannerVisible(true);
            if (focusBannerTimerRef.current) {
              clearTimeout(focusBannerTimerRef.current);
            }
          }}
          onMouseLeave={resetFocusBannerTimer}
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-emerald-500/40 shadow-2xl transition-all duration-300 pointer-events-auto ${
            isFocusBannerVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex items-center gap-1.5 text-xs text-white">
            <span className="font-bold text-emerald-400">ENFOQUE:</span>
            <span className="font-medium truncate max-w-[200px] sm:max-w-[320px]">
              {focusedSlot?.title || 'Transmisión Principal'}
            </span>
          </div>
          <button
            onClick={() => onSetMaximizedSlot(null)}
            title="Volver a cuadrícula equilibrada (Tecla ESC)"
            className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Restaurar Cuadrícula (ESC)</span>
          </button>
        </div>
      )}

      {/* Main Grid Container:
          In both balanced and focus mode, every slot is rendered in the EXACT same list
          with stable key={slot.id}. NO SLOT IS EVER UNMOUNTED OR HIDDEN WITH DISPLAY:NONE. */}
      <div
        className={`w-full h-full ${
          isFocusMode ? '' : `gap-1.5 sm:gap-2 ${getStandardGridClasses()}`
        }`}
        style={getContainerStyle()}
      >
        {activeSlots.map((slot, index) => (
          <StreamSlotTile
            key={slot.id}
            slot={slot}
            index={index}
            isFocusMode={isFocusMode}
            maximizedSlotId={maximizedSlotId}
            activeAudioSlotId={activeAudioSlotId}
            uncontrollableSlots={uncontrollableSlots}
            isEditing={editingSlotIndex === index}
            onSetEditingSlotIndex={setEditingSlotIndex}
            onSetMaximizedSlot={onSetMaximizedSlot}
            onToggleAudio={onToggleAudio}
            onAddStream={onAddStream}
            onRemoveStream={onRemoveStream}
            onReloadStream={onReloadStream}
            onUpdateSlot={onUpdateSlot}
            slotStyle={getSlotStyle(slot)}
            standardSpanClass={getStandardSlotSpanClass(index)}
          />
        ))}
      </div>
    </div>
  );
};
