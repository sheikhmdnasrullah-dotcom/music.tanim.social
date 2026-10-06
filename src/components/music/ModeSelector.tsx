'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';
import type { PracticeMode } from '@/types/song';

interface ModeOption {
  id: PracticeMode;
  label: string;
  icon: string;
  desc: string;
  badge: string;
}

const MODES: ModeOption[] = [
  {
    id: 'guide',
    label: 'Male Guide',
    icon: '👨',
    desc: 'Listen to the full male singing voice with acoustic backing',
    badge: '100% Vocal + Backing',
  },
  {
    id: 'hum',
    label: 'Hum Only',
    icon: '🎵',
    desc: 'Pure acoustic melody tone (Mmm/La-la) for pitch ear training',
    badge: 'Melody Tone + Backing',
  },
  {
    id: 'practice',
    label: 'Practice With Guide',
    icon: '🎧',
    desc: 'Sing along with the guide vocal & real-time syllable highlight',
    badge: 'Interactive Sing-Along',
  },
  {
    id: 'user',
    label: 'My Voice Profile',
    icon: '🎤',
    desc: 'Melody rendered in personal voice profile (~160 Hz)',
    badge: 'Personalized Profile',
  },
  {
    id: 'mic',
    label: 'Record & Feedback',
    icon: '🔴',
    desc: 'Sing solo over instrumental backing and record your performance',
    badge: 'Solo Mic Practice',
  },
];

export function ModeSelector() {
  const { mode, setMode } = useSongPlayer();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
        <span>Learning & Playback Modes</span>
        <span className="text-amber-400">Active: {MODES.find((m) => m.id === mode)?.label}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex flex-col text-left p-3 rounded-xl border transition-all duration-150 relative group',
                active
                  ? 'bg-slate-800 border-amber-500 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{m.icon}</span>
                <span
                  className={cn(
                    'font-bold text-sm truncate',
                    active ? 'text-amber-400' : 'text-slate-200',
                  )}
                >
                  {m.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                {m.desc}
              </p>
              <span
                className={cn(
                  'text-[10px] font-mono px-2 py-0.5 rounded-full self-start font-medium',
                  active
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700',
                )}
              >
                {m.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}