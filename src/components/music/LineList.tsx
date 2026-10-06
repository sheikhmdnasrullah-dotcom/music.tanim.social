'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function LineList() {
  const {
    lines,
    currentLineId,
    activeLineId,
    isPlaying,
    loopMode,
    setLoopMode,
    seekToLine,
    playLineOnly,
    loopLine,
    section,
    setTempo,
    setMode,
  } = useSongPlayer();

  const highlighted = isPlaying
    ? currentLineId
    : (activeLineId ?? currentLineId ?? lines[0]?.id ?? null);
  const loopingLineId = loopMode === 'line' ? (activeLineId ?? currentLineId) : null;

  return (
    <div className="space-y-3" role="list" aria-label={`${section.name} lines`}>
      <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider px-1">
        <span>Line-by-Line Vocal Practice Drills</span>
        <span>{lines.length} Locked Phrases</span>
      </div>

      {lines.map((line, i) => (
        <div
          key={line.id}
          className={cn(
            'p-4 rounded-xl transition-all border shadow-sm',
            line.id === highlighted
              ? 'bg-slate-900 border-amber-500/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800',
          )}
          role="listitem"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                  {i + 1}
                </span>
                <p
                  className={cn(
                    'font-bold text-base',
                    line.id === highlighted ? 'text-white' : 'text-slate-200',
                  )}
                >
                  {line.text}
                </p>
              </div>

              {line.pronunciation && (
                <p className="text-xs italic text-amber-300/80 mt-1 font-mono pl-7">
                  🗣 {line.pronunciation}
                </p>
              )}

              {line.visualContour && (
                <p className="text-[11px] text-slate-400 mt-0.5 pl-7 font-mono">
                  📈 {line.visualContour}
                </p>
              )}
            </div>

            {/* Drill Buttons per line */}
            <div className="flex items-center gap-1.5 flex-wrap pl-7 md:pl-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => playLineOnly(line.id)}
                className="text-xs h-8 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Play this line"
              >
                ▶ Hear
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => loopLine(line.id)}
                className={cn(
                  'text-xs h-8 border-slate-700 font-semibold',
                  loopingLineId === line.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200',
                )}
                title="Loop this phrase continuously"
              >
                🔁 Loop
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTempo(0.7);
                  playLineOnly(line.id);
                }}
                className="text-xs h-8 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Practice slowly at 70% speed (pitch preserved)"
              >
                🐢 Slow
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMode('practice');
                  playLineOnly(line.id);
                }}
                className="text-xs h-8 border-sky-800 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300"
                title="Sing along with guide"
              >
                🎤 Sing
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
