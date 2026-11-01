/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ResolvedStreamData {
  status: 'success' | 'protected_or_blocked' | 'error';
  originalUrl: string;
  nestedIframe?: string | null;
  deepNestedIframe?: string | null;
  hlsPlaylist?: string | null;
  bestEmbedUrl?: string;
  cleanEmbedUrl?: string;
  message?: string;
}

export async function resolveStreamUrl(rawUrl: string): Promise<ResolvedStreamData | null> {
  try {
    const encoded = encodeURIComponent(rawUrl.trim());
    const res = await fetch(`/api/resolve-stream?url=${encoded}`);
    if (!res.ok) return null;
    const data: ResolvedStreamData = await res.json();
    if (data.status === 'success' && data.bestEmbedUrl) {
      data.cleanEmbedUrl = `/api/clean-embed?url=${encodeURIComponent(data.bestEmbedUrl)}`;
    }
    return data;
  } catch (err) {
    console.warn('Could not resolve stream via backend API:', err);
    return null;
  }
}
