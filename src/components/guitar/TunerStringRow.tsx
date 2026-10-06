'use client';

import { cn } from '@/lib/utils';
import type { StringStatus } from '@/components/guitar/Tuner';

interface TunerStringRowProps {
  string: number;
  note: string;
  targetFreq: number;
  detectedFreq: number | null;
  cents: number | null;
  inTune: boolean;
}

export function TunerStringRow({ string, note, targetFreq, detectedFreq, cents, inTune }: TunerStringRowProps) {
  return (
    <div className={cn('border border-border rounded-xl p-4', inTune && 'border-success bg-green-50')}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-bold font-mono">{note}</div>
        <div className="text-sm text-muted-foreground">String {string}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-100', inTune ? 'bg-success' : 'bg-accent')}
            style={{
              width: cents !== null ? `${Math.min(100, Math.max(0, 50 + (cents / 20) * 50))}%` : '0%',
            }}
          />
        </div>
        <div className="text-right w-24">
          <div className="text-sm font-mono text-muted-foreground">
            {detectedFreq ? `${detectedFreq.toFixed(1)} Hz` : '—'}
          </div>
          <div className={cn('text-xs font-mono', inTune ? 'text-success' : 'text-danger')}>
            {cents !== null
              ? `${cents > 0 ? '+' : ''}${cents}¢`
              : '—'}
          </div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className={cn('w-24 h-2 rounded-full mx-auto transition-colors', inTune ? 'bg-success' : 'bg-muted')}>
          {inTune && (
            <div className="w-full h-full bg-success rounded-full animate-pulse" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Target: {targetFreq.toFixed(2)} Hz
        </p>
      </div>
    </div>
  );
}