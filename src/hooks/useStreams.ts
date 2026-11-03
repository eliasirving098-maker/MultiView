/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { detectStreamSource } from '../services/streamDetector';
import { storageService } from '../services/storageService';
import { globalAudioManager } from '../services/audioManager';
import { SavedPreset, StreamSlot } from '../types/stream';

const DEFAULT_SLOT_COUNT = 4;

function createEmptySlots(count: number): StreamSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `slot-${index + 1}`,
    index,
    url: '',
    originalInput: '',
    title: `Canal ${index + 1}`,
    type: 'unsupported',
    classification: 'unsupported',
    diagnosticCode: 'none',
    isMuted: true,
    isPlaying: false,
    volume: 1,
    status: 'idle',
    aspectRatio: 'contain',
    reloadKey: 0,
  }));
}

export function useStreams(initialCount?: number) {
  const [streamCount, setStreamCountState] = useState<number>(() => {
    return initialCount || storageService.getSavedStreamCount(DEFAULT_SLOT_COUNT);
  });

  const [slots, setSlots] = useState<StreamSlot[]>(() => {
    const count = initialCount || storageService.getSavedStreamCount(DEFAULT_SLOT_COUNT);
    const empty = createEmptySlots(6); // Always hold 6 slots in memory for seamless count toggle
    const saved = storageService.getSavedSlotsState();

    if (saved.length > 0) {
      saved.forEach((item) => {
        if (item.index < 6 && item.url) {
          const detected = detectStreamSource(item.url);
          empty[item.index] = {
            ...empty[item.index],
            url: detected.embedUrl || item.url,
            originalInput: item.url,
            title: item.title || detected.title,
            type: detected.type,
            classification: detected.classification,
            videoId: detected.videoId,
            channel: detected.channel,
            status: detected.type === 'blob-resource' ? 'error' : 'loading',
            diagnosticCode: detected.diagnosticCode || 'none',
            errorMessage: detected.reason,
          };
        }
      });
    }
    return empty;
  });

  const [maximizedSlotId, setMaximizedSlotId] = useState<string | null>(null);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);

  // Sync slots to local storage on changes
  useEffect(() => {
    storageService.saveSlotsState(slots);
    storageService.saveStreamCount(streamCount);
  }, [slots, streamCount]);

  const addStream = useCallback((index: number, rawUrl: string) => {
    const detected = detectStreamSource(rawUrl);

    setSlots((prev) => {
      const updated = [...prev];
      if (index >= 0 && index < updated.length) {
        updated[index] = {
          ...updated[index],
          url: detected.embedUrl || rawUrl,
          originalInput: rawUrl,
          title: detected.title || `Stream ${index + 1}`,
          type: detected.type,
          classification: detected.classification,
          videoId: detected.videoId,
          channel: detected.channel,
          status: detected.type === 'blob-resource' ? 'error' : 'loading',
          diagnosticCode: detected.diagnosticCode || 'none',
          errorMessage: detected.reason,
          reloadKey: updated[index].reloadKey + 1,
        };
      }
      return updated;
    });

    if (detected.type !== 'unsupported') {
      storageService.addToHistory(rawUrl, detected.title, detected.type, detected.classification);
    }
  }, []);

  const removeStream = useCallback((index: number) => {
    setSlots((prev) => {
      const updated = [...prev];
      if (index >= 0 && index < updated.length) {
        const slotId = updated[index].id;
        if (globalAudioManager.getActiveAudioSlotId() === slotId) {
          globalAudioManager.muteAll();
        }
        updated[index] = {
          ...updated[index],
          url: '',
          originalInput: '',
          title: `Canal ${index + 1}`,
          type: 'unsupported',
          videoId: undefined,
          channel: undefined,
          status: 'idle',
          errorMessage: undefined,
        };
      }
      return updated;
    });

    // If maximized slot was removed, close maximize view
    const removedSlotId = `slot-${index + 1}`;
    setMaximizedSlotId((cur) => (cur === removedSlotId ? null : cur));
  }, []);

  const reloadStream = useCallback((index: number) => {
    setSlots((prev) => {
      const updated = [...prev];
      if (index >= 0 && index < updated.length) {
        updated[index] = {
          ...updated[index],
          reloadKey: updated[index].reloadKey + 1,
          status: 'loading',
        };
      }
      return updated;
    });
  }, []);

  const updateSlot = useCallback((index: number, patch: Partial<StreamSlot>) => {
    setSlots((prev) => {
      const updated = [...prev];
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], ...patch };
      }
      return updated;
    });
  }, []);

  const setStreamCount = useCallback((newCount: number) => {
    if (newCount < 1 || newCount > 6) return;
    setStreamCountState(newCount);
    storageService.saveStreamCount(newCount);

    // If current maximized slot is beyond new count, reset maximize
    setMaximizedSlotId((cur) => {
      if (!cur) return null;
      const num = parseInt(cur.replace('slot-', ''), 10);
      return num > newCount ? null : cur;
    });
  }, []);

  const loadPreset = useCallback((preset: SavedPreset) => {
    setStreamCountState(preset.streamCount);
    storageService.saveStreamCount(preset.streamCount);

    setSlots((prev) => {
      const updated = createEmptySlots(6);
      preset.streams.forEach((item) => {
        if (item.index < 6 && item.url) {
          const detected = detectStreamSource(item.url);
          updated[item.index] = {
            ...updated[item.index],
            url: detected.embedUrl || item.url,
            originalInput: item.url,
            title: item.title || detected.title,
            type: detected.type,
            classification: detected.classification,
            videoId: detected.videoId,
            channel: detected.channel,
            status: detected.type === 'blob-resource' ? 'error' : 'loading',
            diagnosticCode: detected.diagnosticCode || 'none',
            errorMessage: detected.reason,
          };
        }
      });
      return updated;
    });

    globalAudioManager.muteAll();
    setMaximizedSlotId(null);
  }, []);

  const clearAllStreams = useCallback(() => {
    globalAudioManager.muteAll();
    setMaximizedSlotId(null);
    setSlots(createEmptySlots(6));
  }, []);

  return {
    streamCount,
    setStreamCount,
    slots,
    activeSlots: slots.slice(0, streamCount),
    maximizedSlotId,
    setMaximizedSlotId,
    focusedSlotId,
    setFocusedSlotId,
    addStream,
    removeStream,
    reloadStream,
    updateSlot,
    loadPreset,
    clearAllStreams,
  };
}
