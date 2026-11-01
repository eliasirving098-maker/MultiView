import type { Config, Context } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(req.url);
  const rawUrl = url.searchParams.get('url');
  if (!rawUrl) {
    return new Response('Falta parámetro url', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    let targetUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    // If user inputs tvsportslive.fr baltimore-ravens-vs-buffalo-bills, map directly to its stream
    if (targetUrl.includes('baltimore-ravens-vs-buffalo-bills')) {
      targetUrl = 'https://streamec.st/embed/ch32.php';
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
        return new Response(`Error fetching player: ${resp.status}`, {
          status: resp.status,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
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

    // If grant=1 is requested by renewGrant() inside the player, forward it
    if (url.searchParams.get('grant') === '1') {
      const grantUrl = new URL(currentUrl);
      grantUrl.searchParams.set('grant', '1');
      const grantResp = await fetch(grantUrl.toString(), {
        headers: {
          ...headers,
          Origin: 'https://embedcenter.st',
          Referer: currentReferer,
        },
      });
      const grantJson = await grantResp.json();
      // Rewrite CDN url inside grant JSON to pass through cdn-proxy
      if (grantJson.url) {
        grantJson.url = `/api/cdn-proxy?url=${encodeURIComponent(grantJson.url)}`;
      }
      return Response.json(grantJson, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Neutralize anti-sandbox check and inject base href
    const parsedCurrent = new URL(currentUrl);
    const lastSlashIdx = parsedCurrent.pathname.lastIndexOf('/');
    const pathDir = lastSlashIdx >= 0 ? parsedCurrent.pathname.substring(0, lastSlashIdx + 1) : '/';
    const baseHref = `${parsedCurrent.origin}${pathDir}`;

    let processedHtml = finalHtml;
    processedHtml = processedHtml.replace(/<head>/i, `<head><base href="${baseHref}">`);

    // Route edgeStream CDN requests through /api/cdn-proxy
    processedHtml = processedHtml.replace(
      /https:\/\/edgestream3\.pro\//g,
      '/api/cdn-proxy?url=https://edgestream3.pro/'
    );

    // Neutralize modern chrome document.domain deprecation false-sandbox detection
    processedHtml = processedHtml.replace(/if\s*\(\s*isSandboxed\(\)\s*\)/g, 'if (false)');
    processedHtml = processedHtml.replace(
      /function isSandboxed\(\)\s*\{[\s\S]*?return true;[\s\S]*?\}/g,
      'function isSandboxed() { return false; }'
    );
    processedHtml = processedHtml.replace(
      /function showBlockOverlay\(\)\s*\{[\s\S]*?document\.body\.innerHTML[\s\S]*?\}/g,
      'function showBlockOverlay() { console.warn("Sandbox blocker neutralized by MULTIVIEW"); }'
    );
    processedHtml = processedHtml.replace(/document\.domain\s*=\s*document\.domain;?/g, '/* bypassed */');
    processedHtml = processedHtml.replace(/if\s*\(\s*window\.self\s*===\s*window\.top\s*\)\s*return;/g, '');
    processedHtml = processedHtml.replace(
      /if\s*\(\s*window\s*==\s*window\.top\s*\)\s*document\.location\s*=\s*["']\/["']/g,
      '/* allowed */'
    );

    // Strip popunders and intrusive ad injections
    processedHtml = processedHtml.replace(
      /<script[^>]*data-cfasync="false"[\s\S]*?<\/script>/gi,
      '<!-- popunder blocked -->'
    );
    processedHtml = processedHtml.replace(/aclib\.runPop[\s\S]*?\);/g, '/* aclib blocked */');

    return new Response(processedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('Error in proxy-player:', err);
    return new Response('Error proxying player', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config: Config = {
  path: '/api/proxy-player',
};
