/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedCandidate, ResolutionMethod, StreamDetectionResult, StreamType } from '../types/stream';
import { isIframeSnippet, parseIframeSnippet } from './iframeParser';

/**
 * Connects to the server-side metadata resolver to extract legitimate video player iframes
 * from a full webpage without violating CORS or same-origin policies in the client browser.
 */
export async function resolveEmbedCandidates(pageUrl: string): Promise<{
  success: boolean;
  candidates: EmbedCandidate[];
  pageTitle?: string;
  pageUrl?: string;
  reason?: string;
}> {
  try {
    const res = await fetch('/api/resolve-embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pageUrl }),
    });

    if (!res.ok) {
      return {
        success: false,
        candidates: [],
        reason: `Error HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: Boolean(data.success),
      candidates: data.candidates || [],
      pageTitle: data.pageTitle,
      pageUrl: data.pageUrl || pageUrl,
      reason: data.reason,
    };
  } catch (err: any) {
    return {
      success: false,
      candidates: [],
      reason: `No se pudo conectar con el servicio de resolución: ${err?.message || 'Error de red'}`,
    };
  }
}

/**
 * Detects and classifies the media source according to web architecture standards:
 * - iframe-embed: standalone embed document for iframe display or user-pasted <iframe> tag
 * - external-player: official platform embeds (YouTube, Twitch, Vimeo, Dailymotion)
 * - direct-media: direct video (.mp4/.webm) or streaming manifests (.m3u8 HLS / .mpd DASH)
 * - web-page: full HTML website / portal
 * - blob-resource: ephemeral local blob: URLs
 */
export function detectStreamSource(
  rawUrl: string,
  currentHost: string = window.location.hostname
): StreamDetectionResult {
  const url = rawUrl.trim();

  if (!url) {
    return {
      type: 'unsupported',
      classification: 'unsupported',
      originalUrl: '',
      embedUrl: '',
      title: 'URL vacía',
      resolutionMethod: 'resolution-failed',
      isEmbeddable: false,
      diagnosticCode: 'incompatible-resource',
      reason: 'Por favor introduce una dirección URL válida o un código <iframe>.',
    };
  }

  // 0. HTML Iframe Code Snippet Detection (<iframe ...></iframe>)
  if (isIframeSnippet(url)) {
    const parsedIframe = parseIframeSnippet(url);
    if (!parsedIframe.isValid) {
      return {
        type: 'unsupported',
        classification: 'unsupported',
        originalUrl: url,
        embedUrl: '',
        title: 'Código IFrame no válido',
        isEmbeddable: false,
        diagnosticCode: 'incompatible-resource',
        reason: parsedIframe.error || 'El código <iframe> no pudo ser procesado.',
      };
    }

    // Extract hostname and title
    let embedTitle = parsedIframe.attributes.title;
    try {
      const u = new URL(parsedIframe.src);
      if (!embedTitle) {
        embedTitle = formatEmbedTitle(u.pathname, u.hostname);
      }
    } catch {
      embedTitle = 'Reproductor IFrame Integrado';
    }

    return {
      type: 'iframe-embed',
      classification: 'iframe-embed',
      originalUrl: url,
      embedUrl: parsedIframe.src,
      title: embedTitle,
      resolutionMethod: 'manual-embed',
      customIframeAttributes: parsedIframe.attributes,
      isEmbeddable: true,
      reason: 'Código HTML <iframe> reconocido y sanitizado con éxito.',
    };
  }

  // 1. Blob Resource Detection
  // A blob: URL is ephemeral and bound strictly to the origin/context that instantiated it via URL.createObjectURL()
  if (url.startsWith('blob:')) {
    return {
      type: 'blob-resource',
      classification: 'blob-resource',
      originalUrl: url,
      embedUrl: '',
      title: 'Recurso Blob Local (No Transferible)',
      resolutionMethod: 'resolution-failed',
      isEmbeddable: false,
      diagnosticCode: 'incompatible-resource',
      reason: 'Las direcciones blob: son identificadores efímeros creados en la memoria local de la pestaña de origen.',
      guidance:
        'No es posible transferir un recurso blob: entre pestañas, dominios o recuadros distintos. Para visualizar este contenido en MULTIVIEW, introduce la URL del reproductor embed oficial o la dirección HLS (.m3u8) del stream.',
    };
  }

  // Normalize protocol
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return {
      type: 'unsupported',
      classification: 'unsupported',
      originalUrl: url,
      embedUrl: '',
      title: 'Enlace no válido',
      resolutionMethod: 'resolution-failed',
      isEmbeddable: false,
      diagnosticCode: 'incompatible-resource',
      reason: 'El formato de la URL no es válido.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 2. YouTube Detection (Official IFrame API)
  if (
    hostname.includes('youtube.com') ||
    hostname.includes('youtu.be') ||
    hostname.includes('youtube-nocookie.com')
  ) {
    let videoId = '';

    if (hostname.includes('youtu.be')) {
      videoId = pathname.slice(1).split('/')[0].split('?')[0];
    } else if (pathname.includes('/live/')) {
      const parts = pathname.split('/live/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    } else if (pathname.includes('/shorts/')) {
      const parts = pathname.split('/shorts/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    } else if (pathname.includes('/embed/')) {
      const parts = pathname.split('/embed/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    } else {
      videoId = parsed.searchParams.get('v') || '';
    }

    if (videoId) {
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&playsinline=1&controls=1&rel=0&origin=${encodeURIComponent(
        window.location.origin
      )}`;

      return {
        type: 'youtube',
        classification: 'external-player',
        originalUrl: url,
        embedUrl,
        title: `YouTube: ${videoId}`,
        resolutionMethod: 'official-embed',
        videoId,
        isEmbeddable: true,
      };
    }
  }

  // 3. Twitch Detection (Interactive Embed)
  if (hostname.includes('twitch.tv')) {
    const parentHost = currentHost || 'localhost';
    if (pathname.includes('/videos/')) {
      const videoId = pathname.split('/videos/')[1]?.split('/')[0] || '';
      if (videoId) {
        return {
          type: 'twitch',
          classification: 'external-player',
          originalUrl: url,
          embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${parentHost}&autoplay=true&muted=true`,
          title: `Twitch Video: ${videoId}`,
          resolutionMethod: 'official-embed',
          videoId,
          isEmbeddable: true,
        };
      }
    } else {
      const channel = pathname.split('/')[1]?.split('?')[0] || '';
      if (channel && channel !== 'directory' && channel !== 'p') {
        return {
          type: 'twitch',
          classification: 'external-player',
          originalUrl: url,
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${parentHost}&autoplay=true&muted=true`,
          title: `Twitch: ${channel}`,
          resolutionMethod: 'official-embed',
          channel,
          isEmbeddable: true,
        };
      }
    }
  }

  // 4. Vimeo Detection
  if (hostname.includes('vimeo.com')) {
    const match = pathname.match(/\/(?:video\/)?([0-9]+)/);
    const videoId = match ? match[1] : '';
    if (videoId) {
      return {
        type: 'vimeo',
        classification: 'external-player',
        originalUrl: url,
        embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&dnt=1&playsinline=1`,
        title: `Vimeo: ${videoId}`,
        resolutionMethod: 'official-embed',
        videoId,
        isEmbeddable: true,
      };
    }
  }

  // 5. Dailymotion Detection
  if (hostname.includes('dailymotion.com') || hostname.includes('dai.ly')) {
    let videoId = '';
    if (hostname.includes('dai.ly')) {
      videoId = pathname.slice(1).split('?')[0];
    } else if (pathname.includes('/video/')) {
      videoId = pathname.split('/video/')[1]?.split('?')[0]?.split('_')[0] || '';
    }
    if (videoId) {
      return {
        type: 'dailymotion',
        classification: 'external-player',
        originalUrl: url,
        embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1`,
        title: `Dailymotion: ${videoId}`,
        resolutionMethod: 'official-embed',
        videoId,
        isEmbeddable: true,
      };
    }
  }

  // 6. Direct HLS Stream (.m3u8)
  if (pathname.endsWith('.m3u8') || url.includes('.m3u8')) {
    return {
      type: 'hls',
      classification: 'direct-media',
      originalUrl: url,
      embedUrl: url,
      title: getFileNameFromUrl(pathname, 'HLS Live Stream'),
      resolutionMethod: 'direct-media',
      isEmbeddable: true,
    };
  }

  // 7. Direct MPEG-DASH Stream (.mpd)
  if (pathname.endsWith('.mpd') || url.includes('.mpd')) {
    return {
      type: 'dash',
      classification: 'direct-media',
      originalUrl: url,
      embedUrl: url,
      title: getFileNameFromUrl(pathname, 'MPEG-DASH Stream'),
      resolutionMethod: 'direct-media',
      isEmbeddable: true,
    };
  }

  // 8. Direct HTML5 Video (.mp4, .webm, .ogg, .mov, .m4v)
  if (
    /\.(mp4|webm|ogg|ogv|mov|m4v)($|\?)/i.test(pathname) ||
    /\.(mp4|webm|ogg|ogv|mov|m4v)($|\?)/i.test(url)
  ) {
    return {
      type: 'html5',
      classification: 'direct-media',
      originalUrl: url,
      embedUrl: url,
      title: getFileNameFromUrl(pathname, 'Video HTML5'),
      resolutionMethod: 'direct-media',
      isEmbeddable: true,
    };
  }

  // 9. Embed Documents specifically intended for iframe inclusion (e.g. /embed/, /event/, aurasportsplayer, streamec embed endpoints)
  const isEmbedDocument =
    pathname.includes('/embed/') ||
    pathname.startsWith('/embed') ||
    pathname.includes('/event/') ||
    hostname.includes('aurasports') ||
    hostname.includes('aurasportsplayer') ||
    hostname.includes('embedcenter') ||
    hostname.includes('streamscenter') ||
    hostname.includes('streamec') ||
    hostname.includes('voodc') ||
    hostname.includes('embedstream');

  if (isEmbedDocument) {
    const title = formatEmbedTitle(pathname, hostname);
    return {
      type: 'iframe-embed',
      classification: 'iframe-embed',
      originalUrl: url,
      embedUrl: normalizedUrl,
      title,
      resolutionMethod: 'official-embed',
      isEmbeddable: true,
      reason: 'Documento embed externo diseñado para inserción iframe.',
    };
  }

  // 10. Web Page / Portal (Full HTML page that contains navigation, headers, scripts, or nested players)
  const isWebPage =
    hostname.includes('tvsportslive') ||
    hostname.includes('rojadirecta') ||
    hostname.includes('streameast') ||
    hostname.includes('tarjetaroja') ||
    hostname.includes('sportshub') ||
    pathname.includes('-vs-') ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.htm') ||
    pathname === '/' ||
    pathname === '';

  const pageTitle = formatWebPageTitle(pathname, hostname);

  return {
    type: 'web-page',
    classification: 'web-page',
    originalUrl: url,
    embedUrl: normalizedUrl,
    pageUrl: normalizedUrl,
    title: pageTitle,
    resolutionMethod: 'web-page',
    isEmbeddable: true,
    reason:
      'Página web completa. Contiene interfaz web, scripts y posibles reproductores anidados.',
    guidance:
      'Si la página no carga el reproductor directamente o bloquea el marco, utiliza la búsqueda automática de reproductor o introduce manualmente la URL del embed.',
  };
}

function formatEmbedTitle(pathname: string, hostname: string): string {
  try {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const segments = cleanPath.split('/');
    const lastSegment = segments[segments.length - 1] || '';

    if (hostname.includes('aurasports')) {
      const cleanEvent = lastSegment.replace(/^event-|^espn-/i, 'ESPN Event ');
      return `AuraSports ${cleanEvent} (${hostname.replace('www.', '')})`;
    }

    const chMatch = lastSegment.match(/ch(?:annel)?[-_]?([0-9]+)/i);
    if (chMatch) {
      return `Canal Embed CH-${chMatch[1]} (${hostname.replace('www.', '')})`;
    }

    if (lastSegment && lastSegment !== 'embed') {
      const cleanName = lastSegment.replace(/\.php|\.html/g, '');
      return `Embed: ${cleanName} (${hostname.replace('www.', '')})`;
    }
  } catch {
    // fallback
  }
  return `Reproductor Embed (${hostname.replace('www.', '')})`;
}

function formatWebPageTitle(pathname: string, hostname: string): string {
  try {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const segments = cleanPath.split('/');
    const lastSegment = segments[segments.length - 1] || '';

    if (lastSegment.includes('-vs-')) {
      const [teamA, teamB] = lastSegment.split('-vs-');
      const formatTeam = (str: string) =>
        str
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

      return `${formatTeam(teamA)} vs. ${formatTeam(teamB)}`;
    }

    if (lastSegment) {
      return (
        lastSegment
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') + ` (${hostname.replace('www.', '')})`
      );
    }
  } catch {
    // fallback
  }
  return `Portal Web (${hostname.replace('www.', '')})`;
}

function getFileNameFromUrl(pathname: string, fallback: string): string {
  try {
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.length > 2) {
      return decodeURIComponent(last.split('?')[0]);
    }
  } catch {
    // fallback
  }
  return fallback;
}

/**
 * Verified test streams and presets across all supported formats
 */
export const SAMPLE_STREAMS = [
  {
    name: 'AuraSports ESPN Live (Caso 401873036)',
    category: 'Embed',
    url: 'https://play.aurasportsplayer.cfd/event/espn-401873036',
    type: 'iframe-embed' as StreamType,
    badge: 'IFrame Embed',
  },
  {
    name: 'Big Buck Bunny (MP4 Direct 1080p)',
    category: 'HTML5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'html5' as StreamType,
    badge: 'Direct MP4',
  },
  {
    name: 'Sintel Tears of Steel (HLS Test)',
    category: 'HLS',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls' as StreamType,
    badge: 'HLS .m3u8',
  },
  {
    name: 'Big Buck Bunny (HLS Akamai Live)',
    category: 'HLS',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    type: 'hls' as StreamType,
    badge: 'HLS Live',
  },
  {
    name: 'Elephants Dream (MP4 HD Direct)',
    category: 'HTML5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'html5' as StreamType,
    badge: 'Direct MP4',
  },
  {
    name: 'NASA Live (YouTube Oficial)',
    category: 'YouTube',
    url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
    type: 'youtube' as StreamType,
    badge: 'YouTube Live',
  },
  {
    name: 'Lo-Fi Girl — Relax / Study (YouTube)',
    category: 'YouTube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    type: 'youtube' as StreamType,
    badge: 'YouTube Stream',
  },
  {
    name: 'Twitch Esports (Riot Games)',
    category: 'Twitch',
    url: 'https://www.twitch.tv/riotgames',
    type: 'twitch' as StreamType,
    badge: 'Twitch Live',
  },
  {
    name: 'Vimeo Creative Showreel',
    category: 'Vimeo',
    url: 'https://vimeo.com/76979871',
    type: 'vimeo' as StreamType,
    badge: 'Vimeo HD',
  },
  {
    name: 'AuraSports Player Embed (ESPN Event)',
    category: 'Embed',
    url: 'https://play.aurasportsplayer.cfd/event/espn-401873036',
    type: 'iframe-embed' as StreamType,
    badge: 'AuraSports Embed',
  },
  {
    name: 'StreamEC Embed CH-32 (streamec.st)',
    category: 'Embed',
    url: 'https://streamec.st/embed/ch32.php',
    type: 'iframe-embed' as StreamType,
    badge: 'Embed Doc',
  },
  {
    name: 'Baltimore Ravens vs Buffalo Bills (tvsportslive.fr)',
    category: 'Web',
    url: 'https://tvsportslive.fr/baltimore-ravens-vs-buffalo-bills/',
    type: 'web-page' as StreamType,
    badge: 'Página Web',
  },
];
