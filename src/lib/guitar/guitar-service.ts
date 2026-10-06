import { createGuitarEngine, type GuitarEngine } from './index';
import type {
  ChordShape,
  ChordPosition,
  Tuning,
  NotePosition,
  ScalePosition,
  GuitarSong,
  TabSection,
  TabMeasure,
  TabNote,
  PracticeState,
  ChordTransition,
  GuitarString,
  Fingering,
} from '@/types/guitar';
import { CHORDS, CHORD_MAP, type Chord } from '@/data/chords';
import { SONG } from '@/data/song';

export class GuitarService {
  private engine: GuitarEngine;
  private initialized = false;

  constructor(engine?: GuitarEngine) {
    this.engine = engine || createGuitarEngine();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.engine.initialize();
    this.initialized = true;
  }

  getEngine(): GuitarEngine {
    return this.engine;
  }

  getSongChords(): ChordShape[] {
    return CHORDS.map(chord => this.convertAppChordToShape(chord));
  }

  getChordShape(id: string): ChordShape | undefined {
    const appChord = CHORD_MAP[id];
    if (!appChord) return undefined;
    return this.convertAppChordToShape(appChord);
  }

  private convertAppChordToShape(chord: Chord): ChordShape {
    const frets: (number | null)[] = chord.frets.map(f => f === -1 ? null : f);
    const fingers: Fingering[] = chord.fingers.map(f => ({
      finger: f.finger,
      string: f.string as GuitarString,
      fret: f.fret,
    }));

    return {
      id: chord.id,
      name: chord.name,
      quality: this.extractQuality(chord.name),
      root: this.extractRoot(chord.name),
      frets,
      fingers,
      barredFrets: this.detectBarres(frets),
      tuning: this.getTuningForCapo(chord.soundsAs),
      difficulty: chord.difficulty,
      position: this.getChordPosition(frets),
      voicing: this.getVoicing(frets),
    };
  }

  private extractRoot(name: string): string {
    const match = name.match(/^([A-G][#b]?)/);
    return match ? match[1] : 'C';
  }

  private extractQuality(name: string): string {
    const root = this.extractRoot(name);
    return name.slice(root.length);
  }

  private detectBarres(frets: (number | null)[]): number[] {
    const fretCounts = new Map<number, number>();
    for (const f of frets) {
      if (f !== null && f > 0) {
        fretCounts.set(f, (fretCounts.get(f) || 0) + 1);
      }
    }
    return Array.from(fretCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([fret]) => fret);
  }

  private getChordPosition(frets: (number | null)[]): number {
    const validFrets = frets.filter(f => f !== null && f > 0);
    if (validFrets.length === 0) return 0;
    return Math.min(...validFrets);
  }

  private getVoicing(frets: (number | null)[]): 'open' | 'barre' | 'partial' | 'jazz' {
    const hasOpen = frets.some(f => f === 0);
    const hasBarre = this.detectBarres(frets).length > 0;
    const validFrets = frets.filter(f => f !== null && f > 0);

    if (hasBarre) return 'barre';
    if (hasOpen) return 'open';
    if (validFrets.length <= 4) return 'partial';
    return 'jazz';
  }

  private getTuningForCapo(soundsAs: string): Tuning {
    const root = this.extractRoot(soundsAs);
    const capo = this.calculateCapo(root);
    const baseTuning = this.engine.getTuning('standard');
    return { ...baseTuning!, name: `Standard (Capo ${capo})` };
  }

  private calculateCapo(soundingRoot: string): number {
    const shapeRoot = 'C';
    const shapeMidi = this.noteNameToMidi(shapeRoot);
    const soundMidi = this.noteNameToMidi(soundingRoot);
    return (soundMidi - shapeMidi + 12) % 12;
  }

  private noteNameToMidi(name: string): number {
    const notes: Record<string, number> = {
      C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
      'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
    };
    const match = name.match(/^([A-G][#b]?)(-?\d+)?$/);
    if (!match) return 60;
    const note = notes[match[1]] ?? 0;
    const octave = match[2] ? parseInt(match[2], 10) : 4;
    return 12 * (octave + 1) + note;
  }

  getChordPositionsForSongChord(chordId: string, capo = 2): ChordPosition[] {
    const shape = this.getChordShape(chordId);
    if (!shape) return [];
    return this.engine.getChordPositions(shape, capo);
  }

  getMelodyNotePositions(sectionId: string): NotePosition[][] {
    const section = SONG.sections.find(s => s.id === sectionId);
    if (!section) return [];

    const positions: NotePosition[][] = [];
    for (const line of section.lines) {
      const linePositions: NotePosition[] = [];
      for (const syllable of line.syllables) {
        const notePositions = this.engine.getNotePositions(syllable.note.midi);
        if (notePositions.length > 0) {
          linePositions.push(notePositions[0]);
        }
      }
      if (linePositions.length > 0) {
        positions.push(linePositions);
      }
    }
    return positions;
  }

  getScaleForKey(key: string): ScalePosition[] {
    const isMinor = key.toLowerCase().includes('minor') || key.toLowerCase().includes('m');
    const root = key.replace(/\s*(major|minor|m)\s*$/i, '').trim();
    const scale = isMinor ? 'minor' : 'major';
    return this.engine.getScalePositions(root, scale);
  }

  getChordTransitions(): ChordTransition[] {
    const transitions: ChordTransition[] = [];
    const songChords = this.getSongChords();

    for (let i = 0; i < songChords.length - 1; i++) {
      const from = songChords[i];
      const to = songChords[i + 1];
      transitions.push(this.analyzeTransition(from, to));
    }

    return transitions;
  }

  private analyzeTransition(from: ChordShape, to: ChordShape): ChordTransition {
    const fromFingers = new Map(from.fingers.map(f => [`${f.string}-${f.fret}`, f]));
    const toFingers = new Map(to.fingers.map(f => [`${f.string}-${f.fret}`, f]));

    const commonFingers: Fingering[] = [];
    const movingFingers: { from: Fingering; to: Fingering }[] = [];

    for (const [key, finger] of fromFingers) {
      if (toFingers.has(key)) {
        commonFingers.push(finger);
      } else {
        const targetFinger = to.fingers.find(f => f.finger === finger.finger);
        if (targetFinger) {
          movingFingers.push({ from: finger, to: targetFinger });
        }
      }
    }

    const tips = this.generateTransitionTips(from, to, commonFingers, movingFingers);

    return {
      from,
      to,
      commonFingers,
      movingFingers,
      difficulty: Math.max(from.difficulty, to.difficulty),
      tips,
    };
  }

  private generateTransitionTips(
    from: ChordShape,
    to: ChordShape,
    common: Fingering[],
    moving: { from: Fingering; to: Fingering }[]
  ): string[] {
    const tips: string[] = [];

    if (common.length > 0) {
      tips.push(`Keep ${common.length} finger${common.length > 1 ? 's' : ''} in place: ${common.map(f => `finger ${f.finger} on string ${f.string}`).join(', ')}`);
    }

    if (moving.length > 0) {
      for (const move of moving) {
        tips.push(`Move finger ${move.from.finger} from string ${move.from.string} fret ${move.from.fret} to string ${move.to.string} fret ${move.to.fret}`);
      }
    }

    const fromOpen = from.frets.filter(f => f === 0).length;
    const toOpen = to.frets.filter(f => f === 0).length;
    if (fromOpen > 0 && toOpen === 0) {
      tips.push('Lift all open strings - this becomes a barre or fretted chord');
    } else if (fromOpen === 0 && toOpen > 0) {
      tips.push('Release pressure to let open strings ring');
    }

    if (from.voicing === 'barre' && to.voicing === 'open') {
      tips.push('Release barre gradually, let open strings emerge');
    } else if (from.voicing === 'open' && to.voicing === 'barre') {
      tips.push('Form barre shape in the air before landing');
    }

    return tips;
  }

  createPracticeState(sectionId: string): PracticeState {
    return {
      currentSection: sectionId,
      currentMeasure: 0,
      tempo: SONG.bpm,
      loopEnabled: false,
      metronomeEnabled: true,
      backingTrackEnabled: false,
    };
  }

  async loadGuitarProFile(file: File): Promise<GuitarSong> {
    const arrayBuffer = await file.arrayBuffer();
    return this.engine.parseGuitarPro(arrayBuffer);
  }

  async loadMusicXMLFile(file: File): Promise<GuitarSong> {
    const text = await file.text();
    return this.engine.parseMusicXML(text);
  }
}

export const guitarService = new GuitarService();