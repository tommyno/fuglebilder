// Server only: JSON response helpers.

const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export function json(data: unknown, init: { status?: number; cache?: boolean } = {}): Response {
  const { status = 200, cache = status === 200 } = init;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache ? CACHE : 'no-store',
    },
  });
}

export const notFound = (message = 'Not found') => json({ error: message }, { status: 404, cache: false });
