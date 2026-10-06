'use client';

import { cn } from '@/lib/utils';
import type { StringStatus } from '@/components/guitar/Tuner';

interface TunerStringRowProps {
  status: StringStatus;
  toleranceCents: number;
}

/**
 * One row per string. The active row is the string the detected pitch is closest to —
 * the one the player is actually tuning right now.
 */
export function TunerStringRow({ status, toleranceCents }: TunerStringRowProps) {
  const cents = status.cents;
  const isSharp = cents !== null && cents > 0;
  const isFlat = cents !== null && cents < 0;
  const hasSignal = cents !== null;
  const tuned = hasSignal && Math.abs(cents) <= toleranceCents;

  // Map ±50 cents across the full bar; the centre is the target pitch.
  const width = hasSignal ? Math.min(100, Math.max(0, 50 + (cents / 50) * 50)) : 50;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        status.active
          ? tuned
            ? 'border-success bg-success/10'
            : 'border-accent bg-accent-light/40'
          : 'border-border bg-background',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-mono font-bold">{status.note}</span>
        <span className="text-sm text-muted-foreground">{status.targetFreq.toFixed(1)} Hz</span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-150',
            tuned ? 'bg-success' : isSharp ? 'bg-danger' : 'bg-accent',
          )}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs mt-1">
        <span className="font-mono">
          {!hasSignal
            ? '—'
            : tuned
              ? 'in tune'
              : isSharp
                ? `♯ ${Math.abs(cents)}¢`
                : `♭ ${Math.abs(cents)}¢`}
        </span>
        <span className={cn(tuned ? 'text-success font-medium' : 'text-muted-foreground')}>
          {!hasSignal
            ? `string ${status.string}`
            : status.active
              ? tuned
                ? 'Perfect'
                : isSharp
                  ? 'Tune down'
                  : 'Tune up'
              : `string ${status.string}`}
        </span>
      </div>
    </div>
  );
}
