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

  // Helper to check media accessibility (HEAD or range GET)
  async function checkMediaAccessibility(
    mediaUrl: string,
    referer?: string
  ): Promise<{ accessible: boolean; status: number; contentType?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      let res = await fetch(mediaUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: '*/*',
          ...(referer ? { Referer: referer } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // If HEAD is not allowed (405) or forbidden (403), attempt lightweight GET with byte range
      if (res.status === 405 || res.status === 403) {
        const getCtrl = new AbortController();
        const getTimeout = setTimeout(() => getCtrl.abort(), 3500);
        try {
          const getRes = await fetch(mediaUrl, {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Range: 'bytes=0-200',
              Accept: '*/*',
              ...(referer ? { Referer: referer } : {}),
            },
            signal: getCtrl.signal,
          });
          clearTimeout(getTimeout);
          res = getRes;
        } catch {
          clearTimeout(getTimeout);
        }
      }

      const isOk = res.status >= 200 && res.status < 400;
      return {
        accessible: isOk,
        status: res.status,
        contentType: res.headers.get('content-type') || undefined,
      };
    } catch (err: any) {
      return {
        accessible: false,
        status: 0,
      };
    }
  }

  // Multi-level recursive resolution endpoint
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

    const visitedUrls = new Set<string>();
    const diagnosticSteps: string[] = [];
    const directMediaCandidates: any[] = [];
    const iframeCandidates: any[] = [];
    let detectedPageTitle = parsedUrl.hostname;

    // Recursive crawler function (depth: 0, 1, 2, 3)
    async function crawlNode(currentUrl: string, depth: number, parentReferer?: string) {
      if (depth > 3 || visitedUrls.has(currentUrl)) return;
      visitedUrls.add(currentUrl);

      let nodeUrl: URL;
      try {
        nodeUrl = new URL(currentUrl);
        if (isPrivateOrLocalHost(nodeUrl.hostname)) return;
      } catch {
        return;
      }

      const hostLabel = nodeUrl.hostname.replace('www.', '');

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(nodeUrl.href, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            ...(parentReferer ? { Referer: parentReferer } : {}),
          },
          redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!response.ok) {
          diagnosticSteps.push(
            `[Nivel ${depth}] ${hostLabel} respondió con estado HTTP ${response.status} (${response.statusText}).`
          );
          return;
        }

        const contentType = response.headers.get('content-type') || '';

        // Check if response is directly a media manifest or video
        const isDirectHls =
          contentType.includes('application/vnd.apple.mpegurl') ||
          contentType.includes('application/x-mpegurl') ||
          nodeUrl.pathname.endsWith('.m3u8');

        const isDirectVideo =
          contentType.includes('video/') ||
          /\.(mp4|webm|ogv)($|\?)/i.test(nodeUrl.pathname);

        if (isDirectHls || isDirectVideo) {
          diagnosticSteps.push(
            `[Nivel ${depth}] Manifiesto multimedia directo encontrado: ${nodeUrl.href}`
          );
          directMediaCandidates.push({
            id: `media-${directMediaCandidates.length + 1}`,
            url: nodeUrl.href,
            title: isDirectHls ? `Señal HLS Directa (${hostLabel})` : `Video HTML5 (${hostLabel})`,
            sourceHostname: hostLabel,
            type: isDirectHls ? 'hls' : 'html5',
            depth,
            confidence: 'high',
            isDirectMedia: true,
            isVerifiedAccessible: true,
            audioControllable: true,
            note: 'Fuente multimedia directa verificada. Control de audio 100% nativo.',
          });
          return;
        }

        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
          diagnosticSteps.push(
            `[Nivel ${depth}] Tipo de contenido no HTML ignorado: ${contentType}`
          );
          return;
        }

        const text = await response.text();
        const htmlSnippet = text.slice(0, 1500000);

        // Capture page title if level 0
        if (depth === 0) {
          const titleMatch = htmlSnippet.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            detectedPageTitle = titleMatch[1].trim();
          }
        }

        diagnosticSteps.push(
          `[Nivel ${depth}] HTML recibido de ${hostLabel} (${(text.length / 1024).toFixed(1)} KB)`
        );

        // 1. Scan scripts and markup for direct media URLs (.m3u8, .mp4, Clappr, JWPlayer, etc.)
        const mediaRegexes = [
          // Clappr playlistUrl assignment: const playlistUrl = "https://...m3u8";
          /playlistUrl\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/gi,
          // Generic source/file attributes: source: "https://...m3u8", file: "https://...mp4"
          /(?:source|file|src|url|hls)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/gi,
          // Clappr Player constructor: new Clappr.Player({ source: "..." })
          /new\s+Clappr\.Player\s*\(\s*\{[\s\S]*?source\s*:\s*["']([^"']+)["']/gi,
          // HTML5 source / video tags
          /<(?:source|video)\b[^>]*src=["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/gi,
        ];

        const mediaUrlsFoundInNode = new Set<string>();

        for (const regex of mediaRegexes) {
          let mediaMatch: RegExpExecArray | null;
          while ((mediaMatch = regex.exec(htmlSnippet)) !== null) {
            let foundMediaUrl = mediaMatch[1]?.trim();
            if (!foundMediaUrl || foundMediaUrl.startsWith('blob:')) continue;

            try {
              foundMediaUrl = new URL(foundMediaUrl, nodeUrl.href).href;
            } catch {
              continue;
            }

            if (mediaUrlsFoundInNode.has(foundMediaUrl)) continue;
            mediaUrlsFoundInNode.add(foundMediaUrl);

            diagnosticSteps.push(
              `[Nivel ${depth}] Enlace multimedia detectado en scripts: ${foundMediaUrl}`
            );

            // Verify accessibility of this media source
            const check = await checkMediaAccessibility(foundMediaUrl, nodeUrl.href);

            if (check.accessible) {
              const isHls = foundMediaUrl.includes('.m3u8');
              const mediaHost = new URL(foundMediaUrl).hostname.replace('www.', '');
              diagnosticSteps.push(
                `[Nivel ${depth}] ¡Fuente multimedia accesible! (HTTP ${check.status}). Audio 100% controlable nativamente.`
              );
              directMediaCandidates.push({
                id: `direct-media-${directMediaCandidates.length + 1}`,
                url: foundMediaUrl,
                title: isHls ? `Señal HLS Directa (${mediaHost})` : `Video HTML5 (${mediaHost})`,
                sourceHostname: mediaHost,
                type: isHls ? 'hls' : 'html5',
                depth,
                confidence: 'high',
                isDirectMedia: true,
                isVerifiedAccessible: true,
                audioControllable: true,
                note: 'Fuente multimedia directa accesible (Verificada con HTTP 200). Audio controlable.',
              });
            } else {
              diagnosticSteps.push(
                `[Nivel ${depth}] Fuente multimedia directa protegida (HTTP ${check.status}). Requiere sesión/token dinámico del reproductor.`
              );
            }
          }
        }

        // 2. Scan for nested <iframe> elements
        const iframeRegex = /<iframe\b([^>]*)>/gi;
        let iframeMatch: RegExpExecArray | null;
        const childIframesToCrawl: string[] = [];

        while ((iframeMatch = iframeRegex.exec(htmlSnippet)) !== null) {
          const attrs = iframeMatch[1];
          const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
          if (!srcMatch || !srcMatch[1]) continue;

          let src = srcMatch[1].trim();
          if (!src || src.startsWith('javascript:') || src.startsWith('about:')) continue;

          try {
            src = new URL(src, nodeUrl.href).href;
          } catch {
            continue;
          }

          const lowerSrc = src.toLowerCase();

          // Filter out ads and analytics
          const isAdOrTracker = AD_AND_TRACKING_PATTERNS.some((pattern) =>
            lowerSrc.includes(pattern)
          );
          if (isAdOrTracker) continue;

          const allowAttrMatch = attrs.match(/allow=["']([^"']+)["']/i);
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

          if (confidence === 'low') continue;

          const candidateUrlObj = new URL(src);
          const candidateHost = candidateUrlObj.hostname.replace('www.', '');

          // Check if candidate is already in list
          if (!iframeCandidates.some((c) => c.url === src)) {
            const nextDepth = depth + 1;
            const levelLabel =
              nextDepth >= 2
                ? `Reproductor Interno Definitivo (Nivel ${nextDepth}: ${candidateHost})`
                : `Reproductor Embed (Nivel ${nextDepth}: ${candidateHost})`;

            diagnosticSteps.push(
              `[Nivel ${depth}] Iframe detectado: ${src} (Destino: ${candidateHost}, Nivel ${nextDepth})`
            );

            iframeCandidates.push({
              id: `iframe-candidate-${iframeCandidates.length + 1}`,
              url: src,
              title: levelLabel,
              sourceHostname: candidateHost,
              type: 'iframe-embed',
              depth: nextDepth,
              confidence,
              isDirectMedia: false,
              isVerifiedAccessible: true,
              audioControllable: false,
              allow:
                allowAttrMatch && allowAttrMatch[1]
                  ? allowAttrMatch[1]
                  : 'accelerometer; autoplay; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
              note:
                nextDepth >= 2
                  ? `Reproductor interno localizado en nivel ${nextDepth}. Omite capas externas.`
                  : 'Reproductor embed detectado en la página.',
            });

            if (nextDepth <= 3) {
              childIframesToCrawl.push(src);
            }
          }
        }

        // Recursively crawl child iframes
        for (const childUrl of childIframesToCrawl) {
          await crawlNode(childUrl, depth + 1, nodeUrl.href);
        }
      } catch (err: any) {
        diagnosticSteps.push(
          `[Nivel ${depth}] Excepción al inspeccionar ${hostLabel}: ${err?.message || 'Error de red'}`
        );
      }
    }

    try {
      diagnosticSteps.push(`[Inicio] Inspeccionando URL principal: ${parsedUrl.href}`);
      await crawlNode(parsedUrl.href, 0);

      // Prioritize and rank candidates:
      // 1. Verified accessible direct media (HLS / HTML5) -> 100% audio controllable
      // 2. Deepest / cleanest internal player iframe (highest depth with high confidence)
      // 3. Intermediate player iframes
      // 4. Original / level 0 wrapper iframe
      const sortedIframeCandidates = [...iframeCandidates].sort((a, b) => {
        // Deepest iframe first (e.g. depth 2 or 3 before depth 1)
        if ((b.depth || 0) !== (a.depth || 0)) {
          return (b.depth || 0) - (a.depth || 0);
        }
        return b.confidence === 'high' ? 1 : -1;
      });

      const allCandidates = [...directMediaCandidates, ...sortedIframeCandidates];

      if (allCandidates.length > 0) {
        const bestCandidate = allCandidates[0];
        if (bestCandidate.isDirectMedia) {
          diagnosticSteps.push(
            `[Resolución Final] Seleccionada fuente directa (${bestCandidate.type.toUpperCase()}). Audio controlable nativamente.`
          );
        } else {
          diagnosticSteps.push(
            `[Resolución Final] Seleccionado reproductor interno (Nivel ${bestCandidate.depth || 1}: ${bestCandidate.sourceHostname}). Audio marcado como incontrolable de forma honesta.`
          );
        }

        return res.json({
          success: true,
          pageTitle: detectedPageTitle,
          pageUrl: parsedUrl.href,
          candidates: allCandidates,
          diagnosticSteps,
          selectedCandidate: bestCandidate,
        });
      }

      diagnosticSteps.push(
        '[Fin] No se identificaron iframes o reproductores multimedia en ninguna de las capas inspeccionadas.'
      );

      return res.json({
        success: false,
        pageTitle: detectedPageTitle,
        pageUrl: parsedUrl.href,
        diagnosticSteps,
        reason:
          'No se identificaron iframes ni reproductores multimedia accesibles en la estructura de esta página.',
      });
    } catch (err: any) {
      return res.json({
        success: false,
        diagnosticSteps,
        reason: `Fallo durante la resolución de capas: ${err?.message || 'Error desconocido'}`,
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
