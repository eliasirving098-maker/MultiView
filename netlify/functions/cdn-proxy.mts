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
    return new Response('Missing url parameter', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const upstreamRes = await fetch(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Origin: 'https://embedcenter.st',
        Referer: 'https://embedcenter.st/',
      },
    });

    const buffer = await upstreamRes.arrayBuffer();
    return new Response(buffer, {
      status: upstreamRes.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: any) {
    return new Response('CDN proxy error', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config: Config = {
  path: '/api/cdn-proxy',
};
