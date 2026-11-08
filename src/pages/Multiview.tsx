/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStreams } from '../hooks/useStreams';
import { useAudioManager } from '../hooks/useAudioManager';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Header } from '../components/Header';
import { StreamGrid } from '../components/StreamGrid';
import { SavedPresetsModal } from '../components/SavedPresetsModal';
import { ShortcutsHelpModal } from '../components/ShortcutsHelpModal';
import { SavedPreset } from '../types/stream';

interface MultiviewProps {
  initialCount: number;
  initialPreset?: SavedPreset | null;
  onNavigateHome: () => void;
}

export const Multiview: React.FC<MultiviewProps> = ({
  initialCount,
  initialPreset,
  onNavigateHome,
}) => {
  const {
    streamCount,
    setStreamCount,
    slots,
    activeSlots,
    maximizedSlotId,
    setMaximizedSlotId,
    focusedSlotId,
    setFocusedSlotId,
    addStream,
    removeStream,
    reloadStream,
    updateSlot,
    loadPreset,
  } = useStreams(initialCount);

  const {
    activeSlotId,
    toggleSlotAudio,
    muteAll,
    uncontrollableSlots,
  } = useAudioManager();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Apply initial preset if provided
  useEffect(() => {
    if (initialPreset) {
      loadPreset(initialPreset);
    }
  }, [initialPreset, loadPreset]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('Failed to exit fullscreen:', err);
        });
      }
    }
  };

  // Keyboard shortcuts handler:
  // - M: toggle mute on active audio slot or first active slot
  // - ESC: exit maximized mode or close open modals
  // - F: toggle fullscreen
  // - R: reload active/maximized stream
  useKeyboardShortcuts({
    onToggleMuteActive: () => {
      const targetSlot = maximizedSlotId || activeSlotId || (activeSlots[0] ? activeSlots[0].id : null);
      if (targetSlot) {
        toggleSlotAudio(targetSlot);
      }
    },
    onExitMaximize: () => {
      if (isPresetsOpen) {
        setIsPresetsOpen(false);
      } else if (isShortcutsOpen) {
        setIsShortcutsOpen(false);
      } else if (maximizedSlotId) {
        setMaximizedSlotId(null);
      }
    },
    onToggleFullscreen: () => {
      handleToggleFullscreen();
    },
    onReloadActive: () => {
      const targetSlotIndex = maximizedSlotId
        ? slots.findIndex((s) => s.id === maximizedSlotId)
        : 0;
      if (targetSlotIndex >= 0) {
        reloadStream(targetSlotIndex);
      }
    },
  });

  const activeStreamsCount = activeSlots.filter((s) => s.url).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#101114] text-slate-100 overflow-hidden">
      {/* Top Header Command Bar */}
      <Header
        streamCount={streamCount}
        activeSlotsCount={activeStreamsCount}
        activeAudioSlotId={activeSlotId}
        uncontrollableCount={uncontrollableSlots.length}
        onSelectStreamCount={setStreamCount}
        onMuteAllAudio={muteAll}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onNavigateHome={onNavigateHome}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Multi-Screen Grid Workspace */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        <StreamGrid
          streamCount={streamCount}
          slots={slots}
          maximizedSlotId={maximizedSlotId}
          activeAudioSlotId={activeSlotId}
          uncontrollableSlots={uncontrollableSlots}
          onToggleAudio={toggleSlotAudio}
          onSetMaximizedSlot={setMaximizedSlotId}
          onAddStream={addStream}
          onRemoveStream={removeStream}
          onReloadStream={reloadStream}
          onUpdateSlot={updateSlot}
        />
      </main>

      {/* Presets Modal */}
      <SavedPresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        currentSlots={slots}
        currentStreamCount={streamCount}
        onLoadPreset={loadPreset}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};
