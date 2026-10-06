'use client';

import { useSongPlayer } from '@/state/SongPlayerContext';
import { cn } from '@/lib/utils';

export function PracticePanel() {
  const {
    voiceSource,
    setVoiceSource,
    setGuideSpeed,
    tempo,
    setTempo,
    loopMode,
    setLoopMode,
    stems,
    setStemVolume,
    setMode,
  } = useSongPlayer();

  const presets = [0.6, 0.7, 0.8, 0.9, 1.0];

  return (
    <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
        Practice Hub
      </div>

      {/* Mode Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400">Voice Setup</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setVoiceSource('male');
              setMode('guide');
            }}
            className={cn(
              'py-2 px-3 rounded-lg text-xs font-bold border transition',
              voiceSource === 'male'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
            )}
          >
            👨 Male Guide Voice
          </button>
          <button
            onClick={() => {
              setVoiceSource('user');
              setMode('user');
            }}
            className={cn(
              'py-2 px-3 rounded-lg text-xs font-bold border transition',
              voiceSource === 'user'
                ? 'bg-purple-500 text-white border-purple-400 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
            )}
          >
            🎤 My Voice Profile
          </button>
        </div>
      </div>

      {/* Stem Faders Quick Mix */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-semibold text-slate-400">Track Levels</label>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Guide Vocal</span>
              <span className="font-mono text-amber-400">{Math.round(stems.guideVocal * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={stems.guideVocal}
              onChange={(e) => setStemVolume('guideVocal', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Acoustic Instrumental</span>
              <span className="font-mono text-sky-400">{Math.round(stems.instrumental * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={stems.instrumental}
              onChange={(e) => setStemVolume('instrumental', parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Speed Presets */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <label className="text-xs font-semibold text-slate-400">Speed (Pitch Preserved)</label>
        <div className="grid grid-cols-5 gap-1">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setTempo(p);
                setGuideSpeed('normal');
              }}
              className={cn(
                'py-1.5 rounded text-xs font-bold border transition',
                tempo === p
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
              )}
            >
              {Math.round(p * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Loop Control */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <label className="text-xs font-semibold text-slate-400">Looping</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['off', 'line', 'section'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLoopMode(m)}
              className={cn(
                'py-1.5 px-2 rounded-lg text-xs font-bold border transition',
                loopMode === m
                  ? 'bg-sky-500 text-slate-950 border-sky-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
              )}
            >
              {m === 'off' ? 'Off' : m === 'line' ? 'Line 🔁' : 'Section 🔁'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
