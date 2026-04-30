import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://draftklub.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/k/',
          '/home',
          '/klubs',
          '/perfil',
          '/reservas',
          '/notificacoes',
          '/criar-klub',
          '/buscar-klubs',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
