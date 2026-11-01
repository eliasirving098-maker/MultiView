/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HistoryItem, SavedPreset, StreamSlot, StreamType } from '../types/stream';

const STORAGE_KEYS = {
  PRESETS: 'multiview_presets_v1',
  HISTORY: 'multiview_history_v1',
  STREAM_COUNT: 'multiview_stream_count_v1',
  ACTIVE_SLOTS: 'multiview_slots_state_v1',
  GRID_MODE: 'multiview_grid_mode_v1',
};

// Initial default presets to provide an instant, rich experience
const DEFAULT_PRESETS: SavedPreset[] = [
  {
    id: 'preset-nfl',
    name: 'NFL: Ravens vs Bills',
    category: 'Fútbol',
    streamCount: 4,
    streams: [
      {
        index: 0,
        url: 'https://tvsportslive.fr/baltimore-ravens-vs-buffalo-bills/',
        title: 'Baltimore Ravens vs. Buffalo Bills (tvsportslive)',
        type: 'sports-portal',
      },
      {
        index: 1,
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        title: 'Cámara Táctica (HLS)',
        type: 'hls',
      },
      {
        index: 2,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Estadio Principal HD',
        type: 'html5',
      },
      {
        index: 3,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        title: 'Repeticiones & Var',
        type: 'html5',
      },
    ],
    createdAt: Date.now() - 1800000,
  },
  {
    id: 'preset-sports',
    name: 'Fútbol & Deportes',
    category: 'Fútbol',
    streamCount: 4,
    streams: [
      {
        index: 0,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Estadio Principal HD',
        type: 'html5',
      },
      {
        index: 1,
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        title: 'Cámara Táctica (HLS)',
        type: 'hls',
      },
      {
        index: 2,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        title: 'Tribuna & Ambiente',
        type: 'html5',
      },
      {
        index: 3,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        title: 'Repeticiones & Var',
        type: 'html5',
      },
    ],
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'preset-news',
    name: 'Noticias & Directos',
    category: 'Noticias',
    streamCount: 3,
    streams: [
      {
        index: 0,
        url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
        title: 'NASA Live Oficial',
        type: 'youtube',
      },
      {
        index: 1,
        url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
        title: 'Canal Internacional 24h',
        type: 'hls',
      },
      {
        index: 2,
        url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        title: 'Lofi Girl Stream',
        type: 'youtube',
      },
    ],
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'preset-monitoring',
    name: 'Centro de Monitoreo',
    category: 'Monitoreo',
    streamCount: 6,
    streams: [
      {
        index: 0,
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        title: 'Feed Sector Norte (HLS)',
        type: 'hls',
      },
      {
        index: 1,
        url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
        title: 'Feed Sector Sur (HLS)',
        type: 'hls',
      },
      {
        index: 2,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Cámara Perímetro 1',
        type: 'html5',
      },
      {
        index: 3,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        title: 'Cámara Perímetro 2',
        type: 'html5',
      },
      {
        index: 4,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        title: 'Cámara Acceso Principal',
        type: 'html5',
      },
      {
        index: 5,
        url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
        title: 'Satélite en Órbita',
        type: 'youtube',
      },
    ],
    createdAt: Date.now() - 10800000,
  },
];

export const storageService = {
  // Presets
  getPresets(): SavedPreset[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRESETS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(DEFAULT_PRESETS));
        return DEFAULT_PRESETS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_PRESETS;
    }
  },

  savePreset(preset: Omit<SavedPreset, 'id' | 'createdAt'>): SavedPreset {
    const presets = this.getPresets();
    const newPreset: SavedPreset = {
      ...preset,
      id: 'preset-' + Date.now(),
      createdAt: Date.now(),
    };
    const updated = [newPreset, ...presets];
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save preset to localStorage', e);
    }
    return newPreset;
  },

  deletePreset(id: string): SavedPreset[] {
    const presets = this.getPresets().filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to update presets in localStorage', e);
    }
    return presets;
  },

  // History
  getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addToHistory(url: string, title: string, type: StreamType): HistoryItem[] {
    if (!url.trim()) return this.getHistory();
    const history = this.getHistory().filter((item) => item.url !== url);
    const newItem: HistoryItem = {
      id: 'hist-' + Date.now(),
      url,
      title: title || url,
      type,
      timestamp: Date.now(),
    };
    const updated = [newItem, ...history].slice(0, 25); // retain last 25
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
    return updated;
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch {
      // ignore
    }
  },

  // Preferred stream count
  getSavedStreamCount(fallback: number = 4): number {
    try {
      const count = localStorage.getItem(STORAGE_KEYS.STREAM_COUNT);
      if (count) {
        const parsed = parseInt(count, 10);
        if (parsed >= 1 && parsed <= 6) return parsed;
      }
    } catch {
      // fallback
    }
    return fallback;
  },

  saveStreamCount(count: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STREAM_COUNT, count.toString());
    } catch {
      // ignore
    }
  },

  // Persisted slots state
  saveSlotsState(slots: StreamSlot[]): void {
    try {
      const simpleSlots = slots.map((s) => ({
        index: s.index,
        url: s.url,
        title: s.title,
        type: s.type,
      }));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SLOTS, JSON.stringify(simpleSlots));
    } catch {
      // ignore
    }
  },

  getSavedSlotsState(): { index: number; url: string; title: string; type: StreamType }[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SLOTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
};
