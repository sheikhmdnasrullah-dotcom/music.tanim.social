'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { frequencyToNote, noteToFrequency } from '@/lib/music/notes';

export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

export interface StringIdentification {
  string: GuitarString | null;
  fret: number | null;
  noteName: string | null;
  frequency: number | null;
  cents: number | null;
  confidence: number; // 0-1, higher = more confident
  explanation: string;
}

export interface PitchSample {
  frequency: number;
  clarity: number;
  noteName: string | null;
  midi: number | null;
  cents: number;
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
  /** Minimum volume RMS amplitude to consider. Default 0.01. */
  minVolumeAbsolute?: number;
  /** Maximum amplitude to clip at. Default 1.0. */
  maxInputAmplitude?: number;
  /** Target string for lesson-aware practice (optional). */
  targetString?: GuitarString;
  /** Target fret for lesson-aware practice (optional). */
  targetFret?: number;
  /** Acceptable frequency deviation in cents before flagging out-of-tune. Default 10. */
  tuningToleranceCents?: number;
}

export interface PitchTrackerEvents {
  /** Fired when a note is detected with identification */
  onNoteDetected?: (identification: StringIdentification) => void;
  /** Fired when listening starts/stops */
  onActiveChanged?: (isActive: boolean) => void;
}

/** Default configuration values */
const DEFAULT_CONFIG: PitchTrackerConfig = {
  clarityThreshold: 0.8,
  minVolumeAbsolute: 0.01,
  maxInputAmplitude: 1.0,
  tuningToleranceCents: 10,
};

/**
 * Hook for real-time guitar pitch detection with string identification.
 * Uses the MPM (McLeod Pitch Method) via the `pitchy` library.
 * Designed for low-latency monophonic detection (single note at a time).
 */
export function usePitchTracker(config: PitchTrackerConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<PitchTrackerState>({
    isActive: false,
    sample: null,
    error: null,
    identification: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<PitchDetector<any> | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);

  const eventsRef = useRef<PitchTrackerEvents>({});

  const setEvents = useCallback((newEvents: PitchTrackerEvents) => {
    eventsRef.current = { ...eventsRef.current, ...newEvents };
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    detectorRef.current = null;
    bufferRef.current = null;
    setState({ isActive: false, sample: null, error: null, identification: null });
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      detectorRef.current = detector;
      bufferRef.current = new Float32Array(analyser.fftSize);

      // Apply configured limits
      detector.clarityThreshold = mergedConfig.clarityThreshold!;
      detector.minVolumeAbsolute = mergedConfig.minVolumeAbsolute!;
      detector.maxInputAmplitude = mergedConfig.maxInputAmplitude!;

      setState({ isActive: true, sample: null, error: null, identification: null });

      // Standard tuning open-note frequencies (E2, A2, D3, G3, B3, E4)
      const STANDARD_TUNING_NOTES = [40, 45, 50, 55, 59, 64];

      const track = () => {
        const analyserNode = analyserRef.current;
        const detectorNode = detectorRef.current;
        const buffer = bufferRef.current;
        if (!analyserNode || !detectorNode || !buffer) return;

        analyserNode.getFloatTimeDomainData(buffer);
        const [freq, clarity] = detectorNode.findPitch(buffer, audioContext.sampleRate);

        // Build note info
        let noteInfo = frequencyToNote(freq);
        const centsFromPitch = noteInfo ? noteInfo.cents : 0;

        // String identification: match detected frequency to closest open string
        let identification: StringIdentification | null = null;

        if (freq > 40 && freq < 1200 && clarity > (mergedConfig.clarityThreshold || 0.8)) {
          // Determine likely string based on open string tuning
          let bestString: GuitarString | null = null;
          let bestFret = 0;
          let bestConfidence = 0;

          for (let s = 0; s < 6; s++) {
            const openNote = STANDARD_TUNING_NOTES[s];
            const openFreq = noteToFrequency(openNote);
            // Calculate deviation in cents: 1200 * log2(freq / openFreq)
            const centsDeviation = Math.abs(1200 * Math.log2(freq / openFreq));
            // The fret position that would make this note match
            const fret = Math.round((freq - openNote) / 12); // semitones from open
            const clampedFret = Math.max(0, Math.min(24, fret));

            // Confidence decreases as we get farther from open string tuning
            const stringSpecificConfidence = Math.max(0, 1 - centsDeviation / (mergedConfig.tuningToleranceCents || 10));

            // If we have a target string/fret, weight accordingly
            let contextWeight = 1.0;
            if (mergedConfig.targetString !== undefined) {
              if (s + 1 !== mergedConfig.targetString) {
                contextWeight = 0.1; // strongly discourage non-target strings
              }
            }

            const totalConfidence = stringSpecificConfidence * contextWeight;

            if (totalConfidence > bestConfidence) {
              bestConfidence = totalConfidence;
              bestString = s + 1 as GuitarString;
              bestFret = clampedFret;
            }
          }

          // If we have a target string, prefer that string even if confidence is lower
          if (mergedConfig.targetString !== undefined && bestString) {
            // If the best string isn't the target, downgrade
            if (bestString !== mergedConfig.targetString) {
              bestConfidence *= 0.3;
            }
          }

          // Generate explanation
          let explanation = '';
          if (bestConfidence > 0.5) {
            if (mergedConfig.targetString !== undefined) {
              explanation = `Detected: ${noteInfo ? noteInfo.name : '?'}. Most likely: string ${
                bestString
              } fret ${bestFret}. (Lesson target: string ${
                mergedConfig.targetString
              })`;
            } else {
              explanation = `Detected: ${noteInfo ? noteInfo.name : '?'}. Most likely: string ${
                bestString
              } fret ${bestFret}`;
            }
          } else {
            explanation = `Detected: ${noteInfo ? noteInfo.name : '?'} — low confidence (${(bestConfidence * 100).toFixed(0)}%). Try playing louder or clearer.`;
          }

          identification = {
            string: bestString,
            fret: bestFret,
            noteName: noteInfo ? noteInfo.name : null,
            frequency: freq,
            cents: centsFromPitch,
            confidence: bestConfidence,
            explanation,
          };
        }

        // Update state
        const sample: PitchSample = {
          frequency: freq,
          clarity,
          noteName: noteInfo ? noteInfo.name : null,
          midi: noteInfo ? noteInfo.midi : null,
          cents: centsFromPitch,
          timestamp: performance.now(),
        };

        setState({
          isActive: true,
          sample,
          error: null,
          identification,
        });

        // Fire event if a note was identified
        if (eventsRef.current.onNoteDetected && identification) {
          eventsRef.current.onNoteDetected(identification);
        }
      };

      track();

      // Fire active changed event
      if (eventsRef.current.onActiveChanged) {
        eventsRef.current.onActiveChanged(true);
      }
    } catch (err) {
      setState({
        isActive: false,
        sample: null,
        error: err instanceof Error ? err.message : 'Microphone access failed',
        identification: null,
      });
      if (eventsRef.current.onActiveChanged) {
        eventsRef.current.onActiveChanged(false);
      }
    }
  }, [mergedConfig]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    setEvents,
    config: mergedConfig,
  };
}