import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Development journal. One Markdown file per entry; the home page, /journal/ index, entry pages
// and RSS feed all read from here. Only publish claims that can be demonstrated.
const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.enum([
      'Founding note',
      'World',
      'Building',
      'Creatures',
      'Wings',
      'Audio',
      'Platform',
    ]),
    /** Key from src/data/media.ts used as cover art. */
    cover: z.enum([
      'valley',
      'wilds',
      'hearth',
      'village',
      'castle',
      'dragon',
      'atlas',
      'wolf',
      'falcon',
    ]),
    /** What the entry documents: an intention, or work that exists in the prototype. */
    status: z.enum(['concept', 'development', 'planned']),
  }),
});

export const collections = { journal };
