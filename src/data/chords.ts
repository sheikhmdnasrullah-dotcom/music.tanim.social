// Chord library for "Before I Learned the Words" (played with capo on 2nd fret).
// Shapes are the open-position shapes from the locked song workbook;
// sounding notes are what actually rings with capo 2 (shape + 2 semitones).

export type Finger = 1 | 2 | 3 | 4; // 1 = index, 2 = middle, 3 = ring, 4 = pinky

export interface ChordFinger {
  finger: Finger;
  string: number; // 1 = high E ... 6 = low E
  fret: number;
}

export interface Chord {
  id: string;
  name: string;
  /** Frets per string, low E (6th) first. 0 = open, -1 = muted. */
  frets: [number, number, number, number, number, number];
  fingers: ChordFinger[];
  /** Strings to strum, low (6) to high (1). */
  strum: number[];
  difficulty: 1 | 2 | 3;
  /** Plain-language explanation for a complete beginner. */
  explain: string;
  /** Optional extra note shown in advanced mode. */
  advanced?: string;
  /** What it sounds like with capo 2 (the song's playing key). */
  soundsAs: string;
  /** Short "feel" hint used in the learner. */
  feel: string;
  /** Practice order (the order a beginner meets this chord in the song). */
  order: number;
}

export const CHORDS: Chord[] = [
  {
    id: 'cadd9',
    name: 'Cadd9',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [
      { finger: 2, string: 5, fret: 3 },
      { finger: 1, string: 4, fret: 2 },
      { finger: 3, string: 2, fret: 1 },
    ],
    strum: [4, 3, 2, 1],
    difficulty: 1,
    explain:
      'This is the first chord of the song. You rest three fingers and leave four strings to ring open. The "add9" part just means an extra soft note — you do not need to think about it, your fingers already make it.',
    advanced: 'C E G D over an open 5th. With capo 2 it sounds as a warm D-add9 color.',
    soundsAs: 'D (warm)',
    feel: 'Soft and open — the home chord of the whole song.',
    order: 1,
  },
  {
    id: 'em7',
    name: 'Em7',
    frets: [0, 2, 2, 0, 1, 0],
    fingers: [
      { finger: 2, string: 5, fret: 2 },
      { finger: 3, string: 4, fret: 2 },
      { finger: 1, string: 2, fret: 1 },
    ],
    strum: [5, 4, 3, 2, 1],
    difficulty: 1,
    explain:
      'Em7 is the "sad twin" of Cadd9. Your middle and ring fingers sit side by side, and your index finger moves to string 2. Keep fingers 3 and 1 anchored where they can reach from Cadd9 — that is what makes this switch smooth.',
    advanced: 'E G A B. With capo 2 it sounds as F#m7.',
    soundsAs: 'F#m7',
    feel: 'The gentle fall — it always leads somewhere.',
    order: 2,
  },
  {
    id: 'am7',
    name: 'Am7',
    frets: [-1, 0, 2, 0, 1, 0],
    fingers: [
      { finger: 2, string: 4, fret: 2 },
      { finger: 1, string: 2, fret: 1 },
    ],
    strum: [5, 4, 3, 2, 1],
    difficulty: 1,
    explain:
      'Only two fingers. Middle finger on string 4, index on string 2, everything else open. If a chord feels like a relief, this is why: almost nothing to hold.',
    advanced: 'A C E G. With capo 2 it sounds as Bm7.',
    soundsAs: 'Bm7',
    feel: 'Light and airy — a step up from Em7.',
    order: 3,
  },
  {
    id: 'fmaj7',
    name: 'Fmaj7',
    frets: [-1, -1, 3, 2, 1, 0],
    fingers: [
      { finger: 3, string: 4, fret: 3 },
      { finger: 2, string: 3, fret: 2 },
      { finger: 1, string: 2, fret: 1 },
    ],
    strum: [4, 3, 2, 1],
    difficulty: 2,
    explain:
      'A three-finger diagonal, like a little staircase: 3-2-1 across strings 4-3-2. Keep your fingers curved so the 4th string is not touched by your middle finger. Strum from string 4 only — the two bass strings stay quiet.',
    advanced: 'F A C E. With capo 2 it sounds as Gmaj7 — the bright, bittersweet chord of the pre-chorus.',
    soundsAs: 'Gmaj7',
    feel: 'The lift — the pre-chorus climbs through this one.',
    order: 4,
  },
  {
    id: 'dm7',
    name: 'Dm7',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [
      { finger: 2, string: 3, fret: 2 },
      { finger: 3, string: 2, fret: 3 },
      { finger: 1, string: 1, fret: 1 },
    ],
    strum: [4, 3, 2, 1],
    difficulty: 2,
    explain:
      'A compact cluster near the top of the neck: index, middle and ring huddle on strings 1-3. It is small, not hard — just new. The 4th string stays open and is part of the chord.',
    advanced: 'D F A C. With capo 2 it sounds as Em7.',
    soundsAs: 'Em7',
    feel: 'Searching and close — it aches to fall into G.',
    order: 6,
  },
  {
    id: 'g',
    name: 'G',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [
      { finger: 2, string: 6, fret: 3 },
      { finger: 1, string: 5, fret: 2 },
      { finger: 4, string: 1, fret: 3 },
    ],
    strum: [6, 5, 4, 3, 2, 1],
    difficulty: 2,
    explain:
      'The widest shape in the song. Middle finger on the 6th string, index one fret down on the 5th, and the pinky reaches to the 3rd fret of the high E — three open strings ring in the middle. It feels like a stretch; let your hand roll slightly over the neck instead of flattening out.',
    advanced: 'G B D G B D. With capo 2 it sounds as A. Wide, bright, and open — the pre-chorus lift.',
    soundsAs: 'A',
    feel: 'The lift — wide, bright, and a little of a stretch.',
    order: 5,
  },
  {
    id: 'f',
    name: 'F',
    frets: [-1, -1, 1, 2, 3, 2],
    fingers: [
      { finger: 1, string: 3, fret: 1 },
      { finger: 2, string: 2, fret: 2 },
      { finger: 2, string: 3, fret: 2 },
      { finger: 3, string: 1, fret: 3 },
    ],
    strum: [4, 3, 2, 1],
    difficulty: 3,
    explain:
      'The famous "barre" — and the honest news: for this song you do not need a full barre. Roll your index finger so it presses strings 3 and 2, add your middle finger on string 3, and let your ring finger cover string 1. Press less than you think, and lean your thumb against the back of the neck, not over the top.',
    advanced: 'F A C F. With capo 2 it sounds as G. Half-barre shape (no low E).',
    soundsAs: 'G',
    feel: 'The one that makes your hand stronger just by existing in the song.',
    order: 7,
  },
  {
    id: 'gb',
    name: 'G/B',
    frets: [4, 0, 0, 0, 0, 3],
    fingers: [
      { finger: 2, string: 6, fret: 4 },
      { finger: 1, string: 5, fret: 3 },
    ],
    strum: [5, 4, 3, 2, 1],
    difficulty: 2,
    explain:
      'G, but with B at the bottom instead of G — the bass note steps down so the chord glides. Hold the G shape, slide your middle finger down to fret 4, and start strumming from the 5th string. It glides into Am7 beautifully.',
    advanced: 'G B D G B with B in the bass. With capo 2 it sounds as A/C#.',
    soundsAs: 'A/C#',
    feel: 'A gliding step — half of G, half of motion.',
    order: 8,
  },
  {
    id: 'gsus4',
    name: 'Gsus4',
    frets: [3, 2, 0, 1, 0, 3],
    fingers: [
      { finger: 2, string: 6, fret: 3 },
      { finger: 1, string: 5, fret: 2 },
      { finger: 3, string: 3, fret: 1 },
      { finger: 4, string: 1, fret: 3 },
    ],
    strum: [6, 5, 4, 3, 2, 1],
    difficulty: 2,
    explain:
      'G with one finger moved: the pinky stays on string 1 and the ring finger shifts to string 3, fret 1. It sounds "unfinished" on purpose — it only feels right when it resolves back to G a beat later.',
    advanced: 'G C D G B D. With capo 2 it sounds as Asus4.',
    soundsAs: 'Asus4',
    feel: 'The held breath before G.',
    order: 9,
  },
  {
    id: 'c',
    name: 'C',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [
      { finger: 2, string: 5, fret: 3 },
      { finger: 1, string: 4, fret: 2 },
      { finger: 3, string: 2, fret: 1 },
    ],
    strum: [5, 4, 3, 2, 1],
    difficulty: 1,
    explain:
      'The same hand as Cadd9, but now the 5th string rings too. Strum from string 5. It is the chorus home chord.',
    advanced: 'C E G. With capo 2 it sounds as D.',
    soundsAs: 'D',
    feel: 'Chorus home — same family as Cadd9, bigger.',
    order: 10,
  },
  {
    id: 'am',
    name: 'Am',
    frets: [-1, 0, 2, 0, 1, 0],
    fingers: [
      { finger: 2, string: 4, fret: 2 },
      { finger: 1, string: 2, fret: 1 },
    ],
    strum: [5, 4, 3, 2, 1],
    difficulty: 1,
    explain:
      'The simplest chord on the guitar: two fingers, five strings. The bridge opens with this, voice alone.',
    advanced: 'A C E. With capo 2 it sounds as Bm.',
    soundsAs: 'Bm',
    feel: 'Quiet, bare, and honest.',
    order: 11,
  },
  {
    id: 'em',
    name: 'Em',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [
      { finger: 2, string: 5, fret: 2 },
      { finger: 3, string: 4, fret: 2 },
    ],
    strum: [5, 4, 3, 2, 1],
    difficulty: 1,
    explain:
      'Two fingers side by side, three open strings. The easiest chord on the guitar — the perfect warm-up between harder ones.',
    advanced: 'E G B. With capo 2 it sounds as F#m.',
    soundsAs: 'F#m',
    feel: 'Dark and simple.',
    order: 12,
  },
];

export const CHORD_MAP: Record<string, Chord> = Object.fromEntries(
  CHORDS.map((c) => [c.id, c]),
);

export function getChord(id: string): Chord | undefined {
  return CHORD_MAP[id];
}

/** Difficulty labels shown to beginners. */
export function difficultyLabel(d: 1 | 2 | 3): string {
  return d === 1 ? 'Easy' : d === 2 ? 'New but doable' : 'The big one';
}

