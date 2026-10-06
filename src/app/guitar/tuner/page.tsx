'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTuner, StringStatus } from '@/components/guitar/Tuner';

const TUNINGS = {
  standard: { label: 'Standard (E A D G B E)', freq: [82.41, 110.00, 146.83, 196.00, 246.94, 329.63] },
  'drop-d': { label: 'Drop D (D A D G B E)', freq: [73.42, 110.00, 146.83, 196.00, 246.94, 329.63] },
  dadgad: { label: 'DADGAD (D A D G A D)', freq: [73.42, 110.00, 146.83, 196.00, 164.81, 220.00] },
  'open-g': { label: 'Open G (D G D G B D)', freq: [73.42, 98.00, 146.83, 196.00, 246.94, 220.00] },
  'open-d': { label: 'Open D (D A D F# A D)', freq: [73.42, 110.00, 146.83, 185.00, 196.00, 220.00] },
} as const;

type TuningKey = keyof typeof TUNINGS;

function TunerStringRow({ status }: { status: StringStatus }) {
  const cents = status.cents ?? 0;
  const absCents = Math.abs(cents);
  const isSharp = cents > 0;
  const isFlat = cents < 0;
  const inTune = status.inTune;

  return (
    <div className={`p-3 rounded-lg border transition-colors ${inTune ? 'border-success bg-success/5' : 'border-warning/50 bg-warning/5'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-mono font-bold">{status.note}</span>
        <span className="text-sm text-muted-foreground">{status.targetFreq.toFixed(1)} Hz</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${inTune ? 'bg-success' : isSharp ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(100, 50 + (cents / 50) * 50)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>{isFlat ? `${absCents}¢ ♭` : isSharp ? `♯ ${absCents}¢` : '—'}</span>
        <span className={inTune ? 'text-success font-medium' : 'text-muted-foreground'}>
          {inTune ? 'In Tune' : status.detectedFreq ? `${status.detectedFreq.toFixed(1)} Hz` : 'No signal'}
        </span>
      </div>
    </div>
  );
}

export default function GuitarTunerPage() {
  const [tuningKey, setTuningKey] = useState<TuningKey>('standard');
  const { isListening, toggleListening, stringStatuses, pitch, config } = useTuner({
    tuning: tuningKey,
    toleranceCents: 10,
  });

  const toggle = useCallback(() => {
    toggleListening();
  }, [toggleListening]);

  const switchTuning = useCallback((newKey: TuningKey) => {
    setTuningKey(newKey);
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Guitar Tuner</h1>
        <div>
          <p className="text-sm text-muted-foreground">{TUNINGS[tuningKey].label}</p>
          <button
            onClick={() => switchTuning(tuningKey === 'standard' ? 'drop-d' : 'standard')}
            className="mt-2 px-3 py-1 text-sm rounded-md transition-colors ${
              isListening ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
            }">
            {isListening ? 'Stop' : 'Switch to Standard'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stringStatuses.map((status) => (
          <TunerStringRow key={status.string} status={status} />
        ))}
      </div>

      <div className="mb-6">
        <button
          onClick={toggle}
          disabled={!isListening}
          className="w-full py-2 rounded-md transition-colors ${
            isListening ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
          }">
            {isListening ? 'Stop Listening' : 'Start Tuning'}
          </button>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Detection Stats</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Detected freq: {pitch !== null ? pitch.toFixed(1) + ' Hz' : '—'}</div>
          <div>Status: {isListening ? 'Listening' : 'Not listening'}</div>
        </div>
      </div>
    </div>
  );
}