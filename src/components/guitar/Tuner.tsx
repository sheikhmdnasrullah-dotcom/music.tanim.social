'use client';

import { useCallback, useMemo } from 'react';
import { usePitchTracker, type PitchSample } from '@/hooks/use-pitch-tracker';
import { STANDARD_TUNING, TUNINGS, type Tuning } from '@/types/guitar';
import { centsBetween, midiToNoteName, noteToFrequency } from '@/lib/music/notes';

export interface TunerConfig {
  /** Key into `TUNINGS`, e.g. `standard`, `drop-d`. */
  tuning: string;
  toleranceCents: number;
}

export interface StringStatus {
  /** 6 = low string, 1 = high string. */
  string: number;
  /** Open-string name for the selected tuning, e.g. `E2`. */
  note: string;
  targetFreq: number;
  detectedFreq: number | null;
  /** Signed error of the detected pitch against *this* string, in cents. */
  cents: number | null;
  inTune: boolean;
  /** The string the detected pitch is closest to — the one currently being tuned. */
  active: boolean;
}

export type TunerInstruction =
  | 'Perfect'
  | 'Tune up'
  | 'Tune down'
  | 'Play a string'
  | 'Listening…';

export interface TunerReadout {
  isListening: boolean;
  toggleListening: () => void;
  stringStatuses: StringStatus[];
  /** Nearest string to what is being played right now. */
  activeStatus: StringStatus | null;
  /** Plain-language instruction — no cents required to understand it. */
  instruction: TunerInstruction;
  /** Detected fundamental in Hz, or `null` when there is no signal. */
  pitch: number | null;
  /** Detector confidence in the pitch, 0-1. */
  confidence: number | null;
  /** Error of the active string in cents (advanced view). */
  activeCents: number | null;
  /** True when the active string is within tolerance. */
  inTune: boolean;
  sample: PitchSample | null;
  error: string | null;
  config: TunerConfig;
}

/**
 * Guitar tuner built on the shared pitch tracker (McLeod Pitch Method via `pitchy`).
 *
 * There is exactly one pitch detector in this application; the tuner reuses it rather
 * than running a second, weaker one. All note names are derived from the selected
 * tuning's MIDI numbers, so alternative tunings label themselves correctly.
 */
export function useTuner(config: TunerConfig): TunerReadout {
  const tuning: Tuning = TUNINGS[config.tuning] ?? STANDARD_TUNING;

  const tracker = usePitchTracker({
    clarityThreshold: 0.7,
    minVolumeAbsolute: 0.005,
    maxInputAmplitude: 1.0,
    tuningToleranceCents: config.toleranceCents,
  });

  const { isActive, start, stop, sample, error } = tracker;
  const detectedFreq = sample && sample.frequency > 0 ? sample.frequency : null;

  const stringStatuses = useMemo<StringStatus[]>(() => {
    // tuning.notes is lowest-first (index 0 = string 6); display highest string first.
    return tuning.notes.map((openMidi, index) => {
      const string = 6 - index;
      const targetFreq = noteToFrequency(openMidi);
      const cents = detectedFreq === null ? null : Math.round(centsBetween(detectedFreq, targetFreq) ?? 0);
      return {
        string,
        note: midiToNoteName(openMidi),
        targetFreq,
        detectedFreq,
        cents,
        inTune: cents !== null && Math.abs(cents) <= config.toleranceCents,
        active: false,
      };
    });
  }, [tuning, detectedFreq, config.toleranceCents]);

  const activeStatus = useMemo<StringStatus | null>(() => {
    if (detectedFreq === null) return null;
    let nearest: StringStatus | null = null;
    let nearestAbs = Number.POSITIVE_INFINITY;
    for (const status of stringStatuses) {
      const abs = Math.abs(status.cents ?? Number.POSITIVE_INFINITY);
      if (abs < nearestAbs) {
        nearestAbs = abs;
        nearest = status;
      }
    }
    if (!nearest) return null;
    return { ...nearest, active: true };
  }, [stringStatuses, detectedFreq]);

  const activeCents = activeStatus?.cents ?? null;
  const inTune = activeCents !== null && Math.abs(activeCents) <= config.toleranceCents;

  const instruction: TunerInstruction =
    detectedFreq === null
      ? isActive
        ? 'Play a string'
        : 'Listening…'
      : inTune
        ? 'Perfect'
        : (activeCents ?? 0) > 0
          ? 'Tune down'
          : 'Tune up';

  const toggleListening = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      void start();
    }
  }, [isActive, start, stop]);

  return {
    isListening: isActive,
    toggleListening,
    stringStatuses: activeStatus
      ? stringStatuses.map((status) => (status.string === activeStatus.string ? activeStatus : status))
      : stringStatuses,
    activeStatus,
    instruction,
    pitch: detectedFreq,
    confidence: sample ? sample.clarity : null,
    activeCents,
    inTune,
    sample,
    error,
    config,
  };
}
