/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // CORS headers for API
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  /**
   * API: Resolve sports portals and nested stream embeds (e.g. streamec.st, embedcenter.st, tvsportslive.fr)
   */
  app.get('/api/resolve-stream', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Falta el parámetro url' });
    }

    try {
      let targetUrl = rawUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Referer: 'https://tvsportslive.fr/',
      };

      // 1. Fetch first layer
      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
      });

      if (!response.ok) {
        return res.json({
          status: 'protected_or_blocked',
          statusText: `El servidor respondió con código ${response.status}`,
          originalUrl: targetUrl,
        });
      }

      const html = await response.text();

      // Look for iframes
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      let nestedIframe = iframeMatch ? iframeMatch[1] : null;

      // Normalize protocol-relative URL (e.g. //embedcenter.st/...)
      if (nestedIframe && nestedIframe.startsWith('//')) {
        nestedIframe = 'https:' + nestedIframe;
      } else if (nestedIframe && nestedIframe.startsWith('/')) {
        const parsedBase = new URL(targetUrl);
        nestedIframe = `${parsedBase.origin}${nestedIframe}`;
      }

      let deepNestedIframe: string | null = null;
      let hlsPlaylist: string | null = null;

      // Check if there is an HLS playlist right inside the first HTML
      const m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i) || html.match(/playlistUrl\s*=\s*["']([^"']+)["']/i);
      if (m3u8Match) {
        hlsPlaylist = m3u8Match[1];
      }

      // 2. If there's a nested iframe, inspect it too (e.g. embedcenter.st)
      if (nestedIframe && !hlsPlaylist) {
        try {
          const subRes = await fetch(nestedIframe, {
            headers: {
              ...headers,
              Referer: targetUrl,
            },
            redirect: 'follow',
          });

          if (subRes.ok) {
            const subHtml = await subRes.text();
            const subIframeMatch = subHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (subIframeMatch) {
              let subUrl = subIframeMatch[1];
              if (subUrl.startsWith('//')) subUrl = 'https:' + subUrl;
              deepNestedIframe = subUrl;

              // Inspect deep iframe (e.g. hls_co.php)
              try {
                const deepRes = await fetch(deepNestedIframe, {
                  headers: {
                    ...headers,
                    Referer: nestedIframe,
                  },
                });
                if (deepRes.ok) {
                  const deepHtml = await deepRes.text();
                  const deepM3u8 = deepHtml.match(/playlistUrl\s*=\s*["']([^"']+)["']/i) || deepHtml.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
                  if (deepM3u8) {
                    hlsPlaylist = deepM3u8[1];
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }
      }

      return res.json({
        status: 'success',
        originalUrl: targetUrl,
        nestedIframe,
        deepNestedIframe,
        hlsPlaylist,
        bestEmbedUrl: deepNestedIframe || nestedIframe || targetUrl,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'error',
        message: err?.message || 'Error al resolver la transmisión',
      });
    }
  });

  /**
   * API: Proxy and Neutralize Player (fixes false positive anti-sandbox blocker)
   */
  app.get('/api/proxy-player', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('Falta parámetro url');
    }

    try {
      let targetUrl = rawUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Referer: targetUrl,
      };

      // Unpack nested layers (streamec.st -> embedcenter.st -> hls_co.php)
      let currentUrl = targetUrl;
      let currentReferer = 'https://tvsportslive.fr/';
      let finalHtml = '';

      for (let depth = 0; depth < 4; depth++) {
        const resp = await fetch(currentUrl, {
          headers: { ...headers, Referer: currentReferer },
          redirect: 'follow',
        });

        if (!resp.ok) {
          return res.status(resp.status).send(`Error fetching player: ${resp.status}`);
        }

        finalHtml = await resp.text();

        // Check if this HTML contains a nested player iframe
        const iframeMatch = finalHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (iframeMatch && !finalHtml.includes('Clappr.Player') && !finalHtml.includes('playlistUrl')) {
          let nextUrl = iframeMatch[1];
          if (nextUrl.startsWith('//')) nextUrl = 'https:' + nextUrl;
          else if (nextUrl.startsWith('/')) {
            const baseObj = new URL(currentUrl);
            nextUrl = `${baseObj.origin}${nextUrl}`;
          }
          currentReferer = currentUrl;
          currentUrl = nextUrl;
        } else {
          // Reached the actual player!
          break;
        }
      }

      // Neutralize anti-sandbox check and inject base href
      const parsedCurrent = new URL(currentUrl);
      const baseHref = `${parsedCurrent.origin}${path.posix.dirname(parsedCurrent.pathname)}/`;

      let processedHtml = finalHtml;
      processedHtml = processedHtml.replace(/<head>/i, `<head><base href="${baseHref}">`);
      
      // Neutralize modern chrome document.domain deprecation false-sandbox detection
      processedHtml = processedHtml.replace(/if\s*\(\s*isSandboxed\(\)\s*\)/g, 'if (false)');
      processedHtml = processedHtml.replace(/function isSandboxed\(\)\s*\{[\s\S]*?return true;[\s\S]*?\}/g, 'function isSandboxed() { return false; }');
      processedHtml = processedHtml.replace(/if\s*\(\s*window\.self\s*===\s*window\.top\s*\)\s*return;/g, '');
      processedHtml = processedHtml.replace(/if\s*\(\s*window\s*==\s*window\.top\s*\)\s*document\.location\s*=\s*["']\/["']/g, '/* allowed */');
      
      // Strip popunders and intrusive ad injections
      processedHtml = processedHtml.replace(/<script[^>]*data-cfasync="false"[\s\S]*?<\/script>/gi, '<!-- popunder blocked -->');
      processedHtml = processedHtml.replace(/aclib\.runPop[\s\S]*?\);/g, '/* aclib blocked */');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(processedHtml);
    } catch (err: any) {
      console.error('Error in proxy-player:', err);
      return res.status(500).send('Error proxying player');
    }
  });

  /**
   * API: Clean Player Embed Route
   */
  app.get('/api/clean-embed', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('URL missing');
    }

    try {
      let targetUrl = rawUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer-when-downgrade">
  <title>MULTIVIEW Player</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe
    src="/api/proxy-player?url=${encodeURIComponent(targetUrl)}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
    allowfullscreen
    scrolling="no"
  ></iframe>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      return res.send(html);
    } catch (err: any) {
      return res.status(500).send('Error loading embed wrapper');
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
