// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  // Pages are static unless they say `export const prerender = false`.
  // Those are rendered on the first request, then cached by Vercel (ISR) for a day.
  adapter: vercel({ isr: { expiration: 60 * 60 * 24 } }),
  integrations: [preact()],
});
