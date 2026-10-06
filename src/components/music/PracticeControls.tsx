'use client';

import React, { useState } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PracticeControls() {
  const {
    setMode,
    setStemVolume,
    setTempo,
    setLoopMode,
    play,
    pause,
    seekToTime,
    isPlaying,
  } = useSongPlayer();

  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      num: 1,
      title: '1. 🎧 Listen to Guide',
      actionLabel: 'Listen (Full Vocal + Backing)',
      desc: 'Hear the male singer sing the locked lyrics with acoustic accompaniment.',
      execute: () => {
        setMode('guide');
        setStemVolume('guideVocal', 1.0);
        setStemVolume('instrumental', 0.85);
        setTempo(1.0);
        seekToTime(0);
        play();
      },
    },
    {
      num: 2,
      title: '2. 🐢 Slow Down Drill',
      actionLabel: 'Slow to 70% Speed',
      desc: 'Slow down the phrasing to understand every syllable without pitch distortion.',
      execute: () => {
        setMode('guide');
        setStemVolume('guideVocal', 1.0);
        setStemVolume('instrumental', 0.85);
        setTempo(0.7);
        seekToTime(0);
        play();
      },
    },
    {
      num: 3,
      title: '3. 🎤 Sing Along With Guide',
      actionLabel: 'Sing With Guide (Equal Mix)',
      desc: 'Sing together with the guide vocal at normal tempo.',
      execute: () => {
        setMode('practice');
        setStemVolume('guideVocal', 0.8);
        setStemVolume('instrumental', 0.85);
        setTempo(1.0);
        seekToTime(0);
        play();
      },
    },
    {
      num: 4,
      title: '4. 🔉 Fade Guide Vocal',
      actionLabel: 'Reduce Guide to 30%',
      desc: 'Let the guide whisper in the background while your voice leads.',
      execute: () => {
        setMode('practice');
        setStemVolume('guideVocal', 0.3);
        setStemVolume('instrumental', 0.9);
        seekToTime(0);
        play();
      },
    },
    {
      num: 5,
      title: '5. 🌟 Sing Solo Over Backing',
      actionLabel: 'Solo Singing (Guide Muted)',
      desc: 'Perform the melody on your own over the fingerpicked guitar track!',
      execute: () => {
        setMode('mic');
        setStemVolume('guideVocal', 0.0);
        setStemVolume('instrumental', 1.0);
        seekToTime(0);
        play();
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-400">Vocal Teacher Routine</span>
        <span className="text-amber-400 font-bold">Step {currentStep} of 5</span>
      </div>

      <div className="space-y-2">
        {steps.map((s) => {
          const active = currentStep === s.num;
          return (
            <div
              key={s.num}
              className={cn(
                'p-2.5 rounded-xl border transition-all text-xs',
                active
                  ? 'bg-slate-800 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700',
              )}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className={active ? 'text-amber-400' : 'text-slate-300'}>{s.title}</span>
                <Button
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => {
                    setCurrentStep(s.num);
                    s.execute();
                  }}
                  className={cn(
                    'h-7 text-[11px] px-2.5 font-bold',
                    active
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-300',
                  )}
                >
                  ▶ Start Step
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}