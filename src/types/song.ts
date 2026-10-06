export interface Note {
  name: string;
  midi: number;
  frequency: number;
}

export interface Syllable {
  text: string;
  note: Note;
  startTime: number;
  duration: number;
  pronunciation?: string;
  humPattern?: string;
  voiceDirection?: string;
}

export interface LyricLine {
  id: string;
  text: string;
  syllables: Syllable[];
  pronunciation?: string;
  visualContour?: string;
  voiceDirection?: string;
  startTime: number;
  duration: number;
}

export interface SongSection {
  id: string;
  name: string;
  type: 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro';
  lines: LyricLine[];
  audioFile: string;
  userAudioFile: string;
  startTime: number;
  duration: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  timeSignature: string;
  sections: SongSection[];
  totalDuration: number;
}

export type PracticeMode = 'guide' | 'user' | 'practice' | 'hum' | 'mic';

export interface PracticeState {
  mode: PracticeMode;
  isPlaying: boolean;
  currentTime: number;
  tempo: number;
  loopMode: 'off' | 'line' | 'phrase';
  loopCount: number;
  guideMuted: boolean;
}

export type PracticeStatus = 'listen' | 'try' | 'repeat' | 'master';
