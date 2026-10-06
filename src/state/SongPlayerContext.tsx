'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SONG } from '@/data/song';
import type { LyricLine, SongSection, PracticeMode } from '@/types/song';

export type VoiceSource = 'male' | 'user';
export type LoopMode = 'off' | 'line' | 'section';
export type GuideSpeed = 'normal' | 'slow';

export interface StemVolumes {
  guideVocal: number;   // 0.0 to 1.0
  instrumental: number; // 0.0 to 1.0
  melodyRef: number;    // 0.0 to 1.0
  userVoice: number;    // 0.0 to 1.0
  metronome: number;    // 0.0 to 1.0
  mic: number;          // 0.0 to 1.0
}

export interface SongPlayerValue {
  sectionId: string;
  section: SongSection;
  mode: PracticeMode;
  voiceSource: VoiceSource;
  guideSpeed: GuideSpeed;
  tempo: number;
  loopMode: LoopMode;
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  activeLineId: string | null;
  currentLineId: string | null;
  currentSyllableText: string | null;
  currentNoteName: string | null;
  lines: LyricLine[];
  stems: StemVolumes;

  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  setSection: (id: string) => void;
  setMode: (m: PracticeMode) => void;
  setVoiceSource: (v: VoiceSource) => void;
  setGuideSpeed: (s: GuideSpeed) => void;
  setTempo: (t: number) => void;
  setLoopMode: (m: LoopMode) => void;
  setStemVolume: (stem: keyof StemVolumes, vol: number) => void;
  seekToTime: (t: number) => void;
  seekToLine: (lineId: string) => void;
  playLineOnly: (lineId: string) => void;
  loopLine: (lineId: string) => void;

  // Recording
  isRecording: boolean;
  recordedAudioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

const PlayerContext = createContext<SongPlayerValue | null>(null);

export function useSongPlayer(): SongPlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('useSongPlayer must be used inside <SongPlayerProvider>');
  }
  return ctx;
}

function sectionById(id: string): SongSection {
  return SONG.sections.find((s) => s.id === id) ?? SONG.sections[0];
}

export function lineAtTime(lines: LyricLine[], t: number): LyricLine | null {
  for (const line of lines) {
    if (t >= line.startTime && t < line.startTime + line.duration) return line;
  }
  const last = lines[lines.length - 1];
  if (last && t >= last.startTime && t < last.startTime + last.duration + 0.3) return last;
  return null;
}

export function syllableAtTime(line: LyricLine | null, t: number) {
  if (!line) return null;
  const lineRelTime = t - line.startTime;
  for (const syl of line.syllables) {
    if (lineRelTime >= syl.startTime && lineRelTime < syl.startTime + syl.duration) {
      return syl;
    }
  }
  return null;
}

type PitchPreservingAudio = HTMLAudioElement & { preservesPitch?: boolean };

function preservePitch(audio: HTMLAudioElement) {
  const media = audio as PitchPreservingAudio;
  if ('preservesPitch' in media) media.preservesPitch = true;
}

export function SongPlayerProvider({ children }: { children: React.ReactNode }) {
  const [sectionId, setSectionIdState] = useState(SONG.sections[0].id);
  const [mode, setModeState] = useState<PracticeMode>('guide');
  const [voiceSource, setVoiceSourceState] = useState<VoiceSource>('male');
  const [guideSpeed, setGuideSpeedState] = useState<GuideSpeed>('normal');
  const [tempo, setTempoState] = useState(1.0);
  const [loopMode, setLoopModeState] = useState<LoopMode>('off');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [currentLineId, setCurrentLineId] = useState<string | null>(null);
  const [currentSyllableText, setCurrentSyllableText] = useState<string | null>(null);
  const [currentNoteName, setCurrentNoteName] = useState<string | null>(null);

  // Stems volumes
  const [stems, setStemsState] = useState<StemVolumes>({
    guideVocal: 0.9,
    instrumental: 0.85,
    melodyRef: 0.0,
    userVoice: 0.0,
    metronome: 0.0,
    mic: 0.0,
  });

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Synchronized Multi-Stem Audio Elements
  const audioVocalRef = useRef<HTMLAudioElement | null>(null);
  const audioInstRef = useRef<HTMLAudioElement | null>(null);
  const audioMelodyRef = useRef<HTMLAudioElement | null>(null);
  const audioUserRef = useRef<HTMLAudioElement | null>(null);

  const rafRef = useRef<number>(0);
  const isSeekingRef = useRef(false);
  const playRef = useRef<() => void>(() => undefined);
  const pauseRef = useRef<() => void>(() => undefined);
  const seekRef = useRef<(time: number) => void>(() => undefined);

  // Active section data
  const currentSection = sectionById(sectionId);
  const lines = currentSection.lines;

  // Master Audio Init
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vocal = new Audio();
    const inst = new Audio();
    const melody = new Audio();
    const user = new Audio();

    [vocal, inst, melody, user].forEach((a) => {
      a.preload = 'auto';
      preservePitch(a);
    });

    audioVocalRef.current = vocal;
    audioInstRef.current = inst;
    audioMelodyRef.current = melody;
    audioUserRef.current = user;

    const onLoadedMeta = () => {
      const d = vocal.duration || inst.duration || 0;
      if (d > 0) {
        setDuration(d);
        setIsReady(true);
      }
    };

    const onEnded = () => {
      if (loopMode === 'section') {
        seekRef.current(0);
        playRef.current();
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    vocal.addEventListener('loadedmetadata', onLoadedMeta);
    vocal.addEventListener('ended', onEnded);
    inst.addEventListener('loadedmetadata', onLoadedMeta);

    return () => {
      vocal.removeEventListener('loadedmetadata', onLoadedMeta);
      vocal.removeEventListener('ended', onEnded);
      inst.removeEventListener('loadedmetadata', onLoadedMeta);
      [vocal, inst, melody, user].forEach((a) => {
        a.pause();
        a.src = '';
      });
    };
  }, [loopMode]);

  // Load section stems
  const loadSectionStems = useCallback((sid: string) => {
    const sec = sectionById(sid);
    const vocal = audioVocalRef.current;
    const inst = audioInstRef.current;
    const melody = audioMelodyRef.current;
    const user = audioUserRef.current;

    if (!vocal || !inst || !melody || !user) return;

    const vUrl = sec.audioFile || `/audio/canonical/${sec.id}_guide_vocal.wav`;
    const iUrl = sec.instrumentalAudioFile || `/audio/canonical/${sec.id}_instrumental.wav`;
    const mUrl = sec.melodyAudioFile || `/audio/canonical/${sec.id}_melody_ref.wav`;
    const uUrl = sec.userAudioFile || `/audio/canonical/${sec.id}_user_voice.wav`;

    vocal.src = vUrl;
    inst.src = iUrl;
    melody.src = mUrl;
    user.src = uUrl;

    vocal.load();
    inst.load();
    melody.load();
    user.load();
  }, []);

  // Update stem volumes on audio elements
  useEffect(() => {
    if (audioVocalRef.current) audioVocalRef.current.volume = Math.max(0, Math.min(1, stems.guideVocal));
    if (audioInstRef.current) audioInstRef.current.volume = Math.max(0, Math.min(1, stems.instrumental));
    if (audioMelodyRef.current) audioMelodyRef.current.volume = Math.max(0, Math.min(1, stems.melodyRef));
    if (audioUserRef.current) audioUserRef.current.volume = Math.max(0, Math.min(1, stems.userVoice));
  }, [stems]);

  // Update playback rate on all stems (with pitch preserved)
  useEffect(() => {
    const rate = Math.max(0.5, Math.min(1.5, tempo * (guideSpeed === 'slow' ? 0.75 : 1.0)));
    [audioVocalRef.current, audioInstRef.current, audioMelodyRef.current, audioUserRef.current].forEach((a) => {
      if (a) {
        a.playbackRate = rate;
        preservePitch(a);
      }
    });
  }, [tempo, guideSpeed]);

  // Initial load
  useEffect(() => {
    loadSectionStems(sectionId);
  }, [sectionId, loadSectionStems]);

  // Master Playback controls
  const play = useCallback(() => {
    const vocal = audioVocalRef.current;
    const inst = audioInstRef.current;
    const melody = audioMelodyRef.current;
    const user = audioUserRef.current;

    if (!vocal || !inst) return;

    // Sync all to current master position before firing
    const cur = vocal.currentTime || 0;
    if (inst) inst.currentTime = cur;
    if (melody) melody.currentTime = cur;
    if (user) user.currentTime = cur;

    Promise.all([
      vocal.play().catch(() => {}),
      inst.play().catch(() => {}),
      melody ? melody.play().catch(() => {}) : Promise.resolve(),
      user ? user.play().catch(() => {}) : Promise.resolve(),
    ]).then(() => {
      setIsPlaying(true);
    });
  }, []);

  const pause = useCallback(() => {
    [audioVocalRef.current, audioInstRef.current, audioMelodyRef.current, audioUserRef.current].forEach((a) => {
      if (a) a.pause();
    });
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seekToTime = useCallback((t: number) => {
    isSeekingRef.current = true;
    const clamped = Math.max(0, t);
    [audioVocalRef.current, audioInstRef.current, audioMelodyRef.current, audioUserRef.current].forEach((a) => {
      if (a) a.currentTime = clamped;
    });
    setCurrentTime(clamped);
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 50);
  }, []);

  const stop = useCallback(() => {
    pause();
    seekToTime(0);
  }, [pause, seekToTime]);

  useEffect(() => {
    playRef.current = play;
    pauseRef.current = pause;
    seekRef.current = seekToTime;
  }, [play, pause, seekToTime]);

  // Change section
  const setSection = useCallback(
    (id: string) => {
      pauseRef.current();
      setSectionIdState(id);
      setCurrentTime(0);
      setActiveLineId(null);
      loadSectionStems(id);
    },
    [loadSectionStems],
  );

  const seekToLine = useCallback(
    (lineId: string) => {
      const line = lines.find((l) => l.id === lineId);
      if (line) {
        setActiveLineId(lineId);
        seekToTime(line.startTime);
      }
    },
    [lines, seekToTime],
  );

  const playLineOnly = useCallback(
    (lineId: string) => {
      seekToLine(lineId);
      play();
    },
    [seekToLine, play],
  );

  const loopLine = useCallback(
    (lineId: string) => {
      setActiveLineId(lineId);
      setLoopModeState('line');
      seekToLine(lineId);
      play();
    },
    [seekToLine, play],
  );

  // Set Mode presets
  const setMode = useCallback((m: PracticeMode) => {
    setModeState(m);
    if (m === 'guide') {
      setStemsState({
        guideVocal: 0.9,
        instrumental: 0.85,
        melodyRef: 0.0,
        userVoice: 0.0,
        metronome: 0.0,
        mic: 0.0,
      });
      setVoiceSourceState('male');
    } else if (m === 'hum') {
      setStemsState({
        guideVocal: 0.0,
        instrumental: 0.85,
        melodyRef: 0.9,
        userVoice: 0.0,
        metronome: 0.0,
        mic: 0.0,
      });
    } else if (m === 'practice') {
      setStemsState({
        guideVocal: 0.75,
        instrumental: 0.85,
        melodyRef: 0.2,
        userVoice: 0.0,
        metronome: 0.0,
        mic: 1.0,
      });
    } else if (m === 'user') {
      setStemsState({
        guideVocal: 0.0,
        instrumental: 0.85,
        melodyRef: 0.0,
        userVoice: 0.9,
        metronome: 0.0,
        mic: 0.0,
      });
      setVoiceSourceState('user');
    } else if (m === 'mic') {
      setStemsState({
        guideVocal: 0.0,
        instrumental: 0.9,
        melodyRef: 0.0,
        userVoice: 0.0,
        metronome: 0.0,
        mic: 1.0,
      });
    }
  }, []);

  const setStemVolume = useCallback((stem: keyof StemVolumes, vol: number) => {
    setStemsState((prev) => ({ ...prev, [stem]: Math.max(0, Math.min(1, vol)) }));
  }, []);

  // Animation Frame Loop for Time Synchronization & Line Looping
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const vocal = audioVocalRef.current;
      const inst = audioInstRef.current;

      if (vocal && !isSeekingRef.current && isPlaying) {
        const cur = vocal.currentTime;
        setCurrentTime(cur);

        // Keep instrumental synchronized if it drifts > 0.04s
        if (inst && Math.abs(inst.currentTime - cur) > 0.04) {
          inst.currentTime = cur;
        }

        // Line-by-Line Tracking
        const activeLine = lineAtTime(lines, cur);
        setCurrentLineId(activeLine ? activeLine.id : null);

        // Syllable Tracking
        const syl = syllableAtTime(activeLine, cur);
        if (syl) {
          setCurrentSyllableText(syl.text);
          setCurrentNoteName(syl.note.name);
        } else {
          setCurrentSyllableText(null);
          setCurrentNoteName(null);
        }

        // Line Loop Handler
        if (loopMode === 'line' && activeLineId) {
          const targetLine = lines.find((l) => l.id === activeLineId);
          if (targetLine && cur >= targetLine.startTime + targetLine.duration) {
            seekToTime(targetLine.startTime);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, lines, loopMode, activeLineId, seekToTime]);

  // Recording Actions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      play();
    } catch (err) {
      alert('Microphone access needed to record: ' + err);
    }
  }, [play]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      pause();
    }
  }, [isRecording, pause]);

  const value: SongPlayerValue = {
    sectionId,
    section: currentSection,
    mode,
    voiceSource,
    guideSpeed,
    tempo,
    loopMode,
    isPlaying,
    isReady,
    currentTime,
    duration,
    activeLineId,
    currentLineId,
    currentSyllableText,
    currentNoteName,
    lines,
    stems,

    play,
    pause,
    togglePlay,
    stop,
    setSection,
    setMode,
    setVoiceSource: setVoiceSourceState,
    setGuideSpeed: setGuideSpeedState,
    setTempo: setTempoState,
    setLoopMode: setLoopModeState,
    setStemVolume,
    seekToTime,
    seekToLine,
    playLineOnly,
    loopLine,

    isRecording,
    recordedAudioUrl,
    startRecording,
    stopRecording,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
