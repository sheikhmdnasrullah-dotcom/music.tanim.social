'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SONG, getSongById } from '@/data/song';
import type { Song, SongSection, PracticeMode } from '@/types/song';
export type { PracticeMode } from '@/types/song';
import {
  buildSectionTiming,
  findLineAtTime,
  findSyllableIndex,
  getPhraseBounds,
  type SectionTiming,
  type TimedLine,
} from '@/lib/music/timing';

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

/** A line placed on the song-wide timeline (section offset + line position). */
interface SongLineEntry {
  line: TimedLine;
  sectionId: string;
  songStart: number;
  songEnd: number;
}

export interface SongPlayerValue {
  currentSongId: string;
  currentSong: Song;
  sectionId: string;
  section: SongSection;
  mode: PracticeMode;
  voiceSource: VoiceSource;
  guideSpeed: GuideSpeed;
  tempo: number;
  loopMode: LoopMode;
  autoAdvance: boolean;
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  /** Position on the song-wide timeline (all sections chained). */
  songTime: number;
  /** Total duration of the song on the song-wide timeline. */
  songDuration: number;
  activeLineId: string | null;
  currentLineId: string | null;
  currentSyllableText: string | null;
  currentSyllableIndex: number | null;
  currentNoteName: string | null;
  lines: TimedLine[];
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
  setAutoAdvance: (enabled: boolean) => void;
  setStemVolume: (stem: keyof StemVolumes, vol: number) => void;
  seekToTime: (t: number) => void;
  seekToSongTime: (t: number) => void;
  seekToLine: (lineId: string) => void;
  seekToNextLine: () => void;
  seekToPrevLine: () => void;
  playLineOnly: (lineId: string) => void;
  loopLine: (lineId: string) => void;
  setCurrentSong: (id: string) => void;
  /** Switch song, reset to its first line, and start playing. */
  playSong: (id: string) => void;
  /** Restart the current song from its first line and play. */
  playFromStart: () => void;

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

type PitchPreservingAudio = HTMLAudioElement & { preservesPitch?: boolean };

function preservePitch(audio: HTMLAudioElement) {
  const media = audio as PitchPreservingAudio;
  if ('preservesPitch' in media) media.preservesPitch = true;
}

export function SongPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSongId, setCurrentSongId] = useState(SONG.id);
  const [sectionId, setSectionIdState] = useState(SONG.sections[0].id);
  const [mode, setModeState] = useState<PracticeMode>('guide');
  const [voiceSource, setVoiceSourceState] = useState<VoiceSource>('male');
  const [guideSpeed, setGuideSpeedState] = useState<GuideSpeed>('normal');
  const [tempo, setTempoState] = useState(1.0);
  const [loopMode, setLoopModeState] = useState<LoopMode>('off');
  const [autoAdvance, setAutoAdvanceState] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [currentLineId, setCurrentLineId] = useState<string | null>(null);
  const [currentSyllableText, setCurrentSyllableText] = useState<string | null>(null);
  const [currentSyllableIndex, setCurrentSyllableIndex] = useState<number | null>(null);
  const [currentNoteName, setCurrentNoteName] = useState<string | null>(null);

  const currentSong = useMemo(() => {
    if (currentSongId === SONG.id) return SONG;
    return getSongById(currentSongId) ?? SONG;
  }, [currentSongId]);

  const sectionById = (id: string): SongSection => {
    return currentSong.sections.find((s) => s.id === id) ?? currentSong.sections[0];
  };

  const currentSection = sectionById(sectionId);
  const timing: SectionTiming = useMemo(() => buildSectionTiming(currentSection), [currentSection]);
  const lines: TimedLine[] = timing.lines;

  // Song-wide timeline: sections chained in playing order. The per-section
  // timings are derived from the section stems themselves, so chaining them
  // reproduces the practice timeline exactly.
  const sectionOffsets = useMemo(() => {
    const map = new Map<string, number>();
    let acc = 0;
    for (const sec of currentSong.sections) {
      map.set(sec.id, acc);
      acc += buildSectionTiming(sec).duration;
    }
    return map;
  }, [currentSong]);

  const songDuration = useMemo(() => {
    let total = 0;
    for (const sec of currentSong.sections) {
      total += buildSectionTiming(sec).duration;
    }
    return total;
  }, [currentSong]);

  const songTime = useMemo(
    () => (sectionOffsets.get(sectionId) ?? 0) + currentTime,
    [sectionOffsets, sectionId, currentTime],
  );

  // Every line of the song on the song-wide timeline, in playing order.
  const songLines = useMemo(() => {
    const out: SongLineEntry[] = [];
    let acc = 0;
    for (const sec of currentSong.sections) {
      const t = buildSectionTiming(sec);
      for (const line of t.lines) {
        out.push({
          line,
          sectionId: sec.id,
          songStart: acc + line.absoluteStart,
          songEnd: acc + line.activeEnd,
        });
      }
      acc += t.duration;
    }
    return out;
  }, [currentSong]);

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
  const advanceRef = useRef<() => void>(() => undefined);
  const lastAdvanceAtRef = useRef(0);
  const loadedKeyRef = useRef('');

  // Refs mirroring state so audio callbacks never close over stale values.
  const currentSongRef = useRef(currentSong);
  const sectionIdRef = useRef(sectionId);
  const loopModeRef = useRef(loopMode);
  const activeLineIdRef = useRef(activeLineId);
  const isPlayingRef = useRef(isPlaying);
  const autoAdvanceRef = useRef(autoAdvance);
  const sectionOffsetsRef = useRef(sectionOffsets);
  const songLinesRef = useRef(songLines);

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { sectionIdRef.current = sectionId; }, [sectionId]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { activeLineIdRef.current = activeLineId; }, [activeLineId]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { autoAdvanceRef.current = autoAdvance; }, [autoAdvance]);
  useEffect(() => { sectionOffsetsRef.current = sectionOffsets; }, [sectionOffsets]);
  useEffect(() => { songLinesRef.current = songLines; }, [songLines]);

  // Load the stems for a specific song + section. Idempotent: reloading the
  // same song/section pair is a no-op, so state-driven effects and explicit
  // calls never double-buffer the same audio.
  const loadStemsFor = useCallback((song: Song, sid: string) => {
    const sec = song.sections.find((s) => s.id === sid) ?? song.sections[0];
    if (!sec) return;
    const key = `${song.id}:${sec.id}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    const vocal = audioVocalRef.current;
    const inst = audioInstRef.current;
    const melody = audioMelodyRef.current;
    const user = audioUserRef.current;
    if (!vocal || !inst || !melody || !user) return;

    vocal.src = sec.audioFile || `/audio/canonical/${sec.id}_guide_vocal.wav`;
    inst.src = sec.instrumentalAudioFile || `/audio/canonical/${sec.id}_instrumental.wav`;
    melody.src = sec.melodyAudioFile || `/audio/canonical/${sec.id}_melody_ref.wav`;
    user.src = sec.userAudioFile || `/audio/canonical/${sec.id}_user_voice.wav`;

    vocal.load();
    inst.load();
    melody.load();
    user.load();
  }, []);

  const loadSectionStems = useCallback(
    (sid: string) => {
      loadStemsFor(currentSongRef.current, sid);
    },
    [loadStemsFor],
  );

  // Move to the next section of the current song and keep playing. At the end
  // of the last section, stop cleanly. Debounced so the animation-frame safety
  // net and the audio "ended" event cannot advance twice.
  const advanceToNextSection = useCallback(() => {
    const now = performance.now();
    if (now - lastAdvanceAtRef.current < 400) return;
    lastAdvanceAtRef.current = now;

    const song = currentSongRef.current;
    const sid = sectionIdRef.current;
    const idx = song.sections.findIndex((s) => s.id === sid);
    if (idx < 0) return;
    const next = song.sections[idx + 1];

    if (!next) {
      [audioVocalRef.current, audioInstRef.current, audioMelodyRef.current, audioUserRef.current].forEach((a) => {
        if (a) a.pause();
      });
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentLineId(null);
      setCurrentSyllableText(null);
      setCurrentSyllableIndex(null);
      setCurrentNoteName(null);
      return;
    }

    setSectionIdState(next.id);
    setCurrentTime(0);
    setActiveLineId(null);
    setCurrentLineId(null);
    setCurrentSyllableText(null);
    setCurrentSyllableIndex(null);
    setCurrentNoteName(null);
    loadStemsFor(song, next.id);
    playRef.current();
  }, [loadStemsFor]);

  // Master Audio Init — created once; all handlers read refs so loop mode and
  // song changes never rebuild the audio elements mid-playback.
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
      const lm = loopModeRef.current;
      if (lm === 'section') {
        seekRef.current(0);
        playRef.current();
        return;
      }
      if (lm === 'line') {
        // Keep the phrase loop seamless: rewind to the start of the phrase
        // containing the active line.
        const song = currentSongRef.current;
        const sec = song.sections.find((s) => s.id === sectionIdRef.current) ?? song.sections[0];
        const t = buildSectionTiming(sec);
        const lineId = activeLineIdRef.current;
        const idx = lineId ? t.lines.findIndex((l) => l.id === lineId) : -1;
        const bounds = idx >= 0 ? getPhraseBounds(t, idx) : { start: 0, end: t.duration };
        seekRef.current(bounds.start);
        playRef.current();
        return;
      }
      if (autoAdvanceRef.current) {
        advanceRef.current();
      } else {
        [audioVocalRef.current, audioInstRef.current, audioMelodyRef.current, audioUserRef.current].forEach((a) => {
          if (a) a.pause();
        });
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

  // Initial load / reload when the section or song changes.
  useEffect(() => {
    loadStemsFor(currentSong, sectionId);
  }, [sectionId, currentSong, loadStemsFor]);

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

    Promise.allSettled([
      vocal.play(),
      inst.play(),
      melody ? melody.play() : Promise.reject(new Error('no melody stem')),
      user ? user.play() : Promise.reject(new Error('no user stem')),
    ]).then((results) => {
      // At least one stem must actually start; otherwise we would report a
      // phantom "playing" state while nothing is audible.
      if (results.some((r) => r.status === 'fulfilled')) setIsPlaying(true);
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

  useEffect(() => {
    playRef.current = play;
    pauseRef.current = pause;
    seekRef.current = seekToTime;
    advanceRef.current = advanceToNextSection;
  }, [play, pause, seekToTime, advanceToNextSection]);

  // Change section
  const setSection = useCallback(
    (id: string) => {
      pauseRef.current();
      setSectionIdState(id);
      setCurrentTime(0);
      setActiveLineId(null);
      setCurrentLineId(null);
      loadSectionStems(id);
    },
    [loadSectionStems],
  );

  const setCurrentSong = useCallback(
    (id: string) => {
      if (id === currentSongId) return;
      pauseRef.current();
      const newSong = getSongById(id) ?? SONG;
      const first = newSong.sections[0];
      if (!first) return;
      setCurrentSongId(id);
      setSectionIdState(first.id);
      setCurrentTime(0);
      setActiveLineId(null);
      setCurrentLineId(null);
      setCurrentSyllableText(null);
      setCurrentSyllableIndex(null);
      setCurrentNoteName(null);
      loadStemsFor(newSong, first.id);
    },
    [currentSongId, loadStemsFor],
  );

  // Switch to a song, reset it to its first line, and start playing. Called
  // from a user gesture (My Songs play button) so autoplay policies allow it.
  const playSong = useCallback(
    (id: string) => {
      const song = getSongById(id) ?? SONG;
      const first = song.sections[0];
      if (!first) return;
      pauseRef.current();
      setCurrentSongId(id);
      setSectionIdState(first.id);
      setCurrentTime(0);
      setActiveLineId(null);
      setCurrentLineId(null);
      setCurrentSyllableText(null);
      setCurrentSyllableIndex(null);
      setCurrentNoteName(null);
      loadStemsFor(song, first.id);
      playRef.current();
    },
    [loadStemsFor],
  );

  const playFromStart = useCallback(() => {
    const song = currentSongRef.current;
    const first = song.sections[0];
    if (!first) return;
    pauseRef.current();
    setSectionIdState(first.id);
    setCurrentTime(0);
    setActiveLineId(null);
    setCurrentLineId(null);
    setCurrentSyllableText(null);
    setCurrentSyllableIndex(null);
    setCurrentNoteName(null);
    loadStemsFor(song, first.id);
    playRef.current();
  }, [loadStemsFor]);

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
      const idx = lines.findIndex((l) => l.id === lineId);
      if (idx < 0) return;
      setActiveLineId(lineId);
      setLoopModeState('line');
      // Start at the beginning of the musical phrase so the loop is seamless.
      seekToTime(getPhraseBounds(timing, idx).start);
      play();
    },
    [lines, timing, seekToTime, play],
  );

  // Seek anywhere on the song-wide timeline, switching sections when needed.
  const seekToSongTime = useCallback(
    (t: number) => {
      const song = currentSongRef.current;
      const offsets = sectionOffsetsRef.current;
      let total = 0;
      for (const sec of song.sections) total += buildSectionTiming(sec).duration;
      const clamped = Math.max(0, Math.min(t, total));

      let target = song.sections[song.sections.length - 1];
      let localT = buildSectionTiming(target).duration;
      for (const sec of song.sections) {
        const start = offsets.get(sec.id) ?? 0;
        const dur = buildSectionTiming(sec).duration;
        if (clamped < start + dur) {
          target = sec;
          localT = clamped - start;
          break;
        }
      }

      if (target.id === sectionIdRef.current) {
        seekToTime(localT);
        return;
      }

      // Cross-section seek: swap stems, then apply the position once buffered.
      isSeekingRef.current = true;
      setSectionIdState(target.id);
      setCurrentTime(localT);
      setActiveLineId(null);
      setCurrentLineId(null);
      loadStemsFor(song, target.id);

      const applySeek = () => {
        [audioVocalRef.current, audioInstRef.current, audioMelodyRef.current, audioUserRef.current].forEach((a) => {
          if (a) a.currentTime = localT;
        });
        isSeekingRef.current = false;
        if (isPlayingRef.current) playRef.current();
      };

      const vocal = audioVocalRef.current;
      if (vocal && vocal.readyState >= 3) {
        applySeek();
        return;
      }
      if (!vocal) {
        isSeekingRef.current = false;
        return;
      }
      const onReady = () => {
        vocal.removeEventListener('canplay', onReady);
        applySeek();
      };
      vocal.addEventListener('canplay', onReady);
      setTimeout(() => {
        vocal.removeEventListener('canplay', onReady);
        if (isSeekingRef.current) applySeek();
      }, 3000);
    },
    [loadStemsFor, seekToTime],
  );

  // Keep a ref to seekToSongTime so late-bound callers can use it.
  const seekToSongTimeRef = useRef(seekToSongTime);
  useEffect(() => {
    seekToSongTimeRef.current = seekToSongTime;
  }, [seekToSongTime]);

  // Stop playback and return to the very start of the song.
  const stop = useCallback(() => {
    pause();
    seekToSongTimeRef.current(0);
  }, [pause]);

  const getSongTime = useCallback(() => {
    const sid = sectionIdRef.current;
    const offset = sectionOffsetsRef.current.get(sid) ?? 0;
    const cur = audioVocalRef.current?.currentTime ?? 0;
    return offset + cur;
  }, []);

  // Next/previous line across section boundaries (Spotify-style transport).
  const seekToNextLine = useCallback(() => {
    const songT = getSongTime();
    const next = songLinesRef.current.find((entry) => entry.songStart > songT + 0.05);
    if (next) seekToSongTime(next.songStart);
  }, [getSongTime, seekToSongTime]);

  const seekToPrevLine = useCallback(() => {
    const songT = getSongTime();
    const entries = songLinesRef.current;
    const currentIdx = entries.findIndex(
      (entry) => songT >= entry.songStart && songT < entry.songEnd,
    );
    // Well into a line: restart it. Otherwise step back one line.
    if (currentIdx >= 0 && songT - entries[currentIdx].songStart > 2) {
      seekToSongTime(entries[currentIdx].songStart);
      return;
    }
    const prev = entries[currentIdx - 1] ?? (currentIdx === -1 ? entries[0] : null);
    if (prev) seekToSongTime(prev.songStart);
  }, [getSongTime, seekToSongTime]);

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

  const setAutoAdvance = useCallback((enabled: boolean) => {
    setAutoAdvanceState(enabled);
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

        // Auto-advance: this section's timed content has ended, so move to
        // the next section and keep the song playing without a gap.
        if (autoAdvanceRef.current && loopMode === 'off' && cur >= timing.duration) {
          advanceRef.current();
        } else {
          setCurrentTime(cur);

          // Keep instrumental synchronized if it drifts > 0.04s
          if (inst && Math.abs(inst.currentTime - cur) > 0.04) {
            inst.currentTime = cur;
          }

          // Line-by-line tracking against the generated timeline (real times).
          const activeLine = findLineAtTime(timing, cur);
          setCurrentLineId(activeLine ? activeLine.id : null);

          // Syllable tracking — the exact syllable being sung right now.
          const sylIdx = activeLine ? findSyllableIndex(activeLine, cur) : -1;
          if (sylIdx >= 0 && activeLine) {
            const syl = activeLine.timedSyllables[sylIdx];
            setCurrentSyllableText(syl.text);
            setCurrentSyllableIndex(sylIdx);
            setCurrentNoteName(syl.note.name);
          } else {
            setCurrentSyllableText(null);
            setCurrentSyllableIndex(null);
            setCurrentNoteName(null);
          }

          // Phrase Loop Handler — loop the couplet containing the target line.
          if (loopMode === 'line' && activeLineId) {
            const idx = lines.findIndex((l) => l.id === activeLineId);
            if (idx >= 0) {
              const bounds = getPhraseBounds(timing, idx);
              if (cur >= bounds.end) seekToTime(bounds.start);
            }
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
  }, [isPlaying, timing, lines, loopMode, activeLineId, seekToTime]);

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
    currentSongId,
    currentSong,
    sectionId,
    section: currentSection,
    mode,
    voiceSource,
    guideSpeed,
    tempo,
    loopMode,
    autoAdvance,
    isPlaying,
    isReady,
    currentTime,
    duration,
    songTime,
    songDuration,
    activeLineId,
    currentLineId,
    currentSyllableText,
    currentSyllableIndex,
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
    setAutoAdvance,
    setStemVolume,
    seekToTime,
    seekToSongTime,
    seekToLine,
    seekToNextLine,
    seekToPrevLine,
    playLineOnly,
    loopLine,
    setCurrentSong,
    playSong,
    playFromStart,

    isRecording,
    recordedAudioUrl,
    startRecording,
    stopRecording,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
