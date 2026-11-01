/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type AudioListener = (activeSlotId: string | null) => void;

class AudioManager {
  private activeSlotId: string | null = null;
  private listeners: Set<AudioListener> = new Set();
  private iframeControllers: Map<string, (shouldBeMuted: boolean) => void> = new Map();

  constructor() {
    // By default all streams begin muted
    this.activeSlotId = null;
  }

  /**
   * Returns current active audio slot id (or null if all muted)
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
   * Request audio for a slot.
   * If the slot is already the active one, it mutes it (sets active to null).
   * If a different slot is clicked, it un-mutes that slot and instantly mutes all others.
   */
  public toggleSlotAudio(slotId: string): boolean {
    if (this.activeSlotId === slotId) {
      // Mute it
      this.activeSlotId = null;
    } else {
      // Enable this one, mute all others
      this.activeSlotId = slotId;
    }

    this.notifyAll();
    return this.isUnmuted(slotId);
  }

  /**
   * Explicitly set which slot has audio (or null for all muted)
   */
  public setSlotAudio(slotId: string | null): void {
    if (this.activeSlotId !== slotId) {
      this.activeSlotId = slotId;
      this.notifyAll();
    }
  }

  /**
   * Silence all streams
   */
  public muteAll(): void {
    if (this.activeSlotId !== null) {
      this.activeSlotId = null;
      this.notifyAll();
    }
  }

  /**
   * Register an iframe audio handler (e.g. YouTube, Vimeo, Twitch)
   */
  public registerIframeController(slotId: string, controller: (shouldBeMuted: boolean) => void): () => void {
    this.iframeControllers.set(slotId, controller);
    // Apply current audio state right away
    controller(this.activeSlotId !== slotId);

    return () => {
      this.iframeControllers.delete(slotId);
      if (this.activeSlotId === slotId) {
        this.activeSlotId = null;
        this.notifyAll();
      }
    };
  }

  /**
   * Subscribe to global audio state changes
   */
  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    listener(this.activeSlotId);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyAll(): void {
    // Notify all React listeners
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeSlotId);
      } catch (err) {
        console.error('Error in audio listener', err);
      }
    });

    // Notify all registered iframe controllers
    this.iframeControllers.forEach((controller, slotId) => {
      try {
        const shouldBeMuted = this.activeSlotId !== slotId;
        controller(shouldBeMuted);
      } catch (err) {
        console.error('Error controlling iframe audio for slot', slotId, err);
      }
    });

    // Also dispatch browser custom event for maximum integration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('multiview:audio_changed', {
          detail: { activeSlotId: this.activeSlotId },
        })
      );
    }
  }
}

export const globalAudioManager = new AudioManager();
