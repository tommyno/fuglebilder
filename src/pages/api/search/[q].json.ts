import type { APIRoute } from 'astro';
import { search } from '../../../lib/species.server';
import { json } from '../../../lib/http.server';

export const prerender = false;

// GET /api/search/svarttr.json — search Norwegian and Latin names.
// The query lives in the path (not ?q=) because Vercel ISR ignores query strings.
export const GET: APIRoute = ({ params }) => json({ results: search((params.q ?? '').slice(0, 60)) });
