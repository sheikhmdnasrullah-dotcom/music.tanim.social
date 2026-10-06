export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;
export type Finger = 1 | 2 | 3 | 4;

export interface Tuning {
  name: string;
  notes: number[];
  strings: number;
}

export const STANDARD_TUNING: Tuning = {
  name: 'Standard',
  notes: [40, 45, 50, 55, 59, 64],
  strings: 6,
};

export const DROP_D_TUNING: Tuning = {
  name: 'Drop D',
  notes: [38, 45, 50, 55, 59, 64],
  strings: 6,
};

export const DADGAD_TUNING: Tuning = {
  name: 'DADGAD',
  notes: [38, 45, 50, 55, 57, 62],
  strings: 6,
};

export const OPEN_G_TUNING: Tuning = {
  name: 'Open G',
  notes: [38, 43, 50, 55, 59, 62],
  strings: 6,
};

export const OPEN_D_TUNING: Tuning = {
  name: 'Open D',
  notes: [38, 45, 50, 54, 57, 62],
  strings: 6,
};

export const TUNINGS: Record<string, Tuning> = {
  standard: STANDARD_TUNING,
  'drop-d': DROP_D_TUNING,
  dadgad: DADGAD_TUNING,
  'open-g': OPEN_G_TUNING,
  'open-d': OPEN_D_TUNING,
};

export interface Fingering {
  finger: Finger;
  string: GuitarString;
  fret: number;
}

export interface ChordShape {
  id: string;
  name: string;
  quality: string;
  root: string;
  frets: (number | null)[];
  fingers: Fingering[];
  barredFrets: number[];
  capo?: number;
  tuning: Tuning;
  difficulty: 1 | 2 | 3;
  position: number;
  voicing: 'open' | 'barre' | 'partial' | 'jazz';
}

export interface ChordPosition {
  shape: ChordShape;
  fret: number;
  capo: number;
  soundingNotes: number[];
  playedNotes: number[];
}

export interface TabNote {
  string: GuitarString;
  fret: number;
  duration: number;
  startTime: number;
  techniques: TabTechnique[];
  finger?: Finger;
}

export type TabTechnique =
  | 'slide'
  | 'bend'
  | 'hammer-on'
  | 'pull-off'
  | 'vibrato'
  | 'palm-mute'
  | 'harmonic'
  | 'let-ring'
  | 'dead-note'
  | 'grace-note'
  | 'tap'
  | 'slap'
  | 'pop';

export interface TabMeasure {
  notes: TabNote[];
  startTime: number;
  duration: number;
  timeSignature: { numerator: number; denominator: number };
}

export interface TabSection {
  id: string;
  name: string;
  measures: TabMeasure[];
  tempo: number;
}

export interface GuitarSong {
  id: string;
  title: string;
  artist: string;
  tuning: Tuning;
  capo: number;
  sections: TabSection[];
  chords: ChordShape[];
}

export interface PracticeState {
  currentSection: string;
  currentMeasure: number;
  tempo: number;
  loopEnabled: boolean;
  loopStart?: number;
  loopEnd?: number;
  metronomeEnabled: boolean;
  backingTrackEnabled: boolean;
}

export interface NotePosition {
  string: GuitarString;
  fret: number;
  note: number;
  noteName: string;
  octave: number;
}

export interface ScalePosition {
  name: string;
  root: string;
  positions: NotePosition[][];
  pattern: 'caged' | '3nps' | 'custom';
}

export interface ChordTransition {
  from: ChordShape;
  to: ChordShape;
  commonFingers: Fingering[];
  movingFingers: { from: Fingering; to: Fingering }[];
  difficulty: number;
  tips: string[];
}

export type GuitarEngineEvent =
  | { type: 'note-on'; string: GuitarString; fret: number; note: number }
  | { type: 'note-off'; string: GuitarString; fret: number }
  | { type: 'chord-change'; chord: ChordShape }
  | { type: 'position-change'; position: number }
  | { type: 'tempo-change'; tempo: number }
  | { type: 'section-change'; sectionId: string };

export interface ChordDiagramOptions {
  showFingers?: boolean;
  showIntervals?: boolean;
  showNoteNames?: boolean;
  showBarre?: boolean;
  size?: 'small' | 'medium' | 'large';
  orientation?: 'vertical' | 'horizontal';
}

export interface FretboardOptions {
  showNotes?: boolean;
  showIntervals?: boolean;
  highlightRoot?: boolean;
  highlightChordTones?: boolean;
  fretRange?: { from: number; to: number };
  showCaged?: boolean;
  cagedShape?: string;
}

export interface GuitarEngine {
  initialize(): Promise<void>;
  destroy(): void;

  getTunings(): Tuning[];
  getTuning(name: string): Tuning | undefined;

  getChordShapes(root: string, quality: string, tuning?: Tuning): ChordShape[];
  getChordShape(id: string): ChordShape | undefined;
  getChordPositions(chord: ChordShape, capo?: number): ChordPosition[];

  getNotePositions(note: number, tuning?: Tuning): NotePosition[];
  getScalePositions(root: string, scale: string, tuning?: Tuning): ScalePosition[];

  parseGuitarPro(data: ArrayBuffer): Promise<GuitarSong>;
  parseMusicXML(xml: string): Promise<GuitarSong>;
  parseAlphaTex(tex: string): Promise<GuitarSong>;

  renderTab(song: GuitarSong, container: HTMLElement): void;
  renderChordDiagram(chord: ChordShape, container: HTMLElement, options?: ChordDiagramOptions): void;
  renderFretboard(scale: ScalePosition, container: HTMLElement, options?: FretboardOptions): void;

  playSong(song: GuitarSong, state: PracticeState): Promise<void>;
  stopPlayback(): void;
  setTempo(tempo: number): void;
  seek(time: number): void;
  setLoop(start: number, end: number): void;

  on(event: 'note-on' | 'note-off' | 'chord-change' | 'position-change' | 'tempo-change' | 'section-change', handler: (event: GuitarEngineEvent) => void): void;
  off(event: string, handler: (event: GuitarEngineEvent) => void): void;
}

export interface GuitarEngineFactory {
  createEngine(): GuitarEngine;
}