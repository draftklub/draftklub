import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://draftklub.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    {
      url: `${base}/privacidade`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    { url: `${base}/termos`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    {
      url: `${base}/quero-criar-klub`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
