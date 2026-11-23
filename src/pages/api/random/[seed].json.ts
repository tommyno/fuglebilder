import type { APIRoute } from 'astro';
import { randomBirds } from '../../../lib/species.server';
import { RANDOM_SEEDS } from '../../../lib/shared';
import { json, notFound } from '../../../lib/http.server';

export const prerender = false;

// GET /api/random/42.json — 24 random birds, the same for each seed
// so responses can be cached. The browser picks a random seed.
export const GET: APIRoute = ({ params }) => {
  const seed = Number(params.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed >= RANDOM_SEEDS) return notFound();
  return json({ birds: randomBirds(seed) });
};
