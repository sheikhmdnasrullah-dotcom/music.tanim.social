'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TunerConfig {
  tuning: keyof typeof import('@/types/guitar').TUNINGS;
  toleranceCents: number;
}

export interface StringStatus {
  string: number;
  note: string;
  targetFreq: number;
  detectedFreq: number | null;
  cents: number | null;
  inTune: boolean;
}

export function useTuner(config: TunerConfig) {
  const [isListening, setIsListening] = useState(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [stringStatuses, setStringStatuses] = useState<StringStatus[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      setIsListening(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ac = new AudioContext();
        audioContextRef.current = ac;
        const source = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        setIsListening(true);
        detectPitch();
      } catch (e) {
        console.error('Microphone access denied:', e);
      }
    }
  }, [isListening]);

  const detectPitch = () => {
    if (!analyserRef.current || !isListening) return;
    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(buffer);

    // Simple autocorrelation pitch detection
    let maxCorr = 0;
    let period = 0;
    for (let i = 1; i < buffer.length / 2; i++) {
      let corr = 0;
      for (let j = 0; j < buffer.length - i; j++) {
        corr += buffer[j] * buffer[j + i];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        period = i;
      }
    }

    if (maxCorr > 0.1 && period > 0) {
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const freq = sampleRate / period;
      setPitch(freq);
      updateStringStatuses(freq);
    }

    animationRef.current = requestAnimationFrame(detectPitch);
  };

  const updateStringStatuses = (freq: number) => {
    const TUNINGS: Record<string, number[]> = {
      standard: [82.41, 110.00, 146.83, 196.00, 246.94, 329.63],
      'drop-d': [73.42, 110.00, 146.83, 196.00, 246.94, 329.63],
      dadgad: [73.42, 110.00, 146.83, 196.00, 164.81, 220.00],
      'open-g': [73.42, 98.00, 146.83, 196.00, 246.94, 220.00],
      'open-d': [73.42, 110.00, 146.83, 185.00, 196.00, 220.00],
    };

    const targetFreqs = TUNINGS[config.tuning] || TUNINGS.standard;
    const noteNames = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

    const statuses: StringStatus[] = targetFreqs.map((targetFreq: number, i: number) => {
      const cents = freq > 0 ? Math.round(1200 * Math.log2(freq / targetFreq)) : null;
      return {
        string: 6 - i,
        note: noteNames[i],
        targetFreq,
        detectedFreq: freq,
        cents,
        inTune: cents !== null && Math.abs(cents) <= config.toleranceCents,
      };
    });

    setStringStatuses(statuses);
  };

  return {
    isListening,
    toggleListening,
    stringStatuses,
    pitch,
    config,
  };
}