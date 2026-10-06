// Guitar curriculum for "Before I Learned the Words", grounded in the
// chord charts from the locked Melody Development Workbook.
import { getChord } from '@/data/chords';
import type { Chord } from '@/data/chords';

export interface Transition {
  id: string; // 'cadd9-to-em7'
  from: string; // chord id
  to: string; // chord id
  /** Which part of the song this transition belongs to. */
  section: 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro';
  /** 1 = the single most important move in the song. */
  priority: number;
  /** Plain-language coaching for this specific move. */
  coach: string;
}

export interface StrumStage {
  id: 'stage-1' | 'stage-2' | 'stage-3';
  order: number;
  name: string;
  /** Quarter-note pattern: 'D' down, 'U' up, '' rest. */
  pattern: ('D' | 'U' | '')[];
  explain: string;
  /** How many clean counts in a row to call it solid. */
  targetStreak: number;
}

/** The chord under each line, in song order (verse 2 shares verse 1's chords). */
export const SECTION_PROGRESSIONS: Record<
  string,
  { section: Transition['section']; name: string; chords: { chord: string; line: number }[] }
> = {
  'verse-1': {
    section: 'verse',
    name: 'Verse',
    chords: [
      { chord: 'cadd9', line: 1 },
      { chord: 'em7', line: 2 },
      { chord: 'am7', line: 3 },
      { chord: 'fmaj7', line: 4 },
    ],
  },
  'pre-chorus-1': {
    section: 'pre-chorus',
    name: 'Pre-Chorus',
    chords: [
      { chord: 'g', line: 1 },
      { chord: 'em7', line: 2 },
      { chord: 'cadd9', line: 3 },
      { chord: 'dm7', line: 4 },
    ],
  },
  'chorus-1': {
    section: 'chorus',
    name: 'Chorus',
    chords: [
      { chord: 'cadd9', line: 1 },
      { chord: 'f', line: 2 },
      { chord: 'am7', line: 3 },
      { chord: 'g', line: 4 },
    ],
  },
  bridge: {
    section: 'bridge',
    name: 'Bridge',
    chords: [
      { chord: 'am', line: 1 },
      { chord: 'f', line: 2 },
      { chord: 'c', line: 3 },
      { chord: 'g', line: 4 },
    ],
  },
  outro: {
    section: 'outro',
    name: 'Outro',
    chords: [
      { chord: 'em', line: 1 },
      { chord: 'c', line: 2 },
      { chord: 'fmaj7', line: 3 },
    ],
  },
};

/** Every transition in the song, in learning order. */
export const TRANSITIONS: Transition[] = [
  // --- Verse chain (the heart of the song) ---
  {
    id: 'cadd9-to-em7',
    from: 'cadd9',
    to: 'em7',
    section: 'verse',
    priority: 1,
    coach:
      'Your middle finger stays on the 5th string the whole time — it just slides down one fret. Only the index finger moves (string 4 → string 2). Move the index first, then slide.',
  },
  {
    id: 'em7-to-am7',
    from: 'em7',
    to: 'am7',
    section: 'verse',
    priority: 2,
    coach:
      'Two fingers lift off, one stays. Your index finger stays on string 2 the whole time — let it anchor while the middle and ring fingers relax away. Then drop the middle finger to string 4.',
  },
  {
    id: 'am7-to-fmaj7',
    from: 'am7',
    to: 'fmaj7',
    section: 'verse',
    priority: 3,
    coach:
      'This is a shape change, not a small move: the three-finger staircase (3-2-1) slides up a fret. Lift the whole hand two inches and re-set it as one unit. Slow is the goal, not speed.',
  },
  {
    id: 'fmaj7-to-cadd9',
    from: 'fmaj7',
    to: 'cadd9',
    section: 'verse',
    priority: 4,
    coach:
      'You just close the loop back home. Middle finger goes from string 3 to string 5 — a big jump, so plan it while you are still holding Am7. Arrive one beat early in your head.',
  },
  // --- Pre-chorus ---
  {
    id: 'cadd9-to-g',
    from: 'cadd9',
    to: 'g',
    section: 'pre-chorus',
    priority: 5,
    coach:
      'Climb out of the verse. Middle finger lands on the 6th string first, index on the 5th, and the pinky reaches to string 1. Land the bass fingers together — they move as a pair.',
  },
  {
    id: 'g-to-em7',
    from: 'g',
    to: 'em7',
    section: 'pre-chorus',
    priority: 6,
    coach:
      'Drop back down the neck. Middle finger goes from 6th-string fret 2 down to 5th-string fret 2, ring joins beside it, index hops to string 2. Keep the strum light so the move is not rushed.',
  },
  {
    id: 'em7-to-cadd9',
    from: 'em7',
    to: 'cadd9',
    section: 'pre-chorus',
    priority: 7,
    coach:
      'The reverse of the very first verse move. Middle finger slides up the 5th string; index jumps to string 4. You already know this one backwards.',
  },
  {
    id: 'cadd9-to-dm7',
    from: 'cadd9',
    to: 'dm7',
    section: 'pre-chorus',
    priority: 8,
    coach:
      'Jump to the small huddle near the top. Lift high — your hand clears the neck — and set index, middle and ring as one cluster. The open 4th string rings in both chords, so it does not need a finger.',
  },
  {
    id: 'dm7-to-g',
    from: 'dm7',
    to: 'g',
    section: 'pre-chorus',
    priority: 9,
    coach:
      'Unclench the cluster and open the whole G. Spread wider than you think; G uses all six strings, so the strum comes from the shoulder this time, not the wrist.',
  },
  // --- Chorus ---
  {
    id: 'cadd9-to-f',
    from: 'cadd9',
    to: 'f',
    section: 'chorus',
    priority: 10,
    coach:
      'Into the barre. Index rolls down onto strings 3 and 2 in one motion, then middle and ring fill in. Give yourself a full beat — the chorus can wait for your hand.',
  },
  {
    id: 'f-to-am7',
    from: 'f',
    to: 'am7',
    section: 'chorus',
    priority: 11,
    coach:
      'The relief move: two fingers only. Release the whole shape at once — do not pick fingers off one by one — and let the hand drop back to the two-finger home.',
  },
  {
    id: 'am7-to-g',
    from: 'am7',
    to: 'g',
    section: 'chorus',
    priority: 12,
    coach:
      'Two fingers become three. Index walks from string 2 to string 5, middle from string 4 to string 6, pinky arrives last on string 1. The walk is diagonal — slide, do not jump.',
  },
  {
    id: 'g-to-cadd9',
    from: 'g',
    to: 'cadd9',
    section: 'chorus',
    priority: 13,
    coach:
      'Chorus closes back to the verse home. Drop the pinky, slide the two bass fingers to the 5-4 strings, and re-anchor the index on string 4.',
  },
  // --- Chorus ending tag ---
  {
    id: 'cadd9-to-gb',
    from: 'cadd9',
    to: 'gb',
    section: 'chorus',
    priority: 14,
    coach:
      'G/B is G with the bass slid down. Keep the G shape and just slide the middle finger to fret 4 on the 6th string. Start the strum on the 5th string — the low E stays silent.',
  },
  {
    id: 'gb-to-am7',
    from: 'gb',
    to: 'am7',
    section: 'chorus',
    priority: 15,
    coach:
      'Glide into the two-finger chord. Both bass fingers relax and the index settles on string 2. This is the easiest move in the tag — enjoy it.',
  },
  {
    id: 'am7-to-f',
    from: 'am7',
    to: 'f',
    section: 'chorus',
    priority: 16,
    coach:
      'Back to the barre, but only for two beats. Same roll-in as before; the strum stays gentle so the release back out is clean.',
  },
  {
    id: 'f-to-gsus4',
    from: 'f',
    to: 'gsus4',
    section: 'chorus',
    priority: 17,
    coach:
      'Release the barre and open into Gsus4: ring finger to string 3 fret 1, pinky stays on string 1. The "unfinished" sound is correct — you are holding the breath.',
  },
  {
    id: 'gsus4-to-g',
    from: 'gsus4',
    to: 'g',
    section: 'chorus',
    priority: 18,
    coach:
      'The resolve: ring finger drops back to string 5. One finger, one beat, and the chord completes. This is the most satisfying two notes in the whole song.',
  },
  // --- Bridge ---
  {
    id: 'am-to-f',
    from: 'am',
    to: 'f',
    section: 'bridge',
    priority: 19,
    coach:
      'The bridge is the quietest part of the song — match that. Let the whole F shape land softly; no rush, no accent.',
  },
  {
    id: 'f-to-c',
    from: 'f',
    to: 'c',
    section: 'bridge',
    priority: 20,
    coach:
      'Release the barre and open the C. Middle finger lands on 5-3, index on 4-2, ring on 2-1 — the same family as Cadd9 but with the 5th string ringing.',
  },
  {
    id: 'c-to-g',
    from: 'c',
    to: 'g',
    section: 'bridge',
    priority: 21,
    coach:
      'The classic climb. The whole hand shifts up and out: middle 5→6, index 4→5, pinky appears on string 1. Think "up", not "over".',
  },
  {
    id: 'g-to-am',
    from: 'g',
    to: 'am',
    section: 'bridge',
    priority: 22,
    coach:
      'Shrink back to two fingers. Everything else in G releases at once; only index and middle have work to do in Am.',
  },
  // --- Outro ---
  {
    id: 'em-to-c',
    from: 'em',
    to: 'c',
    section: 'outro',
    priority: 23,
    coach:
      'The last two chords of the song. From the small Em pair to the wider C — open up, ring all five strings, and let the final color breathe.',
  },
  {
    id: 'c-to-fmaj7',
    from: 'c',
    to: 'fmaj7',
    section: 'outro',
    priority: 24,
    coach:
      'The final chord of the song. Let it ring as long as you can hold the shape — the song ends inside this chord, so there is nowhere to be.',
  },
];

export const TRANSITION_MAP: Record<string, Transition> = Object.fromEntries(
  TRANSITIONS.map((t) => [t.id, t]),
);

export function transitionId(from: string, to: string): string {
  return `${from}-to-${to}`;
}

/** The end-of-chorus tag: Cadd9 -> G/B, Am7, F -> Gsus4, G. */
export const CHORUS_ENDING: { chord: string; label: string }[] = [
  { chord: 'cadd9', label: 'beat 1' },
  { chord: 'gb', label: 'beat 3' },
  { chord: 'am7', label: 'next beat' },
  { chord: 'f', label: 'next beat' },
  { chord: 'gsus4', label: 'next beat' },
  { chord: 'g', label: 'resolve' },
];


/** Strumming curriculum, from the workbook: one strum → steady downs → follow the guide. */
export const STRUM_STAGES: StrumStage[] = [
  {
    id: 'stage-1',
    order: 1,
    name: 'One strum, beat one',
    pattern: ['D', '', '', ''],
    explain:
      'Four counts, one move. Strum down exactly on count 1, then rest for counts 2, 3 and 4. Your hand stays in the middle of the strings. If the metronome clicks and you strum on the same moment, you are on time.',
    targetStreak: 3,
  },
  {
    id: 'stage-2',
    order: 2,
    name: 'Downs on every count',
    pattern: ['D', 'D', 'D', 'D'],
    explain:
      'Four down-strums, one per count, all with the thumb leading. This is the steady bed the verse sits on. Evenness matters more than speed: four strums that feel the same size.',
    targetStreak: 3,
  },
  {
    id: 'stage-3',
    order: 3,
    name: 'Follow the guide',
    pattern: ['D', '', 'D', 'U'],
    explain:
      'Turn on the 60 BPM guide and copy its strumming as closely as you can, at your own speed. The guide is the honest teacher here — if it sounds like you and the recording are doing the same thing, you are ready for the full song.',
    targetStreak: 2,
  },
];

export const STRUM_STAGE_MAP: Record<string, StrumStage> = Object.fromEntries(
  STRUM_STAGES.map((s) => [s.id, s]),
);

/** Chords the song actually needs, in the order a beginner should learn them. */
export const SONG_CHORD_ORDER = [
  'cadd9',
  'em7',
  'am7',
  'fmaj7',
  'g',
  'dm7',
  'f',
  'gb',
  'gsus4',
  'c',
  'am',
  'em',
];

/**
 * Which chords + transitions a section needs to play from memory.
 * Used by the "Can I play this yet?" readiness view.
 */
export function sectionRequirements(sectionId: string): {
  chords: string[];
  transitions: string[];
  strumStage: string;
} {
  switch (sectionId) {
    case 'verse-1':
    case 'verse-2':
      return {
        chords: ['cadd9', 'em7', 'am7', 'fmaj7'],
        transitions: ['cadd9-to-em7', 'em7-to-am7', 'am7-to-fmaj7', 'fmaj7-to-cadd9'],
        strumStage: 'stage-2',
      };
    case 'pre-chorus-1':
    case 'pre-chorus-2':
      return {
        chords: ['g', 'em7', 'cadd9', 'dm7'],
        transitions: ['g-to-em7', 'em7-to-cadd9', 'cadd9-to-dm7', 'dm7-to-g'],
        strumStage: 'stage-2',
      };
    case 'chorus-1':
    case 'final-chorus':
      return {
        chords: ['cadd9', 'f', 'am7', 'g', 'gb', 'gsus4'],
        transitions: [
          'cadd9-to-f',
          'f-to-am7',
          'am7-to-g',
          'g-to-cadd9',
          'cadd9-to-gb',
          'gb-to-am7',
          'am7-to-f',
          'f-to-gsus4',
          'gsus4-to-g',
        ],
        strumStage: 'stage-2',
      };
    case 'bridge':
      return {
        chords: ['am', 'f', 'c', 'g'],
        transitions: ['am-to-f', 'f-to-c', 'c-to-g', 'g-to-am'],
        strumStage: 'stage-1',
      };
    case 'outro':
      return {
        chords: ['em', 'c', 'fmaj7'],
        transitions: ['em-to-c', 'c-to-fmaj7'],
        strumStage: 'stage-1',
      };
    default:
      return { chords: [], transitions: [], strumStage: 'stage-1' };
  }
}

/** Plain-English guitar setup notes (shown on the guitar hub). */
export const GUITAR_SETUP = {
  capo:
    'Clip the capo across all six strings at the 2nd fret before anything else. With the capo on, every open-position shape sounds two steps higher — that is the key the song is written in. Every chord in this app assumes the capo is on.',
  strings: 'Standard tuning, low to high: E A D G B E. If you have not tuned recently, start with the Tuner.',
  strumHand:
    'Thumb leads the strum, fingers follow. For this song the strum stays around the sound hole, in the middle of the strings — not near the bridge, not over the frets.',
};

export function chordForSectionLine(sectionId: string, line: number): Chord | undefined {
  const prog = SECTION_PROGRESSIONS[sectionId];
  if (!prog) return undefined;
  const step = prog.chords.find((c) => c.line === line);
  return step ? getChord(step.chord) : undefined;
}

