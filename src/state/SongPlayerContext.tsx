'use client';

// One shared player for the whole app. Previously each component created its
// own WaveSurfer instance, so most controls did nothing. This provider owns
// the single WaveSurfer (MediaElement backend, pitch preserved) and every
// component reads and drives it through this context.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import WaveSurfer from 'wavesurfer.js';
import { SONG, getSectionAudio } from '@/data/song';
import { SECTION_TIMINGS } from '@/data/timings';
import type { LyricLine, SongSection } from '@/types/song';

export type VoiceSource = 'male' | 'user';
export type LoopMode = 'off' | 'line' | 'section';
export type GuideSpeed = 'normal' | 'slow';

/** Real 60 BPM practice files (where they exist). */
const SLOW_FILES: Record<string, string> = {
  'verse-1': '/audio/Guide — Verse 1.wav',
  'pre-chorus-1': '/audio/Guide — Pre-Chorus 1.wav',
  'chorus-1': '/audio/Guide — Chorus 1.wav',
  bridge: '/audio/Guide — Bridge.wav',
  outro: '/audio/Guide — Outro.wav',
};

/** 60 BPM / 80 BPM — used to rescale line timings and for the fallback. */
export const SLOW_FACTOR = 0.75;

function sectionById(id: string): SongSection {
  return SONG.sections.find((s) => s.id === id) ?? SONG.sections[0];
}

export function lineAtTime(lines: LyricLine[], t: number): LyricLine | null {
  for (const line of lines) {
    if (t >= line.startTime && t < line.startTime + line.duration) return line;
  }
  // Tiny tolerance at the very end of the file.
  const last = lines[lines.length - 1];
  if (last && t < last.startTime + last.duration + 0.05) return last;
  return null;
}

/**
 * Line/syllable timings for the audio that will actually play.
 * `song.ts` bakes audio-derived timings (seconds inside the section file)
 * into every line, so normal speed uses them as-is. The 60 BPM files run
 * about 1.34× as long, so timings are scaled by the measured ratio
 * (slowFileDuration / nominalDuration) when known, else SLOW_FACTOR.
 */
export function playLines(
  section: SongSection,
  speed: GuideSpeed,
  slowFactor: number = SLOW_FACTOR,
): LyricLine[] {
  if (speed === 'normal') return section.lines;
  const f = slowFactor;
  return section.lines.map((line) => ({
    ...line,
    startTime: line.startTime * f,
    duration: line.duration * f,
    syllables: line.syllables.map((syl) => ({
      ...syl,
      startTime: syl.startTime * f,
      duration: syl.duration * f,
    })),
  }));
}

export interface SongPlayerValue {
  sectionId: string;
  section: SongSection;
  voiceSource: VoiceSource;
  guideSpeed: GuideSpeed;
  /** True when slow mode is playing a real 60 BPM file for this section. */
  slowFileInUse: boolean;
  tempo: number;
  loopMode: LoopMode;
  guideMuted: boolean;
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  /** Line the user has selected (for highlight + looping). */
  activeLineId: string | null;
  /** Line under the playhead right now (null between lines). */
  currentLineId: string | null;
  lines: LyricLine[];

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSection: (id: string) => void;
  setVoiceSource: (v: VoiceSource) => void;
  setGuideSpeed: (s: GuideSpeed) => void;
  setTempo: (t: number) => void;
  setLoopMode: (m: LoopMode) => void;
  toggleGuideMute: () => void;
  seekToTime: (t: number) => void;
  seekToLine: (lineId: string) => void;
  /** Called by AudioPlayer to mount the waveform. */
  attachWaveform: (el: HTMLDivElement | null) => void;
}

const PlayerContext = createContext<SongPlayerValue | null>(null);

export function useSongPlayer(): SongPlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('useSongPlayer must be used inside <SongPlayerProvider>');
  }
  return ctx;
}


export function SongPlayerProvider({ children }: { children: React.ReactNode }) {
  const [sectionId, setSectionIdState] = useState(SONG.sections[0].id);
  const [voiceSource, setVoiceSourceState] = useState<VoiceSource>('male');
  const [guideSpeed, setGuideSpeedState] = useState<GuideSpeed>('normal');
  const [tempo, setTempoState] = useState(1);
  const [loopMode, setLoopModeState] = useState<LoopMode>('off');
  const [guideMuted, setGuideMutedState] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [slowFactor, setSlowFactor] = useState(SLOW_FACTOR);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const wsRef = useRef<WaveSurfer | null>(null);
  const createdInRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const loadingRef = useRef(false);
  const positionRef = useRef(0);

  // Mirrors so async callbacks always see fresh values.
  const sectionIdRef = useRef(sectionId);
  sectionIdRef.current = sectionId;
  const voiceRef = useRef(voiceSource);
  voiceRef.current = voiceSource;
  const speedRef = useRef(guideSpeed);
  speedRef.current = guideSpeed;
  const loopRef = useRef(loopMode);
  loopRef.current = loopMode;
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  const mutedRef = useRef(guideMuted);
  mutedRef.current = guideMuted;
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const activeLineRef = useRef(activeLineId);
  activeLineRef.current = activeLineId;
  const slowFactorRef = useRef(slowFactor);
  slowFactorRef.current = slowFactor;

  const audioUrl = useCallback(
    (sid: string, voice: VoiceSource, speed: GuideSpeed): string => {
      if (speed === 'slow' && SLOW_FILES[sid]) return SLOW_FILES[sid];
      return getSectionAudio(sectionById(sid), voice);
    },
    [],
  );

  const doLoad = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const wasPlaying = playingRef.current;
      ws.pause();
      setIsPlaying(false);
      const url = audioUrl(sectionIdRef.current, voiceRef.current, speedRef.current);
      await ws.load(url);
      const d = ws.getDuration() || 0;
      setDuration(d);
      if (speedRef.current === 'slow' && SLOW_FILES[sectionIdRef.current]) {
        const nominal = SECTION_TIMINGS[sectionIdRef.current]?.duration;
        if (nominal && d > 0) {
          // Map the 80 BPM line timings onto the real slow file length.
          setSlowFactor(d / nominal);
        }
      } else {
        setSlowFactor(SLOW_FACTOR);
      }
      const pos = Math.min(positionRef.current, Math.max(0, d - 0.05));
      if (pos > 0) ws.setTime(pos);
      positionRef.current = pos;
      setCurrentTime(pos);
      ws.setPlaybackRate(tempoRef.current, true);
      ws.setMuted(mutedRef.current);
      setIsReady(true);
      if (wasPlaying) {
        try {
          await ws.play();
        } catch {
          /* autoplay blocked — user can press play */
        }
      }
    } catch (err) {
      console.error('Player load failed:', err);
    } finally {
      loadingRef.current = false;
    }
  }, [audioUrl]);

  const createWaveSurfer = useCallback(
    async (container: HTMLDivElement) => {
      wsRef.current?.destroy();
      createdInRef.current = container;
      containerRef.current = container;
      const ws = WaveSurfer.create({
        container,
        backend: 'MediaElement',
        mediaControls: false,
        autoScroll: false,
        autoCenter: false,
        waveColor: '#d4d4d4',
        progressColor: '#171717',
        cursorColor: '#171717',
        cursorWidth: 1,
        height: 72,
        normalize: true,
        interact: true,
      });
      wsRef.current = ws;
      // Pitch preservation is applied per playback-rate change (see setPlaybackRate calls).
      ws.setPlaybackRate(tempoRef.current, true);
      ws.on('finish', () => {
        setIsPlaying(false);
        positionRef.current = 0;
        setCurrentTime(0);
      });
      ws.on('error', (err) => console.error('WaveSurfer error:', err));
      await doLoad();
    },
    [doLoad],
  );

  const attachWaveform = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && el !== createdInRef.current) {
        void createWaveSurfer(el);
      }
    },
    [createWaveSurfer],
  );

  // Tear down when the whole app unmounts.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      wsRef.current?.destroy();
      wsRef.current = null;
    };
  }, []);

  // Smooth position updates + loop boundaries while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      const ws = wsRef.current;
      if (!ws) return;
      const t = ws.getCurrentTime();
      positionRef.current = t;
      setCurrentTime(t);
      const mode = loopRef.current;
      const lines = playLines(
        sectionById(sectionIdRef.current),
        speedRef.current,
        slowFactorRef.current,
      );
      if (mode === 'section') {
        const d = ws.getDuration();
        if (d > 0 && t >= d - 0.03) ws.setTime(0);
      } else if (mode === 'line') {
        const line =
          lineAtTime(lines, t) ??
          (activeLineRef.current ? lines.find((l) => l.id === activeLineRef.current) ?? null : null);
        if (line && t >= line.startTime + line.duration - 0.02) {
          ws.setTime(line.startTime);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);


  const play = useCallback(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.play().then(() => setIsPlaying(true)).catch((err) => {
      console.error('Play failed:', err);
    });
  }, []);

  const pause = useCallback(() => {
    wsRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [play, pause]);

  const setSection = useCallback(
    (id: string) => {
      if (!SONG.sections.some((s) => s.id === id)) return;
      setSectionIdState(id);
      positionRef.current = 0;
      setCurrentTime(0);
      setActiveLineId(null);
      if (wsRef.current) void doLoad();
    },
    [doLoad],
  );

  const setVoiceSource = useCallback(
    (v: VoiceSource) => {
      setVoiceSourceState(v);
      if (wsRef.current) void doLoad();
    },
    [doLoad],
  );

  const setGuideSpeed = useCallback(
    (s: GuideSpeed) => {
      setGuideSpeedState(s);
      if (s === 'slow' && !SLOW_FILES[sectionIdRef.current] && tempoRef.current === 1) {
        // No 60 BPM file for this section: slow it down honestly with the
        // MediaElement backend (pitch preserved).
        setTempoState(SLOW_FACTOR);
        tempoRef.current = SLOW_FACTOR;
        wsRef.current?.setPlaybackRate(SLOW_FACTOR, true);
      } else if (s === 'normal' && tempoRef.current === SLOW_FACTOR) {
        setTempoState(1);
        tempoRef.current = 1;
        wsRef.current?.setPlaybackRate(1, true);
      }
      if (wsRef.current) void doLoad();
    },
    [doLoad],
  );

  const setTempo = useCallback((t: number) => {
    const clamped = Math.max(0.5, Math.min(1.5, t));
    setTempoState(clamped);
    tempoRef.current = clamped;
    wsRef.current?.setPlaybackRate(clamped, true);
  }, []);

  const setLoopMode = useCallback((m: LoopMode) => {
    setLoopModeState(m);
  }, []);

  const toggleGuideMute = useCallback(() => {
    setGuideMutedState((m) => {
      wsRef.current?.setMuted(!m);
      return !m;
    });
  }, []);

  const seekToTime = useCallback((t: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    const clamped = Math.max(0, Math.min(t, ws.getDuration() - 0.01));
    ws.setTime(clamped);
    positionRef.current = clamped;
    setCurrentTime(clamped);
  }, []);

  const seekToLine = useCallback(
    (lineId: string) => {
      const lines = playLines(
        sectionById(sectionIdRef.current),
        speedRef.current,
        slowFactorRef.current,
      );
      const line = lines.find((l) => l.id === lineId);
      if (!line) return;
      setActiveLineId(lineId);
      seekToTime(line.startTime);
    },
    [seekToTime],
  );

  const section = sectionById(sectionId);
  const lines = playLines(section, guideSpeed, slowFactor);
  const currentLineId = isPlaying || currentTime > 0 ? lineAtTime(lines, currentTime)?.id ?? null : null;

  const value: SongPlayerValue = {
    sectionId,
    section,
    voiceSource,
    guideSpeed,
    slowFileInUse: guideSpeed === 'slow' && SLOW_FILES[sectionId] !== undefined,
    tempo,
    loopMode,
    guideMuted,
    isPlaying,
    isReady,
    currentTime,
    duration,
    activeLineId,
    currentLineId,
    lines,
    play,
    pause,
    togglePlay,
    setSection,
    setVoiceSource,
    setGuideSpeed,
    setTempo,
    setLoopMode,
    toggleGuideMute,
    seekToTime,
    seekToLine,
    attachWaveform,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
