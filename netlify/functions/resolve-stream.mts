import type { Config, Context } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(req.url);
  const rawUrl = url.searchParams.get('url');
  if (!rawUrl) {
    return Response.json(
      { error: 'Falta el parámetro url' },
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
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
      return Response.json(
        {
          status: 'protected_or_blocked',
          statusText: `El servidor respondió con código ${response.status}`,
          originalUrl: targetUrl,
        },
        {
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
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
    const m3u8Match =
      html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i) ||
      html.match(/playlistUrl\s*=\s*["']([^"']+)["']/i);
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
                const deepM3u8 =
                  deepHtml.match(/playlistUrl\s*=\s*["']([^"']+)["']/i) ||
                  deepHtml.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
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

    return Response.json(
      {
        status: 'success',
        originalUrl: targetUrl,
        nestedIframe,
        deepNestedIframe,
        hlsPlaylist,
        bestEmbedUrl: deepNestedIframe || nestedIframe || targetUrl,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return Response.json(
      {
        status: 'error',
        message: err?.message || 'Error al resolver la transmisión',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};

export const config: Config = {
  path: '/api/resolve-stream',
};
