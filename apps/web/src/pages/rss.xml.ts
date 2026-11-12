import type { APIRoute } from 'astro';
import { journalEntries, entryUrl } from '../lib/journal';

// Dependency-free RSS 2.0 feed: following development needs no account or data collection.
const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const items = (await journalEntries())
    .map((entry) => {
      const link = new URL(entryUrl(entry), origin).href;
      return [
        '    <item>',
        `      <title>${escapeXml(entry.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${entry.data.date.toUTCString()}</pubDate>`,
        `      <category>${escapeXml(entry.data.category)}</category>`,
        `      <description>${escapeXml(entry.data.description)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Caelora development journal</title>',
    `    <link>${new URL('/journal/', origin).href}</link>`,
    '    <description>Notes from the development of Caelora, an independent medieval-fantasy voxel sandbox.</description>',
    '    <language>en</language>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
