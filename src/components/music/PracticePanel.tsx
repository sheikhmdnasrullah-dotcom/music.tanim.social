'use client';

// All practice aids in one honest panel: guide voice, guide speed, tempo,
// loop, mute. Every control here drives the shared player directly.

import { useSongPlayer } from '@/state/SongPlayerContext';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SegButton({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      role="radio"
      aria-checked={active}
      className={cn(
        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-foreground text-white' : 'bg-muted text-foreground hover:bg-neutral-200',
      )}
    >
      {children}
    </button>
  );
}

const TEMPO_PRESETS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.25, 1.5];

export function PracticePanel() {
  const {
    voiceSource,
    setVoiceSource,
    guideSpeed,
    setGuideSpeed,
    slowFileInUse,
    tempo,
    setTempo,
    loopMode,
    setLoopMode,
    guideMuted,
    toggleGuideMute,
  } = useSongPlayer();

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          Guide voice
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Guide voice">
          <SegButton
            active={voiceSource === 'male'}
            onClick={() => setVoiceSource('male')}
            ariaLabel="Male guide vocal"
          >
            Male guide
          </SegButton>
          <SegButton
            active={voiceSource === 'user'}
            onClick={() => setVoiceSource('user')}
            ariaLabel="Your voice profile"
          >
            My voice
          </SegButton>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          Guide speed
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Guide speed">
          <SegButton
            active={guideSpeed === 'normal'}
            onClick={() => setGuideSpeed('normal')}
            ariaLabel="Full speed, 80 BPM"
          >
            Full (80 BPM)
          </SegButton>
          <SegButton
            active={guideSpeed === 'slow'}
            onClick={() => setGuideSpeed('slow')}
            ariaLabel="Slow practice, 60 BPM"
          >
            Slow (60 BPM)
          </SegButton>
        </div>
        {guideSpeed === 'slow' && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {slowFileInUse
              ? 'Playing the real 60 BPM practice recording for this section.'
              : 'No 60 BPM file for this section yet — playing the guide at 75% speed with pitch preserved.'}
          </p>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          Tempo
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TEMPO_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setTempo(p)}
              aria-pressed={Math.abs(tempo - p) < 0.01}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                Math.abs(tempo - p) < 0.01
                  ? 'bg-foreground text-white'
                  : 'bg-muted text-foreground hover:bg-neutral-200',
              )}
            >
              {Math.round(p * 100)}%
            </button>
          ))}
        </div>
        <Slider
          label="Tempo"
          value={Math.round(tempo * 100)}
          min={50}
          max={150}
          step={5}
          unit="%"
          onChange={(v) => setTempo(v / 100)}
        />
      </div>

      <div>
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          Loop
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Loop mode">
          <SegButton
            active={loopMode === 'off'}
            onClick={() => setLoopMode('off')}
            ariaLabel="Loop off"
          >
            Off
          </SegButton>
          <SegButton
            active={loopMode === 'line'}
            onClick={() => setLoopMode('line')}
            ariaLabel="Loop the selected line"
          >
            Line
          </SegButton>
          <SegButton
            active={loopMode === 'section'}
            onClick={() => setLoopMode('section')}
            ariaLabel="Loop the whole section"
          >
            Section
          </SegButton>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Line loop repeats the line you last clicked. Section loop repeats the whole part.
        </p>
      </div>

      <div>
        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          Singing space
        </div>
        <Button
          variant={guideMuted ? 'primary' : 'secondary'}
          onClick={toggleGuideMute}
          aria-pressed={guideMuted}
          className="w-full"
        >
          {guideMuted ? 'Guide muted — your space to sing' : 'Silence the guide to sing'}
        </Button>
      </div>
    </div>
  );
}

