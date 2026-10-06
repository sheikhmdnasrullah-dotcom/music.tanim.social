'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface FullSongPlayerProps {
  src: string;
  /** Track label shown above the controls. */
  title: string;
  /** Precomputed length, used until the browser reports metadata. */
  durationLabel: string;
  /**
   * Shown under the controls. Required — this recording is a separate
   * arrangement, so the UI must say so instead of implying lyric sync.
   */
  note: string;
}

/**
 * Standalone player for the finished full-song take.
 *
 * Deliberately has no section/lyric scrubbing: the file does not share the
 * practice timeline's offsets, so anything more than end-to-end playback would
 * be a claim we cannot back up.
 */
export function FullSongPlayer({ src, title, durationLabel, note }: FullSongPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => {
      setDuration(audio.duration);
      setStatus('ready');
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onError = () => setStatus('error');

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (audio.readyState >= 1) onMeta();

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || status === 'error') return;
    if (audio.paused) {
      void audio.play().catch(() => setStatus('error'));
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const total = duration || 0;
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Listen
          </p>
          <p className="text-sm font-semibold mt-0.5 truncate">{title}</p>
        </div>
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          V1.0
        </span>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />

      {status === 'error' ? (
        <p className="text-xs text-destructive">
          This track could not be loaded. Check your connection and try again.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-white transition-transform active:scale-95"
            >
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={total > 0 ? total : 1}
                step={0.1}
                value={current}
                onChange={(e) => seek(Number(e.target.value))}
                disabled={total === 0}
                aria-label="Seek"
                className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-foreground disabled:opacity-40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm"
                style={{ background: `linear-gradient(to right, var(--foreground) ${progress}%, var(--muted) ${progress}%)` }}
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                <span>{formatTime(current)}</span>
                <span>{duration > 0 ? formatTime(duration) : durationLabel}</span>
              </div>
            </div>
          </div>

          <p className={cn('text-xs text-muted-foreground leading-relaxed')}>{note}</p>
        </>
      )}
    </div>
  );
}
