import { media, type Art, type Status } from './media';

// The five places of the valley. Each lives at a real position on the 3840×2160 plate. Pin
// positions and crop zones are CSS (`.place-<id>` in styles/site.css) because the site's CSP
// forbids inline styles; `zone` marks places whose hero is an exact crop of the plate, so the
// home map can zoom into that region and land on the place page (cross-document view transition).
export interface Place {
  id: 'wilds' | 'hearth' | 'village' | 'bestiary' | 'kingdoms';
  href: string;
  numeral: string;
  name: string;
  /** What you do here, in four words or fewer. */
  verb: string;
  summary: string;
  art: Art;
  zone: boolean;
  parts: [string, Status][];
}

export const places: Place[] = [
  {
    id: 'wilds',
    href: '/wilds/',
    numeral: 'I',
    name: 'The High Wilds',
    verb: 'Find your path',
    summary:
      'Forests, high passes, ruins and caves. The valley is meant to be read on foot — and, one day, from the air.',
    art: media.wilds,
    zone: true,
    parts: [
      ['Terrain and world generation', 'development'],
      ['Ruins and caves', 'development'],
      ['Day, night and weather', 'development'],
    ],
  },
  {
    id: 'hearth',
    href: '/hearth/',
    numeral: 'II',
    name: 'The Hearth',
    verb: 'Build your place',
    summary:
      'Gather timber and stone, craft the tools you need, and raise a shelter that can become a home.',
    art: media.hearth,
    zone: true,
    parts: [
      ['Gathering and building', 'development'],
      ['Crafting and tools', 'development'],
      ['Survival needs', 'development'],
    ],
  },
  {
    id: 'village',
    href: '/village/',
    numeral: 'III',
    name: 'The Village',
    verb: 'A world with its own life',
    summary:
      'Lights by the river. Villages with daily routines, people to trade with and a place among them, if you want one.',
    art: media.village,
    zone: true,
    parts: [
      ['Wildlife and livestock', 'development'],
      ['Villagers and settlements', 'planned'],
      ['Trade with neighbours', 'planned'],
    ],
  },
  {
    id: 'bestiary',
    href: '/bestiary/',
    numeral: 'IV',
    name: 'The Bestiary',
    verb: 'Beyond the ordinary',
    summary:
      'Wolves at the tree line, falcons on the wind, dragons older than any kingdom — and wings of your own.',
    art: media.dragon,
    zone: false,
    parts: [
      ['Wings and gliding', 'development'],
      ['Dragons', 'development'],
      ['Other mythical creatures', 'planned'],
    ],
  },
  {
    id: 'kingdoms',
    href: '/kingdoms/',
    numeral: 'V',
    name: 'The Kingdoms',
    verb: 'No destiny required',
    summary:
      'Follow the lore or just the river. Guilds, kingdoms and, one day, nations of your own making.',
    art: media.castle,
    zone: true,
    parts: [
      ['Guilds', 'planned'],
      ['Kingdoms', 'planned'],
      ['Player-founded nations', 'planned'],
    ],
  },
];

export const placeById = (id: Place['id']) => places.find((place) => place.id === id)!;
export const neighbours = (id: Place['id']) => {
  const index = places.findIndex((place) => place.id === id);
  return {
    previous: places[(index + places.length - 1) % places.length],
    next: places[(index + 1) % places.length],
  };
};
