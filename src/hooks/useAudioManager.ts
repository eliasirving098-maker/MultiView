/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { globalAudioManager } from '../services/audioManager';

export function useAudioManager() {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(() =>
    globalAudioManager.getActiveAudioSlotId()
  );

  useEffect(() => {
    const unsubscribe = globalAudioManager.subscribe((currentActiveId) => {
      setActiveSlotId(currentActiveId);
    });
    return unsubscribe;
  }, []);

  const toggleSlotAudio = (slotId: string) => {
    return globalAudioManager.toggleSlotAudio(slotId);
  };

  const setSlotAudio = (slotId: string | null) => {
    globalAudioManager.setSlotAudio(slotId);
  };

  const muteAll = () => {
    globalAudioManager.muteAll();
  };

  const isSlotUnmuted = (slotId: string) => {
    return activeSlotId === slotId;
  };

  return {
    activeSlotId,
    toggleSlotAudio,
    setSlotAudio,
    muteAll,
    isSlotUnmuted,
  };
}
