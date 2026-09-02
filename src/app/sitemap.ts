import type { MetadataRoute } from 'next';

// Простая карта сайта — только публичная главная страница (лендинг).
// Остальные разделы требуют входа и закрыты от индексации в robots.txt.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://jr-marketing-psi.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
