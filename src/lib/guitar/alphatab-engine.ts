import alphaTab from '@coderline/alphatab';
import type {
  GuitarEngine,
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
  GuitarString,
  Fingering,
  Finger,
  TabTechnique,
} from '@/types/guitar';
import type { ChordDiagramOptions, FretboardOptions, GuitarEngineEvent } from './engine';
import { STANDARD_TUNING, TUNINGS } from '@/types/guitar';

const { Settings, AlphaTabApi, PlayerMode, LayoutMode, StaveProfile } = alphaTab;

// ScoreLoader needs to be accessed differently - it's a static class
const ScoreLoader = alphaTab.ScoreLoader || alphaTab.ScoreLoaderStatic || (alphaTab as any).ScoreLoader;

type AlphaTabScore = any;
type AlphaTabTrack = any;
type AlphaTabBeat = any;
type AlphaTabNote = any;

export class AlphaTabEngine implements GuitarEngine {
  private api: any = null;
  private score: AlphaTabScore | null = null;
  private currentState: PracticeState | null = null;
  private eventHandlers: Map<string, Set<(event: GuitarEngineEvent) => void>> = new Map();
  private soundFontLoaded = false;
  private container: HTMLElement | null = null;

  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && !this.soundFontLoaded) {
      await this.loadSoundFont();
    }
  }

  private async loadSoundFont(): Promise<void> {
    try {
      const response = await fetch('/soundfonts/sonivox.sf2');
      if (!response.ok) {
        console.warn('SoundFont not found at /soundfonts/sonivox.sf2, playback will be silent');
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      if (this.api?.synth) {
        this.api.synth.loadSoundFont(new Uint8Array(arrayBuffer), false);
      }
      this.soundFontLoaded = true;
    } catch (error) {
      console.warn('Failed to load SoundFont:', error);
    }
  }

  destroy(): void {
    this.stopPlayback();
    this.api?.destroy();
    this.score = null;
    this.container = null;
    this.eventHandlers.clear();
  }

  getTunings(): Tuning[] {
    return Object.values(TUNINGS);
  }

  getTuning(name: string): Tuning | undefined {
    return TUNINGS[name.toLowerCase()];
  }

  getChordShapes(root: string, quality: string, tuning: Tuning = STANDARD_TUNING): ChordShape[] {
    const shapes = this.generateChordShapes(root, quality, tuning);
    return shapes;
  }

  private generateChordShapes(root: string, quality: string, tuning: Tuning): ChordShape[] {
    const chordTones = this.getChordTones(root, quality);
    const shapes: ChordShape[] = [];

    const openShape = this.findOpenShape(chordTones, tuning);
    if (openShape) shapes.push(openShape);

    for (let fret = 1; fret <= 12; fret++) {
      const barreShapes = this.findBarreShapes(chordTones, tuning, fret);
      shapes.push(...barreShapes);
    }

    return shapes.sort((a, b) => a.difficulty - b.difficulty || a.position - b.position);
  }

  private getChordTones(root: string, quality: string): number[] {
    const rootMidi = this.noteNameToMidi(root);
    const intervals = this.getQualityIntervals(quality);
    return intervals.map(i => rootMidi + i);
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

  private getQualityIntervals(quality: string): number[] {
    const qualities: Record<string, number[]> = {
      '': [0, 4, 7],
      'm': [0, 3, 7],
      '7': [0, 4, 7, 10],
      'maj7': [0, 4, 7, 11],
      'm7': [0, 3, 7, 10],
      'dim': [0, 3, 6],
      'dim7': [0, 3, 6, 9],
      'aug': [0, 4, 8],
      'sus2': [0, 2, 7],
      'sus4': [0, 5, 7],
      'add9': [0, 4, 7, 14],
      'madd9': [0, 3, 7, 14],
      '6': [0, 4, 7, 9],
      'm6': [0, 3, 7, 9],
      '9': [0, 4, 7, 10, 14],
      'm9': [0, 3, 7, 10, 14],
      '13': [0, 4, 7, 10, 14, 21],
    };
    return qualities[quality] || [0, 4, 7];
  }

  private findOpenShape(chordTones: number[], tuning: Tuning): ChordShape | null {
    const maxFret = 4;
    const strings = tuning.notes.length;

    for (let fretPattern = 0; fretPattern < Math.pow(maxFret + 2, strings); fretPattern++) {
      const frets: (number | null)[] = [];
      let temp = fretPattern;
      let maxUsedFret = 0;

      for (let s = 0; s < strings; s++) {
        const f = temp % (maxFret + 2);
        temp = Math.floor(temp / (maxFret + 2));
        if (f === maxFret + 1) {
          frets.push(null);
        } else {
          frets.push(f);
          if (f > maxUsedFret) maxUsedFret = f;
        }
      }

      const playedNotes = frets
        .map((f, i) => f !== null ? tuning.notes[i] + f : null)
        .filter((n): n is number => n !== null);

      if (playedNotes.length < 3) continue;

      const hasAllTones = chordTones.every(ct =>
        playedNotes.some(pn => (pn - ct) % 12 === 0)
      );
      if (!hasAllTones) continue;

      const fingers = this.assignFingers(frets);
      if (!fingers) continue;

      return {
        id: `${chordTones[0]}-${quality}-open`,
        name: this.getChordName(chordTones[0], quality),
        quality,
        root: this.midiToNoteName(chordTones[0]),
        frets,
        fingers,
        barredFrets: [],
        tuning,
        difficulty: maxUsedFret <= 3 ? 1 : 2,
        position: 0,
        voicing: 'open',
      };
    }
    return null;
  }

  private findBarreShapes(chordTones: number[], tuning: Tuning, barreFret: number): ChordShape[] {
    const shapes: ChordShape[] = [];
    const strings = tuning.notes.length;

    const barreNotes = tuning.notes.map(n => n + barreFret);
    const hasRoot = barreNotes.some(n => (n - chordTones[0]) % 12 === 0);
    if (!hasRoot) return shapes;

    for (let pattern = 0; pattern < 1000; pattern++) {
      const frets: (number | null)[] = [];
      let temp = pattern;

      for (let s = 0; s < strings; s++) {
        const f = temp % 5;
        temp = Math.floor(temp / 5);
        if (f === 0) {
          frets.push(barreFret);
        } else if (f === 4) {
          frets.push(null);
        } else {
          frets.push(barreFret + f);
        }
      }

      const playedNotes = frets
        .map((f, i) => f !== null ? tuning.notes[i] + f : null)
        .filter((n): n is number => n !== null);

      if (playedNotes.length < 3) continue;

      const hasAllTones = chordTones.every(ct =>
        playedNotes.some(pn => (pn - ct) % 12 === 0)
      );
      if (!hasAllTones) continue;

      const fingers = this.assignFingers(frets, barreFret);
      if (!fingers) continue;

      const qName = this.getQualityName(chordTones);
      shapes.push({
        id: `${chordTones[0]}-${qName}-barre-${barreFret}-${pattern}`,
        name: this.getChordName(chordTones[0], qName),
        quality: qName,
        root: this.midiToNoteName(chordTones[0]),
        frets,
        fingers,
        barredFrets: [barreFret],
        tuning,
        difficulty: 3,
        position: barreFret,
        voicing: 'barre',
      });
    }
    return shapes;
  }

  private assignFingers(frets: (number | null)[], barreFret = 0): Fingering[] | null {
    const fingers: Fingering[] = [];
    const usedFingers = new Set<Finger>();
    const fingerOrder: Finger[] = [1, 2, 3, 4];

    if (barreFret > 0) {
      usedFingers.add(1);
    }

    const frettedPositions = frets
      .map((f, i) => ({ string: (i + 1) as GuitarString, fret: f }))
      .filter(p => p.fret !== null && p.fret !== barreFret && p.fret > 0)
      .sort((a, b) => a.fret! - b.fret!);

    for (const pos of frettedPositions) {
      let assigned = false;
      for (const finger of fingerOrder) {
        if (!usedFingers.has(finger)) {
          fingers.push({ finger, string: pos.string, fret: pos.fret! });
          usedFingers.add(finger);
          assigned = true;
          break;
        }
      }
      if (!assigned) return null;
    }
    return fingers;
  }

  private getChordName(rootMidi: number, quality: string): string {
    return this.midiToNoteName(rootMidi) + quality;
  }

  private getQualityName(chordTones: number[]): string {
    const intervals = chordTones.map(t => (t - chordTones[0] + 12) % 12).sort((a, b) => a - b);
    const qualities: Record<string, string> = {
      '0,3,7': 'm',
      '0,4,7': '',
      '0,3,6': 'dim',
      '0,3,7,10': 'm7',
      '0,4,7,11': 'maj7',
      '0,4,7,10': '7',
      '0,3,6,9': 'dim7',
      '0,4,8': 'aug',
      '0,2,7': 'sus2',
      '0,5,7': 'sus4',
      '0,4,7,14': 'add9',
      '0,3,7,14': 'madd9',
    };
    return qualities[intervals.join(',')] || '';
  }

  private midiToNoteName(midi: number): string {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12];
  }

  getChordShape(id: string): ChordShape | undefined {
    return undefined;
  }

  getChordPositions(chord: ChordShape, capo = 0): ChordPosition[] {
    const positions: ChordPosition[] = [];
    const shapes = this.getChordShapes(chord.root, chord.quality, chord.tuning);

    for (const shape of shapes) {
      const playedNotes = shape.frets
        .map((f, i) => f !== null ? chord.tuning.notes[i] + f + capo : null)
        .filter((n): n is number => n !== null);

      const soundingNotes = shape.frets
        .map((f, i) => f !== null ? chord.tuning.notes[i] + f + capo : null)
        .filter((n): n is number => n !== null);

      positions.push({
        shape,
        fret: shape.position,
        capo,
        soundingNotes,
        playedNotes,
      });
    }
    return positions;
  }

  getNotePositions(note: number, tuning: Tuning = STANDARD_TUNING): NotePosition[] {
    const positions: NotePosition[] = [];
    for (let s = 0; s < tuning.notes.length; s++) {
      const string = (s + 1) as GuitarString;
      const openNote = tuning.notes[s];
      const fret = note - openNote;
      if (fret >= 0 && fret <= 24) {
        positions.push({
          string,
          fret,
          note,
          noteName: this.midiToNoteName(note),
          octave: Math.floor(note / 12) - 1,
        });
      }
    }
    return positions;
  }

  getScalePositions(root: string, scale: string, tuning: Tuning = STANDARD_TUNING): ScalePosition[] {
    const rootMidi = this.noteNameToMidi(root);
    const scaleIntervals = this.getScaleIntervals(scale);
    const scaleNotes = scaleIntervals.map(i => rootMidi + i);

    const allPositions: NotePosition[][] = [];
    for (let fret = 0; fret <= 12; fret++) {
      const positionNotes: NotePosition[] = [];
      for (let s = 0; s < tuning.notes.length; s++) {
        for (let f = fret; f < fret + 5; f++) {
          const note = tuning.notes[s] + f;
          if (scaleNotes.some(sn => (sn - note) % 12 === 0)) {
            positionNotes.push({
              string: (s + 1) as GuitarString,
              fret: f,
              note,
              noteName: this.midiToNoteName(note),
              octave: Math.floor(note / 12) - 1,
            });
          }
        }
      }
      if (positionNotes.length > 0) {
        allPositions.push(positionNotes);
      }
    }

    return [{
      name: `${root} ${scale}`,
      root,
      positions: allPositions,
      pattern: 'custom',
    }];
  }

  private getScaleIntervals(scale: string): number[] {
    const scales: Record<string, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      'pentatonic-major': [0, 2, 4, 7, 9],
      'pentatonic-minor': [0, 3, 5, 7, 10],
      blues: [0, 3, 5, 6, 7, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
    };
    return scales[scale] || scales.major;
  }

  async parseGuitarPro(data: ArrayBuffer): Promise<GuitarSong> {
    const settings = new Settings();
    settings.player.playerMode = PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = '/soundfonts/sonivox.sf2';
    
    this.score = ScoreLoader.loadScoreFromBytes(new Uint8Array(data), settings);
    return this.convertScoreToSong(this.score);
  }

  async parseMusicXML(xml: string): Promise<GuitarSong> {
    const settings = new Settings();
    settings.player.playerMode = PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = '/soundfonts/sonivox.sf2';
    
    this.score = ScoreLoader.loadAlphaTex(xml, settings);
    return this.convertScoreToSong(this.score);
  }

  async parseAlphaTex(tex: string): Promise<GuitarSong> {
    const settings = new Settings();
    settings.player.playerMode = PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = '/soundfonts/sonivox.sf2';
    
    this.score = ScoreLoader.loadAlphaTex(tex, settings);
    return this.convertScoreToSong(this.score);
  }

  private convertScoreToSong(score: AlphaTabScore): GuitarSong {
    const guitarTracks = score.tracks?.filter((t: any) =>
      t.instrument === 24 ||
      t.instrument === 25 ||
      t.instrument === 33 ||
      (!t.isPercussion && t.name?.toLowerCase().includes('guitar'))
    ) || [];

    const tuning = this.extractTuning(guitarTracks[0]);
    const sections = this.extractSections(guitarTracks, score.tempo);
    const chords = this.extractChords(score);

    return {
      id: score.title.toLowerCase().replace(/\s+/g, '-'),
      title: score.title,
      artist: score.artist || 'Unknown',
      tuning,
      capo: 0,
      sections,
      chords,
    };
  }

  private extractTuning(track: AlphaTabTrack): Tuning {
    const strings = track.tuning;
    return {
      name: 'Custom',
      notes: strings.map((s: any) => s.tone),
      strings: strings.length,
    };
  }

  private extractSections(tracks: AlphaTabTrack[], tempo: number): TabSection[] {
    const sections: TabSection[] = [];
    let currentSection: TabSection | null = null;

    for (const track of tracks) {
      for (const measure of track.measures || []) {
        if (measure.isAnacrusis) continue;

        const sectionName = measure.section?.name || `Section ${sections.length + 1}`;
        if (!currentSection || currentSection.name !== sectionName) {
          if (currentSection) sections.push(currentSection);
          currentSection = {
            id: sectionName.toLowerCase().replace(/\s+/g, '-'),
            name: sectionName,
            measures: [],
            tempo: tempo || 120,
          };
        }

        const notes: TabNote[] = [];
        for (const voice of measure.voices || []) {
          for (const beat of voice.beats || []) {
            for (const note of beat.notes || []) {
              notes.push({
                string: (note.string) as GuitarString,
                fret: note.fret,
                duration: beat.duration,
                startTime: beat.playbackTime,
                techniques: this.extractTechniques(note),
                finger: note.finger,
              });
            }
          }
        }

        currentSection.measures.push({
          notes,
          startTime: measure.playbackTime,
          duration: measure.duration,
          timeSignature: { numerator: measure.timeSignature.numerator, denominator: measure.timeSignature.denominator },
        });
      }
    }

    if (currentSection) sections.push(currentSection);
    return sections;
  }

  private extractTechniques(note: AlphaTabNote): TabTechnique[] {
    const techniques: TabTechnique[] = [];
    if (note.slideType !== 0) techniques.push('slide');
    if (note.isBend) techniques.push('bend');
    if (note.hammerPullType === 1) techniques.push('hammer-on');
    if (note.hammerPullType === 2) techniques.push('pull-off');
    if (note.vibratoType !== 0) techniques.push('vibrato');
    if (note.isPalmMute) techniques.push('palm-mute');
    if (note.isHarmonic) techniques.push('harmonic');
    if (note.isLetRing) techniques.push('let-ring');
    if (note.isDeadNote) techniques.push('dead-note');
    if (note.isGrace) techniques.push('grace-note');
    if (note.tapType !== 0) techniques.push('tap');
    return techniques;
  }

  private extractChords(score: AlphaTabScore): ChordShape[] {
    const chords: ChordShape[] = [];
    for (const track of score.tracks || []) {
      for (const measure of track.measures || []) {
        for (const chord of measure.chords || []) {
          const shape = this.convertAlphaTabChord(chord);
          if (shape && !chords.find(c => c.id === shape.id)) {
            chords.push(shape);
          }
        }
      }
    }
    return chords;
  }

  private convertAlphaTabChord(chord: any): ChordShape | null {
    try {
      const frets: (number | null)[] = [null, null, null, null, null, null];
      const fingers: Fingering[] = [];

      for (let i = 0; i < chord.fingers.length; i++) {
        const finger = chord.fingers[i];
        const string = chord.strings[i];
        if (finger > 0) {
          frets[string - 1] = finger;
          fingers.push({ finger: finger as Finger, string: string as GuitarString, fret: finger });
        } else {
          frets[string - 1] = 0;
        }
      }

      return {
        id: `chord-${chord.root}-${chord.type}`,
        name: `${chord.root}${chord.type}`,
        quality: chord.type,
        root: chord.root,
        frets,
        fingers,
        barredFrets: [],
        tuning: STANDARD_TUNING,
        difficulty: 1,
        position: 0,
        voicing: 'open',
      };
    } catch {
      return null;
    }
  }

  renderTab(song: GuitarSong, container: HTMLElement): void {
    if (!this.score) return;

    this.container = container;
    container.innerHTML = '';

    const settings = new Settings();
    settings.display.layoutMode = LayoutMode.Page;
    settings.display.staveProfile = StaveProfile.ScoreTab;
    settings.player.playerMode = PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = '/soundfonts/sonivox.sf2';

    this.api = new AlphaTabApi(container, settings);
    this.api.load(this.score);
  }

  renderChordDiagram(chord: ChordShape, container: HTMLElement, options: ChordDiagramOptions = {}): void {
    const { showFingers = true, showIntervals = false, size = 'medium', orientation = 'vertical' } = options;

    const svg = this.generateChordDiagramSVG(chord, { showFingers, showIntervals, size, orientation });
    container.innerHTML = svg;
  }

  private generateChordDiagramSVG(chord: ChordShape, options: { showFingers: boolean; showIntervals: boolean; size: string; orientation: string }): string {
    const { showFingers, showIntervals, size, orientation } = options;
    const scale = size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
    const frets = chord.frets;
    const maxFret = Math.max(...frets.filter(f => f !== null)) || 3;
    const startFret = chord.position > 0 ? chord.position : 0;
    const numFrets = Math.max(4, maxFret - startFret + 1);

    const width = orientation === 'vertical' ? 120 * scale : 200 * scale;
    const height = orientation === 'vertical' ? (numFrets + 1) * 30 * scale : 120 * scale;

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<style>.fret { stroke: #333; stroke-width: 1.5; } .string { stroke: #666; stroke-width: ${orientation === 'vertical' ? '1' : '1.5'}; } .dot { fill: #111; } .barre { stroke: #111; stroke-width: 4; fill: none; } .label { font-family: system-ui; font-size: ${10 * scale}px; fill: #111; text-anchor: middle; }</style>`;

    const stringSpacing = width / 7;
    const fretSpacing = height / (numFrets + 1);

    for (let s = 0; s < 6; s++) {
      const x = stringSpacing * (s + 1);
      if (orientation === 'vertical') {
        svg += `<line class="string" x1="${x}" y1="${fretSpacing}" x2="${x}" y2="${height - fretSpacing}"/>`;
      } else {
        svg += `<line class="string" x1="${fretSpacing}" y1="${x}" x2="${width - fretSpacing}" y2="${x}"/>`;
      }
    }

    for (let f = 0; f <= numFrets; f++) {
      const y = fretSpacing * (f + 1);
      const strokeWidth = f === 0 && startFret === 0 ? 3 : 1.5;
      if (orientation === 'vertical') {
        svg += `<line class="fret" x1="${stringSpacing}" y1="${y}" x2="${width - stringSpacing}" y2="${y}" stroke-width="${strokeWidth}"/>`;
      } else {
        svg += `<line class="fret" x1="${y}" y1="${stringSpacing}" x2="${y}" y2="${height - stringSpacing}" stroke-width="${strokeWidth}"/>`;
      }
    }

    if (chord.barredFrets.length > 0) {
      for (const barreFret of chord.barredFrets) {
        const relFret = barreFret - startFret;
        if (relFret >= 0 && relFret <= numFrets) {
          const y = fretSpacing * (relFret + 1);
          if (orientation === 'vertical') {
            svg += `<line class="barre" x1="${stringSpacing}" y1="${y}" x2="${width - stringSpacing}" y2="${y}"/>`;
          }
        }
      }
    }

    for (let s = 0; s < 6; s++) {
      const fret = frets[s];
      const x = stringSpacing * (s + 1);
      if (fret !== null && fret >= 0) {
        const relFret = fret - startFret;
        if (relFret >= 0 && relFret <= numFrets) {
          const y = fretSpacing * (relFret + 0.5);
          if (orientation === 'vertical') {
            svg += `<circle class="dot" cx="${x}" cy="${y}" r="${8 * scale}"/>`;
            if (showFingers) {
              const finger = chord.fingers.find(f => f.string === s + 1);
              if (finger) {
                svg += `<text class="label" x="${x}" y="${y + 3 * scale}">${finger.finger}</text>`;
              }
            }
          }
        } else if (fret === 0) {
          const y = fretSpacing * 0.3;
          if (orientation === 'vertical') {
            svg += `<text class="label" x="${x}" y="${y}">○</text>`;
          }
        } else if (fret === null) {
          const y = fretSpacing * 0.3;
          if (orientation === 'vertical') {
            svg += `<text class="label" x="${x}" y="${y}">×</text>`;
          }
        }
      }
    }

    if (startFret > 0) {
      const labelX = orientation === 'vertical' ? width - 15 : width - 30;
      const labelY = orientation === 'vertical' ? 15 : height - 15;
      svg += `<text class="label" x="${labelX}" y="${labelY}" font-size="${8 * scale}px">${startFret}fr</text>`;
    }

    svg += `</svg>`;
    return svg;
  }

  renderFretboard(scale: ScalePosition, container: HTMLElement, options: FretboardOptions = {}): void {
    const { showNotes = true, showIntervals = false, highlightRoot = true, fretRange = { from: 0, to: 12 } } = options;

    const svg = this.generateFretboardSVG(scale, { showNotes, showIntervals, highlightRoot, fretRange });
    container.innerHTML = svg;
  }

  private generateFretboardSVG(scale: ScalePosition, options: { showNotes: boolean; showIntervals: boolean; highlightRoot: boolean; fretRange: { from: number; to: number } }): string {
    const { showNotes, showIntervals, highlightRoot, fretRange } = options;
    const width = 600;
    const height = 200;
    const stringSpacing = height / 7;
    const fretSpacing = width / (fretRange.to - fretRange.from + 2);

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<style>.fret { stroke: #ddd; stroke-width: 1; } .string { stroke: #999; stroke-width: 1.5; } .note { fill: #2563eb; } .root { fill: #dc2626; } .interval { font-family: system-ui; font-size: 10px; fill: #666; text-anchor: middle; }</style>`;

    for (let s = 0; s < 6; s++) {
      const y = stringSpacing * (s + 1);
      svg += `<line class="string" x1="${fretSpacing}" y1="${y}" x2="${width - fretSpacing}" y2="${y}"/>`;
    }

    for (let f = fretRange.from; f <= fretRange.to; f++) {
      const x = fretSpacing * (f - fretRange.from + 1);
      const strokeWidth = f === 0 ? 3 : 1;
      svg += `<line class="fret" x1="${x}" y1="${stringSpacing}" x2="${x}" y2="${height - stringSpacing}" stroke-width="${strokeWidth}"/>`;
    }

    const rootMidi = this.noteNameToMidi(scale.root);

    for (const position of scale.positions) {
      for (const notePos of position) {
        if (notePos.fret < fretRange.from || notePos.fret > fretRange.to) continue;
        const x = fretSpacing * (notePos.fret - fretRange.from + 0.5);
        const y = stringSpacing * notePos.string;
        const isRoot = (notePos.note - rootMidi) % 12 === 0;
        const className = isRoot && highlightRoot ? 'note root' : 'note';
        svg += `<circle class="${className}" cx="${x}" cy="${y}" r="8"/>`;
        if (showNotes || showIntervals) {
          const label = showNotes ? notePos.noteName : this.getInterval(rootMidi, notePos.note);
          svg += `<text class="interval" x="${x}" y="${y + 3}">${label}</text>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  private getInterval(root: number, note: number): string {
    const intervals = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'];
    return intervals[(note - root + 12) % 12];
  }

  async playSong(song: GuitarSong, state: PracticeState): Promise<void> {
    if (!this.score || !this.api) return;

    this.currentState = state;

    this.api.playbackSpeed = state.tempo / (this.score.tempo || 120);

    if (state.loopEnabled && state.loopStart !== undefined && state.loopEnd !== undefined) {
      this.api.playbackRange = { start: state.loopStart, end: state.loopEnd };
      this.api.isLooping = true;
    }

    this.api.play();
  }

  stopPlayback(): void {
    this.api?.pause();
  }

  setTempo(tempo: number): void {
    if (this.api && this.score) {
      this.api.playbackSpeed = tempo / (this.score.tempo || 120);
    }
  }

  seek(time: number): void {
    this.api?.seek(time);
  }

  setLoop(start: number, end: number): void {
    if (this.api) {
      this.api.playbackRange = { start, end };
      this.api.isLooping = true;
    }
  }

  on(event: string, handler: (event: GuitarEngineEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    if (this.api) {
      switch (event) {
        case 'position-change':
          this.api.positionChanged.on((args: any) => {
            handler({ type: 'position-change', position: args.currentTime });
          });
          break;
        case 'section-change':
          this.api.finished.on(() => {
            handler({ type: 'section-change', sectionId: 'end' });
          });
          break;
      }
    }
  }

  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler as any);
  }

  private emit(event: GuitarEngineEvent): void {
    this.eventHandlers.get(event.type)?.forEach(h => h(event));
  }
}

export class AlphaTabEngineFactory {
  createEngine(): GuitarEngine {
    return new AlphaTabEngine();
  }
}