import type { APIRoute } from 'astro';
import { norwegianBirds } from '../../lib/species.server';

// GET /api/norske.json — every bird seen in Norway, A–Å. Built once at build time
// from data/species.json, so it is a plain static file.
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ birds: norwegianBirds() }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
