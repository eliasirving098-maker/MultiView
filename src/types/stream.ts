/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SourceClassification =
  | 'external-player' // Official platforms with embed APIs (YouTube, Twitch, Vimeo, Dailymotion)
  | 'iframe-embed'    // Standalone embed documents meant for iframe insertion
  | 'direct-media'    // Direct media files (.mp4, .webm) and streaming protocols (.m3u8 HLS, .mpd DASH)
  | 'web-page'        // Full websites/portals that contain nested players, scripts, and navigation
  | 'blob-resource'   // Ephemeral local memory URLs (blob:...) that cannot be transferred
  | 'unsupported';

export type StreamType =
  | 'youtube'
  | 'twitch'
  | 'vimeo'
  | 'dailymotion'
  | 'hls'
  | 'dash'
  | 'html5'
  | 'iframe-embed'
  | 'web-page'
  | 'blob-resource'
  | 'unsupported';

export type DiagnosticCode =
  | 'none'
  | 'iframe-error'
  | 'embedding-forbidden'
  | 'initialization-error'
  | 'playback-error'
  | 'incompatible-resource'
  | 'network-error'
  | 'timeout'
  | 'unobservable-cross-origin';

export type SandboxMode = 'standard' | 'no-sandbox';

export interface CustomIframeAttributes {
  allow?: string;
  allowFullScreen?: boolean;
  referrerPolicy?: ReferrerPolicy;
  title?: string;
  originalSnippet?: string;
  sandboxMode?: SandboxMode;
}

export interface StreamSlot {
  id: string;
  index: number; // 0 to 5
  url: string;
  originalInput: string;
  title: string;
  type: StreamType;
  classification: SourceClassification;
  embedUrl?: string;
  customIframeAttributes?: CustomIframeAttributes;
  manualOverrideType?: StreamType;
  sandboxMode?: SandboxMode;
  videoId?: string;
  channel?: string;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number; // 0 to 1
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'external-loaded' | 'error';
  diagnosticCode: DiagnosticCode;
  errorMessage?: string;
  aspectRatio: 'contain' | 'cover' | '16/9';
  reloadKey: number;
}

export interface StreamDetectionResult {
  type: StreamType;
  classification: SourceClassification;
  originalUrl: string;
  embedUrl: string;
  title: string;
  customIframeAttributes?: CustomIframeAttributes;
  sandboxMode?: SandboxMode;
  videoId?: string;
  channel?: string;
  isEmbeddable: boolean;
  diagnosticCode?: DiagnosticCode;
  reason?: string;
  guidance?: string;
}

export interface ProviderAdapterConfig {
  providerId: string;
  providerName: string;
  classification: SourceClassification;
  allow: string;
  referrerPolicy: ReferrerPolicy;
  allowFullScreen: boolean;
  hasControlApi: boolean;
  isObservable: boolean;
  sandbox?: string;
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
  classification: SourceClassification;
  timestamp: number;
}

export type GridMode = 'standard' | 'hero';
