/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  const ipParts = lower.split('.').map((p) => parseInt(p, 10));
  if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (ipParts[0] === 10) return true;
    if (ipParts[0] === 127) return true;
    if (ipParts[0] === 169 && ipParts[1] === 254) return true;
    if (ipParts[0] === 192 && ipParts[1] === 168) return true;
    if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) return true;
  }
  return false;
}

const AD_AND_TRACKING_PATTERNS = [
  'google',
  'doubleclick',
  'facebook',
  'twitter',
  'disqus',
  'recaptcha',
  'adservice',
  'taboola',
  'outbrain',
  'popads',
  'syndication',
  'amazon-adsystem',
  'analytics',
  'histats',
  'googletagmanager',
  'googlesyndication',
  'adsco',
  'bidvertiser',
  'trafficjunky',
  'yandex',
  'scorecardresearch',
  'widget',
  'adsystem',
  'adserver',
  'banner',
  'pixel',
  'advert',
  'sponsor',
  'affiliate',
];

const VIDEO_KEYWORD_PATTERNS = [
  'embed',
  'player',
  'stream',
  'video',
  'live',
  'event',
  'm3u8',
  'hls',
  'aurasports',
  'aurasportsplayer',
  'streamec',
  'streamscenter',
  'embedcenter',
  'voodc',
  'embedstream',
  'youtube',
  'vimeo',
  'dailymotion',
  'twitch',
  'ok.ru',
  'clappr',
  'jwplayer',
  'flowplayer',
  'videojs',
  'playerjs',
  'play',
  'channel',
];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health and info endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', engine: 'multiview-v2' });
  });

  // Legitimate server-side metadata and iframe embed resolution endpoint
  app.post('/api/resolve-embed', async (req, res) => {
    const rawUrl = (req.body?.url || '').trim();

    if (!rawUrl) {
      return res.status(400).json({
        success: false,
        reason: 'Se requiere una dirección URL válida.',
      });
    }

    let parsedUrl: URL;
    try {
      let normalized = rawUrl;
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = 'https://' + normalized;
      }
      parsedUrl = new URL(normalized);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({
          success: false,
          reason: 'Solo se admiten protocolos HTTP o HTTPS.',
        });
      }
      if (isPrivateOrLocalHost(parsedUrl.hostname)) {
        return res.status(403).json({
          success: false,
          reason: 'Dirección IP o host local no permitido por políticas de seguridad.',
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        reason: 'Formato de dirección URL no válido.',
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(parsedUrl.href, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.json({
          success: false,
          statusCode: response.status,
          reason: `El servidor de origen respondió con código HTTP ${response.status} (${response.statusText}).`,
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        // If the URL directly returns video or HLS manifest
        if (
          contentType.includes('application/vnd.apple.mpegurl') ||
          contentType.includes('application/x-mpegurl') ||
          parsedUrl.pathname.endsWith('.m3u8')
        ) {
          return res.json({
            success: true,
            isDirectMedia: true,
            type: 'hls',
            embedUrl: parsedUrl.href,
            pageTitle: 'Stream HLS Directo',
            candidates: [
              {
                id: 'direct-hls',
                url: parsedUrl.href,
                title: 'Señal HLS (.m3u8)',
                sourceHostname: parsedUrl.hostname,
                type: 'hls',
                confidence: 'high',
                note: 'Manifiesto HLS detectado directamente',
              },
            ],
          });
        }

        if (contentType.includes('video/') || /\.(mp4|webm|ogv)($|\?)/i.test(parsedUrl.pathname)) {
          return res.json({
            success: true,
            isDirectMedia: true,
            type: 'html5',
            embedUrl: parsedUrl.href,
            pageTitle: 'Archivo de Video Directo',
            candidates: [
              {
                id: 'direct-video',
                url: parsedUrl.href,
                title: 'Archivo Video HTML5',
                sourceHostname: parsedUrl.hostname,
                type: 'html5',
                confidence: 'high',
                note: 'Archivo multimedia directo',
              },
            ],
          });
        }
      }

      // Read HTML text (limit to 1.5MB max)
      const text = await response.text();
      const htmlSnippet = text.slice(0, 1500000);

      // Extract page title
      const titleMatch = htmlSnippet.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

      // Extract iframe candidates
      const iframeRegex = /<iframe\b([^>]*)>/gi;
      let match: RegExpExecArray | null;
      const candidates: any[] = [];
      const seenUrls = new Set<string>();

      while ((match = iframeRegex.exec(htmlSnippet)) !== null) {
        const attrs = match[1];
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (!srcMatch || !srcMatch[1]) continue;

        let src = srcMatch[1].trim();
        if (!src || src.startsWith('javascript:') || src.startsWith('about:')) continue;

        // Resolve relative URLs to absolute
        try {
          src = new URL(src, parsedUrl.href).href;
        } catch {
          continue;
        }

        // Deduplicate
        if (seenUrls.has(src)) continue;
        seenUrls.add(src);

        const lowerSrc = src.toLowerCase();

        // Filter out ads and analytics
        const isAdOrTracker = AD_AND_TRACKING_PATTERNS.some((pattern) =>
          lowerSrc.includes(pattern)
        );
        if (isAdOrTracker) continue;

        // Extract attributes
        const titleAttrMatch = attrs.match(/title=["']([^"']+)["']/i);
        const allowAttrMatch = attrs.match(/allow=["']([^"']+)["']/i);
        const widthMatch = attrs.match(/width=["']([^"']+)["']/i);
        const heightMatch = attrs.match(/height=["']([^"']+)["']/i);

        // Check video confidence
        const hasVideoKeyword = VIDEO_KEYWORD_PATTERNS.some((k) => lowerSrc.includes(k));
        const hasVideoAllow =
          attrs.includes('allowfullscreen') ||
          (allowAttrMatch &&
            (allowAttrMatch[1].includes('autoplay') ||
              allowAttrMatch[1].includes('encrypted-media')));

        const confidence: 'high' | 'medium' | 'low' =
          hasVideoKeyword && hasVideoAllow
            ? 'high'
            : hasVideoKeyword || hasVideoAllow
            ? 'medium'
            : 'low';

        // Discard low confidence if not matching any video criteria
        if (confidence === 'low') continue;

        const candidateUrlObj = new URL(src);
        const candidateHost = candidateUrlObj.hostname.replace('www.', '');

        let itemTitle = titleAttrMatch ? titleAttrMatch[1].trim() : '';
        if (!itemTitle) {
          const pathSegments = candidateUrlObj.pathname.split('/').filter(Boolean);
          const lastSeg = pathSegments[pathSegments.length - 1] || '';
          itemTitle = `Reproductor ${candidateHost} (${lastSeg || 'Embed'})`;
        }

        candidates.push({
          id: `candidate-${candidates.length + 1}`,
          url: src,
          title: itemTitle,
          sourceHostname: candidateHost,
          type: 'iframe-embed',
          width: widthMatch ? widthMatch[1] : '100%',
          height: heightMatch ? heightMatch[1] : '100%',
          allow:
            allowAttrMatch && allowAttrMatch[1]
              ? allowAttrMatch[1]
              : 'accelerometer; autoplay; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
          confidence,
          note:
            confidence === 'high'
              ? 'Reproductor con alta probabilidad (proveedor de video autorizado)'
              : 'Iframe interactivo detectado en la página',
        });
      }

      // Also search for direct m3u8 sources declared inside scripts
      const m3u8Regex = /(?:source|file|src|url)\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi;
      let m3u8Match: RegExpExecArray | null;
      while ((m3u8Match = m3u8Regex.exec(htmlSnippet)) !== null) {
        const streamUrl = m3u8Match[1];
        if (!seenUrls.has(streamUrl)) {
          seenUrls.add(streamUrl);
          const u = new URL(streamUrl);
          candidates.unshift({
            id: `hls-${candidates.length + 1}`,
            url: streamUrl,
            title: `Señal HLS Directa (${u.hostname})`,
            sourceHostname: u.hostname.replace('www.', ''),
            type: 'hls',
            confidence: 'high',
            note: 'URL de señal .m3u8 encontrada en el script de la página',
          });
        }
      }

      if (candidates.length > 0) {
        return res.json({
          success: true,
          pageTitle,
          pageUrl: parsedUrl.href,
          candidates,
        });
      }

      return res.json({
        success: false,
        pageTitle,
        pageUrl: parsedUrl.href,
        reason:
          'No se identificaron iframes o reproductores multimedia autorizados en el código HTML de esta página.',
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return res.json({
          success: false,
          reason: 'Tiempo de espera agotado (6s) al consultar la página remota.',
        });
      }
      return res.json({
        success: false,
        reason: `No fue posible inspeccionar la página: ${err?.message || 'Error de conexión'}`,
      });
    }
  });

  // Mount Vite or serve static assets
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MULTIVIEW Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[MULTIVIEW Server] Failed to start:', err);
});
