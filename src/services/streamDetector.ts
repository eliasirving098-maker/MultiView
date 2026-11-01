/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StreamDetectionResult, StreamType } from '../types/stream';

/**
 * Detects the media source type and prepares appropriate embed / stream parameters.
 */
export function detectStreamSource(rawUrl: string, currentHost: string = window.location.hostname): StreamDetectionResult {
  const url = rawUrl.trim();

  if (!url) {
    return {
      type: 'unsupported',
      originalUrl: '',
      embedUrl: '',
      title: 'URL vacía',
      isEmbeddable: false,
      reason: 'Por favor introduce una dirección URL válida.',
    };
  }

  // Normalize protocol if missing
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    // If user enters youtu.be/... or twitch.tv/...
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return {
      type: 'unsupported',
      originalUrl: url,
      embedUrl: '',
      title: 'Enlace no válido',
      isEmbeddable: false,
      reason: 'El formato de la URL no es válido.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 1. YouTube Detection
  if (
    hostname.includes('youtube.com') ||
    hostname.includes('youtu.be') ||
    hostname.includes('youtube-nocookie.com')
  ) {
    let videoId = '';

    if (hostname.includes('youtu.be')) {
      // youtu.be/VIDEO_ID
      videoId = pathname.slice(1).split('/')[0].split('?')[0];
    } else if (pathname.includes('/live/')) {
      // youtube.com/live/VIDEO_ID
      const parts = pathname.split('/live/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    } else if (pathname.includes('/shorts/')) {
      // youtube.com/shorts/VIDEO_ID
      const parts = pathname.split('/shorts/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    } else if (pathname.includes('/embed/')) {
      // youtube.com/embed/VIDEO_ID
      const parts = pathname.split('/embed/');
      videoId = parts[1]?.split('/')[0]?.split('?')[0] || '';
    } else {
      // youtube.com/watch?v=VIDEO_ID
      videoId = parsed.searchParams.get('v') || '';
    }

    if (videoId) {
      const parentDomain = currentHost || 'localhost';
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&playsinline=1&controls=1&rel=0&origin=${encodeURIComponent(
        window.location.origin
      )}`;

      return {
        type: 'youtube',
        originalUrl: url,
        embedUrl,
        title: `YouTube: ${videoId}`,
        videoId,
        isEmbeddable: true,
      };
    }
  }

  // 2. Twitch Detection
  if (hostname.includes('twitch.tv')) {
    const parentHost = currentHost || 'localhost';
    // Check if video or channel
    if (pathname.includes('/videos/')) {
      const videoId = pathname.split('/videos/')[1]?.split('/')[0] || '';
      if (videoId) {
        return {
          type: 'twitch',
          originalUrl: url,
          embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${parentHost}&autoplay=true&muted=true`,
          title: `Twitch Video: ${videoId}`,
          videoId,
          isEmbeddable: true,
        };
      }
    } else {
      // Channel: twitch.tv/{channelName}
      const channel = pathname.split('/')[1]?.split('?')[0] || '';
      if (channel && channel !== 'directory' && channel !== 'p') {
        return {
          type: 'twitch',
          originalUrl: url,
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${parentHost}&autoplay=true&muted=true`,
          title: `Twitch: ${channel}`,
          channel,
          isEmbeddable: true,
        };
      }
    }
  }

  // 3. Vimeo Detection
  if (hostname.includes('vimeo.com')) {
    // vimeo.com/{id} or player.vimeo.com/video/{id}
    const match = pathname.match(/\/(?:video\/)?([0-9]+)/);
    const videoId = match ? match[1] : '';
    if (videoId) {
      return {
        type: 'vimeo',
        originalUrl: url,
        embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&dnt=1&playsinline=1`,
        title: `Vimeo: ${videoId}`,
        videoId,
        isEmbeddable: true,
      };
    }
  }

  // 4. Dailymotion Detection
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
        originalUrl: url,
        embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1`,
        title: `Dailymotion: ${videoId}`,
        videoId,
        isEmbeddable: true,
      };
    }
  }

  // 5. HLS Stream (.m3u8) Detection
  if (pathname.endsWith('.m3u8') || url.includes('.m3u8')) {
    return {
      type: 'hls',
      originalUrl: url,
      embedUrl: url,
      title: getFileNameFromUrl(pathname, 'HLS Live Stream'),
      isEmbeddable: true,
    };
  }

  // 6. MPEG-DASH (.mpd) Detection
  if (pathname.endsWith('.mpd') || url.includes('.mpd')) {
    return {
      type: 'dash',
      originalUrl: url,
      embedUrl: url,
      title: getFileNameFromUrl(pathname, 'MPEG-DASH Stream'),
      isEmbeddable: true,
    };
  }

  // 7. Direct HTML5 Video (.mp4, .webm, .ogg, .mov, .m4v)
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)($|\?)/i.test(pathname) || /\.(mp4|webm|ogg|ogv|mov|m4v)($|\?)/i.test(url)) {
    return {
      type: 'html5',
      originalUrl: url,
      embedUrl: url,
      title: getFileNameFromUrl(pathname, 'Video HTML5'),
      isEmbeddable: true,
    };
  }

  // 8. Sports Streaming & Event Portals / Embeds (streamec.st, tvsportslive.fr, embedcenter.st, rojadirecta, streameast, etc.)
  const isSportsPortal =
    hostname.includes('streamec') ||
    hostname.includes('embedcenter') ||
    hostname.includes('streamscenter') ||
    hostname.includes('tvsportslive') ||
    hostname.includes('rojadirecta') ||
    hostname.includes('streameast') ||
    hostname.includes('daddylive') ||
    hostname.includes('tarjetaroja') ||
    hostname.includes('sportshub') ||
    hostname.includes('viprow') ||
    hostname.includes('crackstream') ||
    hostname.includes('totalsportek') ||
    hostname.includes('voodc') ||
    hostname.includes('embedstream') ||
    (pathname.includes('/embed/') && !hostname.includes('youtube') && !hostname.includes('dailymotion')) ||
    pathname.includes('-vs-');

  if (isSportsPortal) {
    const matchTitle = formatSportsTitle(pathname, hostname);
    const isEmbedService =
      hostname.includes('streamec') ||
      hostname.includes('embedcenter') ||
      hostname.includes('streamscenter') ||
      hostname.includes('edgestream') ||
      hostname.includes('voodc') ||
      hostname.includes('embedstream') ||
      pathname.includes('/embed/');

    const embedUrl = isEmbedService
      ? `/api/proxy-player?url=${encodeURIComponent(normalizedUrl)}`
      : normalizedUrl;

    return {
      type: 'sports-portal',
      originalUrl: url,
      embedUrl,
      title: matchTitle,
      isEmbeddable: true,
      reason: isEmbedService
        ? 'Reproductor optimizado (filtro anti-bloqueo y sin anuncios activo).'
        : 'Portal deportivo detectado.',
    };
  }

  // 9. Generic Web Page / Other
  // Check if it's a generic web URL that might support iframe embedding
  return {
    type: 'iframe',
    originalUrl: url,
    embedUrl: normalizedUrl,
    title: hostname.replace('www.', ''),
    isEmbeddable: true,
    reason: 'Página web externa. Si el sitio bloquea la inserción (X-Frame-Options), puedes abrirlo externamente.',
  };
}

function formatSportsTitle(pathname: string, hostname: string): string {
  try {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const segments = cleanPath.split('/');
    const lastSegment = segments[segments.length - 1] || '';

    // Check channel numbers like ch32.php, ch-32, stream32
    const chMatch = lastSegment.match(/ch(?:annel)?[-_]?([0-9]+)/i);
    if (chMatch) {
      return `Canal Deportivo Live CH-${chMatch[1]} (${hostname.replace('www.', '')})`;
    }

    if (lastSegment.includes('-vs-')) {
      const [teamA, teamB] = lastSegment.split('-vs-');
      const formatTeam = (str: string) =>
        str
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

      return `${formatTeam(teamA)} vs. ${formatTeam(teamB)}`;
    }

    if (lastSegment && lastSegment !== 'embed') {
      const cleanName = lastSegment.replace(/\.php|\.html/g, '');
      return (
        cleanName
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') + ` (${hostname.replace('www.', '')})`
      );
    }
  } catch {
    // fallback
  }
  return `Deportes En Vivo (${hostname.replace('www.', '')})`;
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
    name: 'StreamEC Embed CH-32 (streamec.st)',
    category: 'Deportes',
    url: 'https://streamec.st/embed/ch32.php',
    type: 'sports-portal' as StreamType,
    badge: 'StreamEC Live',
  },
  {
    name: 'Baltimore Ravens vs Buffalo Bills (tvsportslive.fr)',
    category: 'Deportes',
    url: 'https://tvsportslive.fr/baltimore-ravens-vs-buffalo-bills/',
    type: 'sports-portal' as StreamType,
    badge: 'NFL tvsports',
  },
  {
    name: 'Baltimore Ravens vs Buffalo Bills (NFL Oficial)',
    category: 'Deportes',
    url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
    type: 'youtube' as StreamType,
    badge: 'NFL Feed HD',
  },
  {
    name: 'Big Buck Bunny (MP4 Full HD)',
    category: 'HTML5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'html5' as StreamType,
    badge: 'MP4 1080p',
  },
  {
    name: 'Sintel Tears of Steel (HLS Test)',
    category: 'HLS',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls' as StreamType,
    badge: 'HLS .m3u8',
  },
  {
    name: 'Big Buck Bunny (HLS Akamai)',
    category: 'HLS',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    type: 'hls' as StreamType,
    badge: 'HLS Live',
  },
  {
    name: 'Elephants Dream (MP4 HD)',
    category: 'HTML5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'html5' as StreamType,
    badge: 'MP4 HD',
  },
  {
    name: 'For Bigger Blazes (MP4 Demo)',
    category: 'HTML5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    type: 'html5' as StreamType,
    badge: 'MP4 Demo',
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
    name: 'Twitch Esports Channel (Riot Games)',
    category: 'Twitch',
    url: 'https://www.twitch.tv/riotgames',
    type: 'twitch' as StreamType,
    badge: 'Twitch Live',
  },
  {
    name: 'Vimeo Creative Video Showreel',
    category: 'Vimeo',
    url: 'https://vimeo.com/76979871',
    type: 'vimeo' as StreamType,
    badge: 'Vimeo HD',
  },
];
