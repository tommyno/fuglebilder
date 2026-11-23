import type { APIRoute } from 'astro';
import { norwegianBirds } from '../../lib/species.server';
import { json } from '../../lib/http.server';

// GET /api/norske.json — every bird seen in Norway, A–Å. Built once at build time
// from data/species.json, so it is a plain static file.
export const GET: APIRoute = () => json({ birds: norwegianBirds() });
