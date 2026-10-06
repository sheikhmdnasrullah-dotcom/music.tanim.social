'use client';

import React, { useState } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { Button } from '@/components/ui/button';

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ onReady }: { onReady?: () => void } = {}) {
  const {
    isReady,
    isPlaying,
    togglePlay,
    stop,
    currentTime,
    duration,
    section,
    seekToTime,
    tempo,
    setTempo,
    guideSpeed,
    setGuideSpeed,
    loopMode,
    setLoopMode,
    stems,
    setStemVolume,
    isRecording,
    startRecording,
    stopRecording,
    recordedAudioUrl,
  } = useSongPlayer();

  React.useEffect(() => {
    if (isReady && onReady) onReady();
  }, [isReady, onReady]);

  const [showMixer, setShowMixer] = useState(true);
  const [showInspector, setShowInspector] = useState(false);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Header / Section Info */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="text-xs font-bold tracking-widest uppercase text-amber-400">
            {section.name} · Master Multi-Stem Player
          </div>
          <div className="text-sm font-mono text-slate-400 mt-0.5">
            {fmt(currentTime)} / {fmt(duration)} · 80 BPM (D minor)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMixer(!showMixer)}
            className="text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            🎛 {showMixer ? 'Hide Stems' : 'Mixer Stems'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInspector(!showInspector)}
            className="text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            🔍 Audio Inspector
          </Button>
        </div>
      </div>

      {/* Scrubable Progress Bar */}
      <div className="space-y-1">
        <div
          className="h-3 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            seekToTime(pos * duration);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-amber-500 transition-all duration-75 relative"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-md" />
          </div>
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Master Transport & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={stop}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Stop & Return to Start"
          >
            ■ Stop
          </Button>
          <Button
            size="lg"
            onClick={togglePlay}
            disabled={!isReady}
            className="min-w-[130px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30"
          >
            {isPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
          </Button>
          <Button
            variant="outline"
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            className={`border-red-900 font-bold ${
              isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-red-950/40 text-red-400 hover:bg-red-900/60'
            }`}
          >
            {isRecording ? '⏹ Stop Mic' : '🔴 Record Mic'}
          </Button>
        </div>

        {/* Speed & Loop Quick Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Loop Mode */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <span className="text-[11px] font-semibold text-slate-400 px-1.5">Loop:</span>
            {(['off', 'line', 'section'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setLoopMode(mode)}
                className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                  loopMode === mode ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {mode === 'off' ? 'Off' : mode === 'line' ? 'Line 🔁' : 'Section 🔁'}
              </button>
            ))}
          </div>

          {/* Speed Presets (Pitch Preserved) */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <span className="text-[11px] font-semibold text-slate-400 px-1.5">Speed:</span>
            {[0.6, 0.8, 1.0].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setTempo(rate);
                  setGuideSpeed('normal');
                }}
                className={`text-xs px-2 py-1 rounded font-medium transition ${
                  tempo === rate && guideSpeed === 'normal'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {Math.round(rate * 100)}%
              </button>
            ))}
            <button
              onClick={() => {
                setTempo(1.0);
                setGuideSpeed(guideSpeed === 'slow' ? 'normal' : 'slow');
              }}
              className={`text-xs px-2 py-1 rounded font-medium transition ${
                guideSpeed === 'slow'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              🐢 Slow
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Stem Mixer Faders Panel */}
      {showMixer && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mt-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex justify-between">
            <span>Independent Audio Stems Mixer</span>
            <span className="text-[11px] text-emerald-400">● 44.1 kHz Stereo PCM</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Guide Vocal Stem */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-400">👨 Guide Vocal</span>
                <span className="font-mono text-slate-400">{Math.round(stems.guideVocal * 100)}%</span>
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
              <button
                onClick={() => setStemVolume('guideVocal', stems.guideVocal > 0 ? 0 : 0.9)}
                className={`w-full text-[11px] py-1 rounded border font-medium ${
                  stems.guideVocal > 0
                    ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                    : 'border-slate-700 text-slate-500 bg-slate-800'
                }`}
              >
                {stems.guideVocal > 0 ? 'Vocal Active' : 'Vocal Muted'}
              </button>
            </div>

            {/* Acoustic Instrumental Stem */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-sky-400">🎸 Acoustic Backing</span>
                <span className="font-mono text-slate-400">{Math.round(stems.instrumental * 100)}%</span>
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
              <button
                onClick={() => setStemVolume('instrumental', stems.instrumental > 0 ? 0 : 0.85)}
                className={`w-full text-[11px] py-1 rounded border font-medium ${
                  stems.instrumental > 0
                    ? 'border-sky-500/40 text-sky-300 bg-sky-500/10'
                    : 'border-slate-700 text-slate-500 bg-slate-800'
                }`}
              >
                {stems.instrumental > 0 ? 'Backing Active' : 'Backing Muted'}
              </button>
            </div>

            {/* Melody Reference Stem */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-400">🎵 Melody Tone (Hum)</span>
                <span className="font-mono text-slate-400">{Math.round(stems.melodyRef * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={stems.melodyRef}
                onChange={(e) => setStemVolume('melodyRef', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <button
                onClick={() => setStemVolume('melodyRef', stems.melodyRef > 0 ? 0 : 0.8)}
                className={`w-full text-[11px] py-1 rounded border font-medium ${
                  stems.melodyRef > 0
                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                    : 'border-slate-700 text-slate-500 bg-slate-800'
                }`}
              >
                {stems.melodyRef > 0 ? 'Melody Active' : 'Melody Off'}
              </button>
            </div>

            {/* User Voice Profile Stem */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-purple-400">🎤 My Voice Profile</span>
                <span className="font-mono text-slate-400">{Math.round(stems.userVoice * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={stems.userVoice}
                onChange={(e) => setStemVolume('userVoice', parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <button
                onClick={() => setStemVolume('userVoice', stems.userVoice > 0 ? 0 : 0.9)}
                className={`w-full text-[11px] py-1 rounded border font-medium ${
                  stems.userVoice > 0
                    ? 'border-purple-500/40 text-purple-300 bg-purple-500/10'
                    : 'border-slate-700 text-slate-500 bg-slate-800'
                }`}
              >
                {stems.userVoice > 0 ? 'Voice Profile ON' : 'Voice Profile OFF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Voice Playback if Available */}
      {recordedAudioUrl && (
        <div className="bg-red-950/30 border border-red-800/60 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-red-400">● Your Recording Ready</span>
            <p className="text-slate-400 text-[11px]">Compare your singing with the guide</p>
          </div>
          <audio src={recordedAudioUrl} controls className="h-8 max-w-xs" />
        </div>
      )}

      {/* Audio Diagnostics Inspector */}
      {showInspector && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-1 text-slate-400">
          <div className="text-slate-200 font-bold mb-1">Audio Diagnostic Inspector:</div>
          <div>• Song Title: Before I Learned the Words (Key: D minor / 80 BPM)</div>
          <div>• Active Section: {section.name} ({section.id})</div>
          <div>• Vocal Stem: {section.audioFile}</div>
          <div>• Instrumental Stem: {section.instrumentalAudioFile}</div>
          <div>• Duration: {duration.toFixed(2)}s | Position: {currentTime.toFixed(2)}s</div>
          <div>• Master Audio Context: 44,100 Hz PCM Stereo (Clean Pitch Preserved)</div>
        </div>
      )}
    </div>
  );
}
