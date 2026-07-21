import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Missing or invalid urls array' }, { status: 400 });
    }

    const results = await Promise.all(
      urls.map(async (url: string) => {
        try {
          // Add a cache-buster query parameter to bypass Cloudflare CDN cache
          const cacheBusterUrl = url.includes('?') ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`;
          const res = await fetch(cacheBusterUrl, { 
            method: 'HEAD',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          return { url, ok: res.ok, status: res.status };
        } catch (err) {
          return { url, ok: false, status: 0 };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error verifying URLs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
