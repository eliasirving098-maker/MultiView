/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StreamType =
  | 'youtube'
  | 'twitch'
  | 'vimeo'
  | 'dailymotion'
  | 'hls'
  | 'dash'
  | 'html5'
  | 'iframe'
  | 'sports-portal'
  | 'unsupported';

export interface StreamSlot {
  id: string;
  index: number; // 0 to 5
  url: string;
  originalInput: string;
  title: string;
  type: StreamType;
  embedUrl?: string;
  videoId?: string;
  channel?: string;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number; // 0 to 1
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  errorMessage?: string;
  aspectRatio: 'contain' | 'cover' | '16/9';
  reloadKey: number;
  resolvedHls?: string;
  resolvedEmbed?: string;
}

export interface StreamDetectionResult {
  type: StreamType;
  originalUrl: string;
  embedUrl: string;
  title: string;
  videoId?: string;
  channel?: string;
  isEmbeddable: boolean;
  reason?: string;
}

export interface PresetStreamConfig {
  index: number;
  url: string;
  title: string;
  type: StreamType;
}

export interface SavedPreset {
  id: string;
  name: string;
  category: 'Fútbol' | 'Noticias' | 'Monitoreo' | 'Entretenimiento' | 'Personalizado';
  streamCount: number;
  streams: PresetStreamConfig[];
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  type: StreamType;
  timestamp: number;
}

export type GridMode = 'standard' | 'hero';
