/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomIframeAttributes } from '../types/stream';

export interface ParsedIframeResult {
  isValid: boolean;
  src: string;
  attributes: CustomIframeAttributes;
  error?: string;
  hostname?: string;
}

/**
 * Valid tokens allowed in iframe 'allow' feature policy attribute
 */
const ALLOWED_FEATURE_TOKENS = new Set([
  'accelerometer',
  'autoplay',
  'clipboard-read',
  'clipboard-write',
  'encrypted-media',
  'fullscreen',
  'gyroscope',
  'microphone',
  'camera',
  'picture-in-picture',
  'web-share',
  'screen-wake-lock',
]);

/**
 * Comprehensive safe default permissions for video/streaming embeds
 */
export const DEFAULT_EMBED_ALLOW =
  'accelerometer; autoplay; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';

/**
 * Checks if a string contains an HTML iframe snippet
 */
export function isIframeSnippet(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  return /<iframe\b[^>]*>/i.test(trimmed);
}

/**
 * Parses and sanitizes an iframe HTML snippet safely without executing scripts.
 */
export function parseIframeSnippet(input: string): ParsedIframeResult {
  const trimmed = input.trim();

  if (!isIframeSnippet(trimmed)) {
    return {
      isValid: false,
      src: '',
      attributes: {},
      error: 'El texto no contiene una etiqueta <iframe> válida.',
    };
  }

  // Use DOMParser in text/html mode (scripts are NOT executed inside DOMParser)
  try {
    let src = '';
    let rawAllow = '';
    let rawTitle = '';
    let rawReferrerPolicy: ReferrerPolicy = 'no-referrer-when-downgrade';
    let allowFullScreen = true;

    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');
      const iframeElement = doc.querySelector('iframe');

      if (!iframeElement) {
        return {
          isValid: false,
          src: '',
          attributes: {},
          error: 'No se pudo encontrar una etiqueta <iframe> en el código proporcionado.',
        };
      }

      src = (iframeElement.getAttribute('src') || '').trim();
      rawAllow = (iframeElement.getAttribute('allow') || '').trim();
      rawTitle = (iframeElement.getAttribute('title') || '').trim();

      const rp = iframeElement.getAttribute('referrerpolicy');
      if (rp) {
        rawReferrerPolicy = rp as ReferrerPolicy;
      }

      // Check allowfullscreen attribute
      if (
        iframeElement.hasAttribute('allowfullscreen') ||
        iframeElement.getAttribute('allowfullscreen') === 'true' ||
        iframeElement.getAttribute('webkitallowfullscreen') !== null
      ) {
        allowFullScreen = true;
      }
    } else {
      // Fallback regex parser for non-DOM/test environments
      const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
      src = srcMatch ? srcMatch[1] : '';

      const allowMatch = trimmed.match(/allow=["']([^"']+)["']/i);
      rawAllow = allowMatch ? allowMatch[1] : '';

      const titleMatch = trimmed.match(/title=["']([^"']+)["']/i);
      rawTitle = titleMatch ? titleMatch[1] : '';

      allowFullScreen = /allowfullscreen/i.test(trimmed);
    }

    if (!src) {
      return {
        isValid: false,
        src: '',
        attributes: {},
        error: 'El código iframe no contiene un atributo "src" con la URL del reproductor.',
      };
    }

    // Security validation: strictly reject javascript:, data:text/html, vbscript:, or other executable schemes
    const lowerSrc = src.toLowerCase();
    if (
      lowerSrc.startsWith('javascript:') ||
      lowerSrc.startsWith('data:') ||
      lowerSrc.startsWith('vbscript:') ||
      lowerSrc.includes('<script')
    ) {
      return {
        isValid: false,
        src: '',
        attributes: {},
        error: 'La URL del iframe contiene esquemas o scripts no permitidos por seguridad.',
      };
    }

    // Normalize protocol: must be HTTPS (or HTTP in local development)
    let validatedUrl = src;
    if (validatedUrl.startsWith('//')) {
      validatedUrl = 'https:' + validatedUrl;
    } else if (!/^https?:\/\//i.test(validatedUrl)) {
      validatedUrl = 'https://' + validatedUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(validatedUrl);
    } catch {
      return {
        isValid: false,
        src: '',
        attributes: {},
        error: 'La dirección URL contenida en el iframe no es válida.',
      };
    }

    // Sanitize 'allow' attribute: filter to recognized safe media permissions
    let sanitizedAllow = DEFAULT_EMBED_ALLOW;
    if (rawAllow) {
      const tokens = rawAllow
        .split(/[;,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => ALLOWED_FEATURE_TOKENS.has(t));

      if (tokens.length > 0) {
        // Always ensure essential media permissions are included
        const tokenSet = new Set(tokens);
        tokenSet.add('autoplay');
        tokenSet.add('fullscreen');
        sanitizedAllow = Array.from(tokenSet).join('; ');
      }
    }

    return {
      isValid: true,
      src: validatedUrl,
      hostname: parsedUrl.hostname.replace('www.', ''),
      attributes: {
        allow: sanitizedAllow,
        allowFullScreen,
        referrerPolicy: rawReferrerPolicy,
        title: rawTitle || undefined,
        originalSnippet: trimmed,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      src: '',
      attributes: {},
      error: `Error al procesar el código iframe: ${err?.message || 'Formato no válido'}`,
    };
  }
}
