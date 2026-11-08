/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AudioControllability = 'controllable' | 'uncontrollable';

export interface AudioStateSnapshot {
  activeSlotId: string | null;
  controllability: Record<string, AudioControllability>;
}

export type AudioListener = (
  activeSlotId: string | null,
  snapshot?: AudioStateSnapshot
) => void;

/**
 * Specifically sends documented audio commands to Dailymotion embed players
 */
export function sendDailymotionAudioCommand(
  iframe: HTMLIFrameElement | null,
  shouldBeMuted: boolean
): void {
  if (!iframe?.contentWindow) return;
  const target = iframe.contentWindow;

  try {
    // Dailymotion Player API postMessage command
    const cmd = shouldBeMuted ? 'mute' : 'unmute';
    target.postMessage(JSON.stringify({ command: cmd }), '*');
    target.postMessage({ command: cmd }, '*');
    target.postMessage(JSON.stringify({ command: 'volume', value: shouldBeMuted ? 0 : 1 }), '*');
  } catch {
    // Cross-origin safety guard
  }
}

/**
 * Backward-compatible helper for legacy or generic iframes.
 * Used only when an iframe has a known control API.
 */
export function sendIframeAudioCommands(
  iframe: HTMLIFrameElement | null,
  shouldBeMuted: boolean
): void {
  if (!iframe?.contentWindow) return;
  const target = iframe.contentWindow;
  const isMute = shouldBeMuted;

  // Dailymotion specific commands
  try {
    target.postMessage(JSON.stringify({ command: isMute ? 'mute' : 'unmute' }), '*');
    target.postMessage({ command: isMute ? 'mute' : 'unmute' }, '*');
  } catch {
    // ignore
  }
}

/**
 * Central Authority for MultiView Audio Coordination.
 * Ensures:
 * 1. At most ONE slot has sound active across the entire application.
 * 2. Every slot can register multiple media elements (video/audio).
 * 3. Media elements added dynamically are tracked and muted if the slot is muted.
 * 4. User volume preference is preserved (uses `element.muted`, never hacks volume to 0).
 * 5. Accurately tracks which slots can be controlled vs cross-origin uncontrollable ones.
 */
class AudioManager {
  private activeSlotId: string | null = null;
  private listeners: Set<AudioListener> = new Set();

  // Multi-element registry per slot
  private mediaElements: Map<string, Set<HTMLMediaElement>> = new Map();
  // Listeners attached to individual elements (e.g. volumechange guards)
  private elementListeners: Map<HTMLMediaElement, () => void> = new Map();

  // Registered iframe controllers (YouTube, Twitch, Vimeo, Dailymotion)
  private iframeControllers: Map<string, (shouldBeMuted: boolean) => void> = new Map();

  // Controllability status per slot: 'controllable' | 'uncontrollable'
  private slotControllability: Map<string, AudioControllability> = new Map();

  // Preserved volume level per slot (0 to 1)
  private slotVolumes: Map<string, number> = new Map();

  constructor() {
    this.activeSlotId = null;
  }

  /**
   * Returns current active audio slot ID (or null if all muted)
   */
  public getActiveAudioSlotId(): string | null {
    return this.activeSlotId;
  }

  /**
   * Check if a specific slot is the one with audio active
   */
  public isUnmuted(slotId: string): boolean {
    return this.activeSlotId === slotId;
  }

  /**
   * Returns controllability status for a specific slot.
   * Defaults to 'controllable' for known native types.
   */
  public getAudioControllability(slotId: string): AudioControllability {
    return this.slotControllability.get(slotId) ?? 'controllable';
  }

  /**
   * Returns a dictionary of controllability for all registered slots
   */
  public getControllabilityMap(): Record<string, AudioControllability> {
    const map: Record<string, AudioControllability> = {};
    this.slotControllability.forEach((status, id) => {
      map[id] = status;
    });
    return map;
  }

  /**
   * Set controllability status for a slot (e.g. marked as 'uncontrollable' by an external cross-origin iframe)
   */
  public setSlotControllability(slotId: string, status: AudioControllability): void {
    const previous = this.slotControllability.get(slotId);
    if (previous !== status) {
      this.slotControllability.set(slotId, status);
      this.notifyListeners();
    }
  }

  /**
   * Request audio toggle for a slot.
   * - If already active -> mutes it (no slot has sound).
   * - If inactive -> activates it and immediately mutes all other slots.
   */
  public toggleSlotAudio(slotId: string): boolean {
    if (this.activeSlotId === slotId) {
      this.activeSlotId = null;
    } else {
      this.activeSlotId = slotId;
    }

    this.applyAudioState();
    return this.isUnmuted(slotId);
  }

  /**
   * Unmute a specific slot and mute all others
   */
  public unmuteSlot(slotId: string): void {
    if (this.activeSlotId !== slotId) {
      this.activeSlotId = slotId;
      this.applyAudioState();
    }
  }

  /**
   * Mute a specific slot.
   * If this slot was the active one, clears activeSlotId and mutes its media.
   * If another slot was active, leaves that one untouched and ensures this slot is muted.
   */
  public muteSlot(slotId: string): void {
    if (this.activeSlotId === slotId) {
      this.activeSlotId = null;
      this.applyAudioState();
    } else {
      this.muteSlotElements(slotId);
      const controller = this.iframeControllers.get(slotId);
      if (controller) {
        try {
          controller(true);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Explicitly set which slot has audio (or null for all muted)
   */
  public setSlotAudio(slotId: string | null): void {
    if (this.activeSlotId !== slotId) {
      this.activeSlotId = slotId;
      this.applyAudioState();
    }
  }

  /**
   * Mute all controllable streams across the entire application
   */
  public muteAll(): void {
    this.activeSlotId = null;
    this.applyAudioState();
  }

  /**
   * Register a direct HTMLMediaElement (video or audio tag) belonging to a slot.
   * Supports multiple elements per slot (e.g. primary video + secondary audio track).
   * Automatically enforces current slot mute state.
   */
  public registerMediaElement(
    slotId: string,
    element: HTMLMediaElement,
    userVolume?: number
  ): () => void {
    if (!element) return () => {};

    // HTMLMediaElement is natively controllable
    this.slotControllability.set(slotId, 'controllable');

    if (typeof userVolume === 'number' && userVolume >= 0 && userVolume <= 1) {
      this.slotVolumes.set(slotId, userVolume);
    }

    let slotSet = this.mediaElements.get(slotId);
    if (!slotSet) {
      slotSet = new Set();
      this.mediaElements.set(slotId, slotSet);
    }
    slotSet.add(element);

    // Synchronize initial state
    const shouldBeMuted = this.activeSlotId !== slotId;
    element.muted = shouldBeMuted;

    if (!shouldBeMuted) {
      const vol = this.slotVolumes.get(slotId) ?? 1;
      element.volume = vol;
      element.play().catch(() => {});
    }

    // Attach guard listener to re-assert mute if external code tries to unmute a muted slot
    const onVolumeChange = () => {
      const currentShouldBeMuted = this.activeSlotId !== slotId;
      if (currentShouldBeMuted && !element.muted) {
        // Enforce mute state
        element.muted = true;
      } else if (!currentShouldBeMuted && !element.muted) {
        // Remember updated volume
        this.slotVolumes.set(slotId, element.volume);
      }
    };

    element.addEventListener('volumechange', onVolumeChange);
    this.elementListeners.set(element, onVolumeChange);

    // Notify listeners so UI updates controllability
    this.notifyListeners();

    // Return unregister callback
    return () => {
      element.removeEventListener('volumechange', onVolumeChange);
      this.elementListeners.delete(element);

      const set = this.mediaElements.get(slotId);
      if (set) {
        set.delete(element);
        if (set.size === 0) {
          this.mediaElements.delete(slotId);
        }
      }
    };
  }

  /**
   * Observes a container DOM element and all its children.
   * Automatically registers any existing <video> or <audio> tags,
   * plus any dynamic media elements added in the future via MutationObserver.
   */
  public observeContainerMedia(
    slotId: string,
    container: HTMLElement | null,
    userVolume?: number
  ): () => void {
    if (!container) return () => {};

    const cleanups = new Map<HTMLMediaElement, () => void>();

    const registerElement = (el: HTMLMediaElement) => {
      if (!cleanups.has(el)) {
        const cleanup = this.registerMediaElement(slotId, el, userVolume);
        cleanups.set(el, cleanup);
      }
    };

    const unregisterElement = (el: HTMLMediaElement) => {
      const cleanup = cleanups.get(el);
      if (cleanup) {
        cleanup();
        cleanups.delete(el);
      }
    };

    // 1. Register all existing media elements
    const existing = container.querySelectorAll<HTMLMediaElement>('video, audio');
    existing.forEach((el) => registerElement(el));

    // 2. Observe dynamic DOM changes for newly injected media tags
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Added nodes
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) {
            registerElement(node);
          } else if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll<HTMLMediaElement>('video, audio');
            nested.forEach((el) => registerElement(el));
          }
        });

        // Removed nodes
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) {
            unregisterElement(node);
          } else if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll<HTMLMediaElement>('video, audio');
            nested.forEach((el) => unregisterElement(el));
          }
        });
      });
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }

  /**
   * Register an iframe audio handler (e.g. YouTube, Vimeo, Twitch, Dailymotion)
   */
  public registerIframeController(
    slotId: string,
    controller: (shouldBeMuted: boolean) => void,
    isControllable: boolean = true
  ): () => void {
    this.iframeControllers.set(slotId, controller);
    this.slotControllability.set(
      slotId,
      isControllable ? 'controllable' : 'uncontrollable'
    );

    // Apply current audio state right away
    try {
      controller(this.activeSlotId !== slotId);
    } catch {
      // ignore
    }

    this.notifyListeners();

    return () => {
      this.iframeControllers.delete(slotId);
      this.slotControllability.delete(slotId);
      this.notifyListeners();
    };
  }

  /**
   * Subscribe to audio state changes
   */
  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    listener(this.activeSlotId, this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Internal: apply current audio state to all registered media elements and iframe controllers
   */
  private applyAudioState(): void {
    // 1. Direct synchronous muting of registered HTMLMediaElements across all slots
    this.mediaElements.forEach((elementSet, slotId) => {
      const shouldBeMuted = this.activeSlotId !== slotId;
      elementSet.forEach((element) => {
        try {
          element.muted = shouldBeMuted;
          if (!shouldBeMuted) {
            const vol = this.slotVolumes.get(slotId) ?? 1;
            element.volume = vol;
            element.play().catch(() => {});
          }
        } catch (err) {
          console.error('Error controlling media element for slot', slotId, err);
        }
      });
    });

    // 2. Notify all registered iframe controllers
    this.iframeControllers.forEach((controller, slotId) => {
      try {
        const shouldBeMuted = this.activeSlotId !== slotId;
        controller(shouldBeMuted);
      } catch (err) {
        console.error('Error controlling iframe audio for slot', slotId, err);
      }
    });

    // 3. Notify subscribers
    this.notifyListeners();
  }

  private muteSlotElements(slotId: string): void {
    const elementSet = this.mediaElements.get(slotId);
    if (elementSet) {
      elementSet.forEach((element) => {
        try {
          element.muted = true;
        } catch {
          // ignore
        }
      });
    }
  }

  private getSnapshot(): AudioStateSnapshot {
    return {
      activeSlotId: this.activeSlotId,
      controllability: this.getControllabilityMap(),
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getSnapshot();

    this.listeners.forEach((listener) => {
      try {
        listener(this.activeSlotId, snapshot);
      } catch (err) {
        console.error('Error in audio listener', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('multiview:audio_changed', {
          detail: {
            activeSlotId: this.activeSlotId,
            controllability: snapshot.controllability,
          },
        })
      );
    }
  }
}

export const globalAudioManager = new AudioManager();
