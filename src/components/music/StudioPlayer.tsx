'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic,
  MoreHorizontal,
} from 'lucide-react';

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const LOOP_OPTIONS: { value: 'off' | 'line' | 'section'; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'line', label: 'Phrase' },
  { value: 'section', label: 'Section' },
];

export function StudioPlayer() {
  const {
    isReady,
    isPlaying,
    togglePlay,
    stop,
    currentTime,
    duration,
    seekToTime,
    loopMode,
    setLoopMode,
    stems,
    setStemVolume,
    isRecording,
    startRecording,
    stopRecording,
    recordedAudioUrl,
    lines,
    currentLineId,
    activeLineId,
  } = useSongPlayer();

  const [showMix, setShowMix] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const timelineRef = useRef<HTMLDivElement>(null);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || duration <= 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      seekToTime(Math.max(0, Math.min(duration, pos * duration)));
    },
    [duration, seekToTime],
  );

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const nextLine = useCallback(() => {
    const targetId = isPlaying ? currentLineId : activeLineId;
    if (!targetId) return;
    const currentLine = lines.find((l) => l.id === targetId);
    if (!currentLine) return;
    const idx = lines.findIndex((l) => l.id === targetId);
    const next = lines[idx + 1];
    if (next) seekToTime(next.startTime);
  }, [lines, currentLineId, activeLineId, isPlaying, seekToTime]);

  const prevLine = useCallback(() => {
    const targetId = isPlaying ? currentLineId : activeLineId;
    if (!targetId) return;
    const idx = lines.findIndex((l) => l.id === targetId);
    const prev = lines[idx - 1];
    if (prev) seekToTime(prev.startTime);
  }, [lines, currentLineId, activeLineId, isPlaying, seekToTime]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          <span className="text-sm">Loading audio…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Timeline */}
      <div
        ref={timelineRef}
        className="group relative h-1 bg-muted rounded-full cursor-pointer mb-5"
        onClick={handleTimelineClick}
        role="slider"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Song timeline"
        tabIndex={0}
      >
        <div
          className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 w-1 bg-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ marginLeft: `${progressPercent}%` }}
        />
      </div>

      {/* Time */}
      <div className="flex justify-between text-[11px] font-mono text-muted-foreground tabular-nums mb-8">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Main Transport */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={prevLine}
          aria-label="Previous line"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="lg"
          onClick={togglePlay}
          className="h-14 w-14 rounded-full p-0"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={nextLine}
          aria-label="Next line"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Secondary controls */}
      <div className="flex items-center justify-center gap-1">
        {/* Loop */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {LOOP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLoopMode(opt.value)}
              className={cn(
                'text-[11px] font-medium px-2.5 py-1.5 rounded transition-colors',
                loopMode === opt.value
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={loopMode === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Volume */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        >
          {volume === 0 ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Practice */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium"
            onClick={() => setShowPractice(!showPractice)}
          >
            Practice
          </Button>
          {showPractice && <PracticePopover onClose={() => setShowPractice(false)} />}
        </div>

        {/* Mix */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium"
            onClick={() => setShowMix(!showMix)}
          >
            Mix
          </Button>
          {showMix && <MixPopover onClose={() => setShowMix(false)} />}
        </div>

        {/* Recording */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2.5 text-xs font-medium',
            isRecording && 'text-destructive',
          )}
          onClick={toggleRecording}
        >
          {isRecording ? (
            <>
              <Mic className="h-3.5 w-3.5 mr-1" fill="currentColor" />
              Recording
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-muted-foreground mr-1.5" />
              Record
            </>
          )}
        </Button>

        {/* More */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowMore(!showMore)}
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
          {showMore && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-border rounded-lg shadow-sm py-1 min-w-[180px] z-50">
              <button
                onClick={() => {
                  stop();
                  setShowMore(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
              >
                Stop and return to start
              </button>
              <button
                onClick={() => {
                  setShowMore(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-colors text-destructive"
              >
                Audio inspector (debug)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recorded audio */}
      {recordedAudioUrl && (
        <div className="mt-6 p-3 bg-muted rounded-lg flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-medium text-foreground">Your recording ready</span>
            <p className="text-muted-foreground text-[11px]">Compare your singing with the guide</p>
          </div>
          <audio src={recordedAudioUrl} controls className="h-8 max-w-[200px]" />
        </div>
      )}
    </div>
  );
}

function PracticePopover({ onClose }: { onClose: () => void }) {
  const {
    mode,
    setMode,
    tempo,
    setTempo,
    guideSpeed,
    setGuideSpeed,
  } = useSongPlayer();

  const presets = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-practice-popover]')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      data-practice-popover
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-border rounded-lg shadow-sm py-3 min-w-[220px] z-50 animate-fade-in"
    >
      <div className="px-3 pb-2 mb-2 border-b border-border">
        <div className="text-xs font-semibold text-foreground">Practice mode</div>
      </div>
      <div className="space-y-0.5">
        {[
          { mode: 'guide', label: 'Listen', desc: 'Full song' },
          { mode: 'practice', label: 'Follow', desc: 'Lyrics + guide' },
          { mode: 'practice', label: 'Sing', desc: 'Guide vocal' },
          { mode: 'hum', label: 'Melody', desc: 'Melody only' },
          { mode: 'mic', label: 'Solo', desc: 'Sing without guide' },
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() => {
              setMode(opt.mode as any);
              onClose();
            }}
            className={cn(
              'w-full text-left px-3 py-2 text-xs transition-colors',
              mode === opt.mode
                ? 'bg-muted text-foreground'
                : 'hover:bg-muted text-muted-foreground',
            )}
          >
            <span className="font-medium">{opt.label}</span>
            <span className="block text-[10px] text-muted-foreground">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="px-3 pt-2 mt-2 border-t border-border">
        <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Speed</div>
        <div className="flex items-center gap-1">
          {presets.map((p) => {
            const active = Math.abs(tempo - p) < 0.02 && guideSpeed === 'normal';
            return (
              <button
                key={p}
                onClick={() => {
                  setTempo(p);
                  setGuideSpeed('normal');
                }}
                className={cn(
                  'text-[11px] font-medium px-2 py-1 rounded transition-colors',
                  active
                    ? 'bg-foreground text-white'
                    : 'hover:bg-muted text-muted-foreground',
                )}
              >
                {Math.round(p * 100)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MixPopover({ onClose }: { onClose: () => void }) {
  const { stems, setStemVolume } = useSongPlayer();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-mix-popover]')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const stemsList = [
    { key: 'guideVocal', label: 'Guide vocal' },
    { key: 'instrumental', label: 'Instrumental' },
    { key: 'melodyRef', label: 'Melody' },
    { key: 'userVoice', label: 'Your voice' },
  ] as const;

  return (
    <div
      data-mix-popover
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-border rounded-lg shadow-sm py-3 min-w-[200px] z-50 animate-fade-in"
    >
      <div className="px-3 pb-2 mb-2 border-b border-border">
        <div className="text-xs font-semibold text-foreground">Mix</div>
      </div>
      <div className="space-y-3 px-3">
        {stemsList.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>{label}</span>
              <span className="font-mono tabular-nums">{Math.round(stems[key] * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={stems[key]}
              onChange={(e) => setStemVolume(key, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
