import type { GuitarEngineEvent, Tuning, ChordShape, ChordPosition, PracticeState, ScalePosition } from '@/types/guitar';
import type { GuitarSong } from '@/types/guitar';

export interface GuitarEngine {
  initialize(): Promise<void>;
  destroy(): void;

  getTunings(): Tuning[];
  getTuning(name: string): Tuning | undefined;

  getChordShapes(root: string, quality: string, tuning?: Tuning): ChordShape[];
  getChordShape(id: string): ChordShape | undefined;
  getChordPositions(chord: ChordShape, capo?: number): ChordPosition[];

  getNotePositions(note: number, tuning?: Tuning): import('@/types/guitar').NotePosition[];
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
  off(event: string, handler: Function): void;
}

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

export interface GuitarEngineFactory {
  createEngine(): GuitarEngine;
}

export class GuitarEngineRegistry {
  private static factories: Map<string, GuitarEngineFactory> = new Map();
  private static defaultEngine: string | null = null;

  static register(name: string, factory: GuitarEngineFactory, isDefault = false): void {
    this.factories.set(name, factory);
    if (isDefault || this.defaultEngine === null) {
      this.defaultEngine = name;
    }
  }

  static create(name?: string): GuitarEngine {
    const engineName = name || this.defaultEngine || 'alphatab';
    const factory = this.factories.get(engineName);
    if (!factory) {
      throw new Error(`Guitar engine '${engineName}' not registered`);
    }
    return factory.createEngine();
  }

  static getAvailableEngines(): string[] {
    return Array.from(this.factories.keys());
  }
}