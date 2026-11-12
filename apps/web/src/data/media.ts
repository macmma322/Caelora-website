// Single source of truth for every public image: dimensions, responsive widths and honest status.
// Add a new study here and it becomes available to the home page, journal covers and /media/.
export type Status = 'concept' | 'model' | 'development' | 'planned';

export const statusLabel: Record<Status, string> = {
  concept: 'Concept art',
  model: '3D model study',
  development: 'In development',
  planned: 'Planned',
};

export const statusMeaning: Record<Status, string> = {
  concept: 'Illustrates the intended direction. Not gameplay.',
  model: 'A render of an existing 3D source asset. Not gameplay.',
  development: 'Being built in the Unity prototype. Not publicly playable.',
  planned: 'A long-term intention. It may change.',
};

export interface Art {
  id: string;
  title: string;
  status: Status;
  /** Provenance line shown under the image. */
  source: string;
  alt: string;
  width: number;
  height: number;
  widths: number[];
  avif: boolean;
}

const art = <T extends Art>(entry: T) => entry;

export const media = {
  valley: art({
    id: 'valley',
    title: 'The valley',
    status: 'concept',
    source: 'Environment concept · the founding image of the world',
    alt: 'A cloaked traveller and a falcon overlook a forested valley, a lamplit riverside village and a castle at sunset while a dragon crosses the sky.',
    width: 1672,
    height: 941,
    widths: [640, 960, 1672],
    avif: true,
  }),
  wilds: art({
    id: 'wilds',
    title: 'The high wilds',
    status: 'concept',
    source: 'Detail of the valley concept (main-menu version)',
    alt: 'Snow-covered peaks above forested cliffs, with low mist drifting between the pines.',
    width: 2240,
    height: 820,
    widths: [800, 1440, 2240],
    avif: true,
  }),
  hearth: art({
    id: 'hearth',
    title: 'A first fire',
    status: 'concept',
    source: 'Detail of the valley concept (main-menu version)',
    alt: 'A brazier burning among timber crates and ivy-covered stone, beneath a red banner embroidered with a tree.',
    width: 1130,
    height: 1830,
    widths: [480, 760, 1130],
    avif: true,
  }),
  village: art({
    id: 'village',
    title: 'Lights by the river',
    status: 'concept',
    source: 'Detail of the valley concept (main-menu version)',
    alt: 'A riverside village of timber houses with lit windows, stone bridges and a waterfall beyond the pines.',
    width: 1600,
    height: 900,
    widths: [800, 1600],
    avif: true,
  }),
  castle: art({
    id: 'castle',
    title: 'Above the falls',
    status: 'concept',
    source: 'Detail of the valley concept (main-menu version)',
    alt: 'A many-towered castle on a cliff above waterfalls and mist, against a setting sun.',
    width: 1580,
    height: 900,
    widths: [800, 1580],
    avif: true,
  }),
  dragon: art({
    id: 'dragon',
    title: 'Older than kingdoms',
    status: 'concept',
    source: 'Creature concept · design and gameplay in development',
    alt: 'A horned voxel dragon with layered stone-coloured scales and wide rust-red wings, presented as a studio concept study.',
    width: 960,
    height: 840,
    widths: [640, 960],
    avif: true,
  }),
  atlas: art({
    id: 'atlas-folio',
    title: 'An uncharted beginning',
    status: 'concept',
    source: 'Atlas concept · not a final map',
    alt: 'An open illustrated atlas of imagined forests, rivers, villages, ruins and mountain ranges.',
    width: 1440,
    height: 935,
    widths: [720, 1440],
    avif: true,
  }),
  wolf: art({
    id: 'wolf',
    title: 'The wolf',
    status: 'model',
    source: 'Render of the existing wolf source model',
    alt: 'A Caelora wolf model study, with angular grey fur and a watchful gaze.',
    width: 960,
    height: 960,
    widths: [640, 960],
    avif: false,
  }),
  falcon: art({
    id: 'falcon',
    title: 'The falcon',
    status: 'model',
    source: 'Render of the existing falcon source model',
    alt: 'A Caelora falcon model study, with carved-looking charcoal and cream feathers and ochre talons.',
    width: 960,
    height: 960,
    widths: [640, 960],
    avif: false,
  }),
} satisfies Record<string, Art>;

export type MediaKey = keyof typeof media;

/** Archive order for /media/ and the viewer. */
export const archive: Art[] = [
  media.valley,
  media.wilds,
  media.hearth,
  media.village,
  media.castle,
  media.dragon,
  media.wolf,
  media.falcon,
  media.atlas,
];

export const srcset = (item: Art, format: 'avif' | 'webp') =>
  item.widths.map((width) => `/media/${item.id}-${width}.${format} ${width}w`).join(', ');

export const largest = (item: Art) => `/media/${item.id}-${item.widths.at(-1)}.webp`;

export const smallest = (item: Art) => `/media/${item.id}-${item.widths[0]}.webp`;
