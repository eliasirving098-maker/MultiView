/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderAdapterConfig, StreamType } from '../types/stream';

/**
 * Provider-specific configurations following web integration standards.
 * Universal sandbox is strictly NOT applied because it breaks cross-origin subframes and workers.
 */
export const PROVIDER_CONFIGS: Record<StreamType, ProviderAdapterConfig> = {
  youtube: {
    providerId: 'youtube',
    providerName: 'YouTube Official IFrame API',
    classification: 'external-player',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    referrerPolicy: 'origin-when-cross-origin',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: true,
  },
  twitch: {
    providerId: 'twitch',
    providerName: 'Twitch Interactive Embed',
    classification: 'external-player',
    allow: 'autoplay; fullscreen',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: false,
  },
  vimeo: {
    providerId: 'vimeo',
    providerName: 'Vimeo Player SDK',
    classification: 'external-player',
    allow: 'autoplay; fullscreen; picture-in-picture',
    referrerPolicy: 'origin',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: true,
  },
  dailymotion: {
    providerId: 'dailymotion',
    providerName: 'Dailymotion Player Embed',
    classification: 'external-player',
    allow: 'autoplay; fullscreen; webkitallowfullscreen; mozallowfullscreen',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: false,
  },
  hls: {
    providerId: 'hls',
    providerName: 'HLS Media Stream (hls.js)',
    classification: 'direct-media',
    allow: '',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: true,
  },
  dash: {
    providerId: 'dash',
    providerName: 'MPEG-DASH Stream (dash.js)',
    classification: 'direct-media',
    allow: '',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: true,
  },
  html5: {
    providerId: 'html5',
    providerName: 'HTML5 Native Media Video',
    classification: 'direct-media',
    allow: '',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: true,
    isObservable: true,
  },
  'iframe-embed': {
    providerId: 'iframe-embed',
    providerName: 'Documento Embed Autorizado',
    classification: 'iframe-embed',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: false,
    isObservable: false,
    // Note: sandbox is deliberately omitted so nested players, workers, and CDN loaders function properly
  },
  'web-page': {
    providerId: 'web-page',
    providerName: 'Portal / Página Web Completa',
    classification: 'web-page',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
    hasControlApi: false,
    isObservable: false,
  },
  'blob-resource': {
    providerId: 'blob-resource',
    providerName: 'Recurso Blob Efímero',
    classification: 'blob-resource',
    allow: '',
    referrerPolicy: 'no-referrer',
    allowFullScreen: false,
    hasControlApi: false,
    isObservable: false,
  },
  unsupported: {
    providerId: 'unsupported',
    providerName: 'Formato No Reconocido',
    classification: 'unsupported',
    allow: '',
    referrerPolicy: 'no-referrer',
    allowFullScreen: false,
    hasControlApi: false,
    isObservable: false,
  },
};

export function getProviderConfig(type: StreamType): ProviderAdapterConfig {
  return PROVIDER_CONFIGS[type] || PROVIDER_CONFIGS.unsupported;
}
