import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedDate: z.string(),
  }),
});

export const collections = { legal };
