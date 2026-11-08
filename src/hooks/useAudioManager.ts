/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  globalAudioManager,
  AudioControllability,
  AudioStateSnapshot,
} from '../services/audioManager';

export function useAudioManager() {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(() =>
    globalAudioManager.getActiveAudioSlotId()
  );

  const [controllability, setControllability] = useState<Record<string, AudioControllability>>(() =>
    globalAudioManager.getControllabilityMap()
  );

  useEffect(() => {
    const unsubscribe = globalAudioManager.subscribe((currentActiveId, snapshot) => {
      setActiveSlotId(currentActiveId);
      if (snapshot?.controllability) {
        setControllability({ ...snapshot.controllability });
      } else {
        setControllability(globalAudioManager.getControllabilityMap());
      }
    });
    return unsubscribe;
  }, []);

  const toggleSlotAudio = (slotId: string) => {
    return globalAudioManager.toggleSlotAudio(slotId);
  };

  const setSlotAudio = (slotId: string | null) => {
    globalAudioManager.setSlotAudio(slotId);
  };

  const muteSlot = (slotId: string) => {
    globalAudioManager.muteSlot(slotId);
  };

  const unmuteSlot = (slotId: string) => {
    globalAudioManager.unmuteSlot(slotId);
  };

  const muteAll = () => {
    globalAudioManager.muteAll();
  };

  const isSlotUnmuted = (slotId: string) => {
    return activeSlotId === slotId;
  };

  const isSlotControllable = (slotId: string) => {
    return (controllability[slotId] ?? 'controllable') !== 'uncontrollable';
  };

  const uncontrollableSlots = Object.entries(controllability)
    .filter(([_, status]) => status === 'uncontrollable')
    .map(([id]) => id);

  return {
    activeSlotId,
    controllability,
    toggleSlotAudio,
    setSlotAudio,
    muteSlot,
    unmuteSlot,
    muteAll,
    isSlotUnmuted,
    isSlotControllable,
    uncontrollableSlots,
  };
}
