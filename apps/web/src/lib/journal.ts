import { getCollection, type CollectionEntry } from 'astro:content';

export type JournalEntry = CollectionEntry<'journal'>;

export async function journalEntries(): Promise<JournalEntry[]> {
  return (await getCollection('journal')).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

export const entryUrl = (entry: JournalEntry) => `/journal/${entry.id}/`;

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
