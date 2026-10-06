'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import type { GuitarString } from '@/types/guitar';
import { identifyFretPositions, type StringIdentification } from '@/lib/music/fretboard';

export type { GuitarString, StringIdentification };

export interface PitchSample {
  frequency: number;
  clarity: number;
  noteName: string | null;
  midi: number | null;
  cents: number;
  /** RMS of the analysis window, 0-1. Used to distinguish "wrong note" from "too quiet". */
  rms: number;
  /** Wall-clock milliseconds spent computing this frame's analysis. */
  analysisMs: number;
  timestamp: number;
}

export interface PitchTrackerState {
  isActive: boolean;
  sample: PitchSample | null;
  error: string | null;
  identification: StringIdentification | null;
}

export interface PitchTrackerConfig {
  /** Clarity threshold 0-1; higher = only detect very clear pitches. Default 0.8. */
  clarityThreshold?: number;
  /** Minimum RMS amplitude to consider a note present. Default 0.01. */
  minVolumeAbsolute?: number;
  /** Maximum amplitude to clip at. Default 1.0. */
  maxInputAmplitude?: number;
  /** Target string for lesson-aware practice (optional). */
  targetString?: GuitarString;
  /** Target fret for lesson-aware practice (optional). */
  targetFret?: number;
  /** Acceptable frequency deviation in cents before flagging out-of-tune. Default 10. */
  tuningToleranceCents?: number;
  /**
   * Frames a new note must be stable for before `onNoteDetected` fires. Prevents one
   * pluck from being counted sixty times a second. Default 3.
   */
  onsetFrames?: number;
  /** Milliseconds of silence that ends a note event. Default 160. */
  releaseMs?: number;
  /**
   * Raw constraints for `getUserMedia`. Musical analysis wants the browser's speech
   * processing (echo cancellation, noise suppression, auto gain) switched off, because
   * it is tuned for voices and can smear instrument content. Default disables all three.
   */
  audioConstraints?: MediaTrackConstraints | boolean;
}

export interface PitchTrackerEvents {
  /**
   * Fired once per note onset, not once per analysis frame.
   * `sample` carries the frame's RMS and analysis timing so callers can tell a quiet
   * input from a wrong note.
   */
  onNoteDetected?: (identification: StringIdentification, sample: PitchSample) => void;
  /** Fired when listening starts/stops. */
  onActiveChanged?: (isActive: boolean) => void;
}

const DEFAULT_CONFIG: Required<
  Pick<
    PitchTrackerConfig,
    | 'clarityThreshold'
    | 'minVolumeAbsolute'
    | 'maxInputAmplitude'
    | 'tuningToleranceCents'
    | 'onsetFrames'
    | 'releaseMs'
  >
> = {
  clarityThreshold: 0.8,
  minVolumeAbsolute: 0.01,
  maxInputAmplitude: 1.0,
  tuningToleranceCents: 10,
  onsetFrames: 3,
  releaseMs: 160,
};

const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

/** Guitar fundamentals we accept. Below E2 / above ~C6 is outside useful range. */
const MIN_DETECTABLE_HZ = 40;
const MAX_DETECTABLE_HZ = 1300;

/**
 * Real-time guitar pitch detection with string identification.
 *
 * Detection uses the McLeod Pitch Method via `pitchy`; string/fret inference lives in
 * `@/lib/music/fretboard`. This hook owns only audio I/O, frame scheduling and the
 * note-onset gate.
 *
 * Config is read through a ref so `start`/`stop` stay referentially stable — unstable
 * callbacks here previously caused pages to open a new microphone stream on every render.
 */
export function usePitchTracker(config: PitchTrackerConfig = {}) {
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  const [state, setState] = useState<PitchTrackerState>({
    isActive: false,
    sample: null,
    error: null,
    identification: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);

  const eventsRef = useRef<PitchTrackerEvents>({});
  const onsetRef = useRef<{
    candidateKey: string | null;
    candidateFrames: number;
    activeKey: string | null;
    lastSeenAt: number;
  }>({ candidateKey: null, candidateFrames: 0, activeKey: null, lastSeenAt: 0 });

  const setEvents = useCallback((newEvents: PitchTrackerEvents) => {
    eventsRef.current = { ...eventsRef.current, ...newEvents };
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    detectorRef.current = null;
    bufferRef.current = null;
    onsetRef.current = { candidateKey: null, candidateFrames: 0, activeKey: null, lastSeenAt: 0 };
    setState({ isActive: false, sample: null, error: null, identification: null });
    eventsRef.current.onActiveChanged?.(false);
  }, []);

  /**
   * Collapse a stream of per-frame detections into one event per physical note.
   * Without this gate a single pluck would fire `onNoteDetected` ~60 times a second.
   */
  const gateNoteOnset = useCallback(
    (identification: StringIdentification, sample: PitchSample, cfg: PitchTrackerConfig) => {
      const onset = onsetRef.current;
      onset.lastSeenAt = performance.now();

      const key = buildPositionKey(identification, cfg);
      if (key === onset.candidateKey) {
        onset.candidateFrames += 1;
      } else {
        onset.candidateKey = key;
        onset.candidateFrames = 1;
      }

      const needsFrames = cfg.onsetFrames ?? DEFAULT_CONFIG.onsetFrames;
      if (onset.activeKey !== key && onset.candidateFrames >= needsFrames) {
        onset.activeKey = key;
        eventsRef.current.onNoteDetected?.(identification, sample);
      }
    },
    [],
  );

  /** End the current note once the input has been silent long enough to release it. */
  const releaseNoteIfSilent = useCallback((cfg: PitchTrackerConfig) => {
    const onset = onsetRef.current;
    const releaseMs = cfg.releaseMs ?? DEFAULT_CONFIG.releaseMs;
    if (onset.activeKey !== null && performance.now() - onset.lastSeenAt > releaseMs) {
      onset.activeKey = null;
      onset.candidateKey = null;
      onset.candidateFrames = 0;
    }
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return; // already running — never open a second stream
    try {
      const requested = configRef.current.audioConstraints;
      const constraints: MediaStreamConstraints = {
        audio: requested === undefined ? DEFAULT_AUDIO_CONSTRAINTS : requested,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      // 2048 samples @ 48 kHz ≈ 43 ms: long enough to hold three periods of the low E
      // (82 Hz) so the detector can resolve it, short enough to feel immediate.
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      analyserRef.current = analyser;

      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      detectorRef.current = detector;
      bufferRef.current = new Float32Array(analyser.fftSize);

      onsetRef.current = { candidateKey: null, candidateFrames: 0, activeKey: null, lastSeenAt: 0 };

      setState({ isActive: true, sample: null, error: null, identification: null });

      const track = () => {
        rafRef.current = requestAnimationFrame(track);

        const analyserNode = analyserRef.current;
        const detectorNode = detectorRef.current;
        const buffer = bufferRef.current;
        if (!analyserNode || !detectorNode || !buffer) return;

        const cfg = configRef.current;
        detectorNode.clarityThreshold = cfg.clarityThreshold ?? DEFAULT_CONFIG.clarityThreshold;
        detectorNode.minVolumeAbsolute = cfg.minVolumeAbsolute ?? DEFAULT_CONFIG.minVolumeAbsolute;
        detectorNode.maxInputAmplitude = cfg.maxInputAmplitude ?? DEFAULT_CONFIG.maxInputAmplitude;

        const startedAt = performance.now();
        analyserNode.getFloatTimeDomainData(buffer);

        let rmsSum = 0;
        for (let i = 0; i < buffer.length; i++) rmsSum += buffer[i] * buffer[i];
        const rms = Math.sqrt(rmsSum / buffer.length);

        const [frequency, clarity] = detectorNode.findPitch(buffer, audioContext.sampleRate);
        const analysisMs = performance.now() - startedAt;

        const detectable =
          frequency >= MIN_DETECTABLE_HZ &&
          frequency <= MAX_DETECTABLE_HZ &&
          clarity >= (cfg.clarityThreshold ?? DEFAULT_CONFIG.clarityThreshold);

        const identification = detectable
          ? identifyFretPositions({
              frequency,
              clarity,
              target:
                cfg.targetString !== undefined || cfg.targetFret !== undefined
                  ? { string: cfg.targetString, fret: cfg.targetFret }
                  : undefined,
              previous: onsetRef.current.activeKey
                ? parsePositionKey(onsetRef.current.activeKey)
                : null,
            })
          : null;

        const sample: PitchSample = {
          frequency,
          clarity,
          noteName: identification?.noteName ?? null,
          midi: identification?.noteMidi ?? null,
          cents: identification?.cents ?? 0,
          rms,
          analysisMs,
          timestamp: performance.now(),
        };

        setState({ isActive: true, sample, error: null, identification });

        if (identification) {
          gateNoteOnset(identification, sample, cfg);
        } else {
          releaseNoteIfSilent(cfg);
        }
      };

      track();
      eventsRef.current.onActiveChanged?.(true);
    } catch (err) {
      setState({
        isActive: false,
        sample: null,
        error: err instanceof Error ? err.message : 'Microphone access failed',
        identification: null,
      });
      eventsRef.current.onActiveChanged?.(false);
    }
  }, []);

  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    setEvents,
    config,
  };
}

/**
 * Identity of a note event. Includes the lesson target so that moving to the next
 * target re-arms the detector even if the player produces the same pitch again.
 */
function buildPositionKey(
  identification: StringIdentification,
  config: PitchTrackerConfig,
): string {
  const target =
    config.targetString !== undefined || config.targetFret !== undefined
      ? `${config.targetString ?? '-'}:${config.targetFret ?? '-'}`
      : '-';
  return `${identification.noteMidi}:${identification.string ?? '-'}:${identification.fret ?? '-'}:${target}`;
}

function parsePositionKey(key: string): { string: GuitarString; fret: number } | null {
  const [, stringPart, fretPart] = key.split(':');
  const string = Number(stringPart);
  const fret = Number(fretPart);
  if (!Number.isInteger(string) || !Number.isInteger(fret)) return null;
  if (string < 1 || string > 6 || fret < 0) return null;
  return { string: string as GuitarString, fret };
}
