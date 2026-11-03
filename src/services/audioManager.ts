/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type AudioListener = (activeSlotId: string | null) => void;

/**
 * Broadcast standard audio postMessage commands to any iframe player
 * (YouTube, Vimeo, Twitch, Player.js, JWPlayer, Video.js, HTML5 wrappers, etc.)
 */
export function sendIframeAudioCommands(
  iframe: HTMLIFrameElement | null,
  shouldBeMuted: boolean
): void {
  if (!iframe?.contentWindow) return;

  const target = iframe.contentWindow;
  const isMute = shouldBeMuted;

  const payloads: any[] = [
    // Standard player.js protocol
    { context: 'player.js', version: '0.0.11', event: 'command', command: isMute ? 'mute' : 'unmute' },
    { context: 'player.js', version: '0.0.11', event: 'command', command: 'setVolume', value: isMute ? 0 : 100 },

    // YouTube JSON-RPC protocol
    { event: 'command', func: isMute ? 'mute' : 'unMute', args: [] },
    { event: 'command', func: 'setVolume', args: [isMute ? 0 : 100] },

    // Vimeo protocol
    { method: isMute ? 'mute' : 'unmute' },
    { method: 'setVolume', value: isMute ? 0 : 1 },

    // Twitch protocol
    { event: isMute ? 'mute' : 'unMute' },
    { type: 'player', data: { muted: isMute } },

    // Generic HTML5 / embed player protocols
    { action: isMute ? 'mute' : 'unmute' },
    { command: isMute ? 'mute' : 'unmute' },
    { type: isMute ? 'mute' : 'unmute' },
    { type: 'volume', volume: isMute ? 0 : 1 },
    { type: 'setMute', muted: isMute },
    { message: isMute ? 'mute' : 'unmute' },
  ];

  payloads.forEach((payload) => {
    try {
      // Send as JavaScript object
      target.postMessage(payload, '*');
      // Also send as serialized JSON string for receivers expecting strings
      target.postMessage(JSON.stringify(payload), '*');
    } catch {
      // Cross-origin safety guard
    }
  });
}

class AudioManager {
  private activeSlotId: string | null = null;
  private listeners: Set<AudioListener> = new Set();
  private iframeControllers: Map<string, (shouldBeMuted: boolean) => void> = new Map();
  private mediaElements: Map<string, HTMLMediaElement> = new Map();

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
   * Register a direct HTMLMediaElement (video/audio tag) for synchronous muting
   */
  public registerMediaElement(slotId: string, element: HTMLMediaElement): () => void {
    this.mediaElements.set(slotId, element);
    element.muted = this.activeSlotId !== slotId;

    return () => {
      this.mediaElements.delete(slotId);
    };
  }

  /**
   * Register an iframe audio handler (e.g. YouTube, Vimeo, Twitch, EmbedPlayer)
   */
  public registerIframeController(slotId: string, controller: (shouldBeMuted: boolean) => void): () => void {
    this.iframeControllers.set(slotId, controller);
    // Apply current audio state right away
    controller(this.activeSlotId !== slotId);

    return () => {
      this.iframeControllers.delete(slotId);
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
    // 1. Direct synchronous muting of registered HTMLMediaElements
    this.mediaElements.forEach((element, id) => {
      try {
        const shouldBeMuted = this.activeSlotId !== id;
        element.muted = shouldBeMuted;
        if (!shouldBeMuted) {
          element.play().catch(() => {});
        }
      } catch (err) {
        console.error('Error controlling media element for slot', id, err);
      }
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

    // 3. Notify all React listeners
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeSlotId);
      } catch (err) {
        console.error('Error in audio listener', err);
      }
    });

    // 4. Also dispatch browser custom event
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
