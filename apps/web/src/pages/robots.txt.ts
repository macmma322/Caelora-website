import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const production = import.meta.env.PUBLIC_DEPLOYMENT_ENV === 'production';
  return new Response(
    production
      ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap-index.xml', site)}\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
