'use client';

import { useEffect, useRef } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';

interface PitchVisualizerProps {
  lineId?: string;
  height?: number;
}

const MIDI_MIN = 46;
const MIDI_MAX = 68;

function midiToY(midi: number, h: number): number {
  const normalized = (midi - MIDI_MIN) / (MIDI_MAX - MIDI_MIN);
  return h - normalized * h * 0.75 - h * 0.12;
}

export function PitchVisualizer({ lineId, height = 120 }: PitchVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { lines, currentLineId, activeLineId, isPlaying, currentTime } = useSongPlayer();

  const targetId = lineId ?? (isPlaying ? currentLineId : activeLineId ?? currentLineId);
  const line = lines.find((l) => l.id === targetId) ?? lines[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !line) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(50, rect.width);
    const h = height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, w, h);

    // Subtle guide pitch grid lines (C3, D3, E3, G3, A3, C4, D4, E4)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridNotes = [48, 50, 52, 55, 57, 60, 62, 64];
    gridNotes.forEach((midi) => {
      const y = midiToY(midi, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });

    const dur = Math.max(0.01, line.duration);
    const points = line.syllables.map((syl) => {
      const sStart = syl.startTime >= line.startTime ? syl.startTime - line.startTime : syl.startTime;
      return {
        x: Math.max(10, Math.min(w - 10, (sStart / dur) * w)),
        y: midiToY(syl.note.midi, h),
        text: syl.text,
        note: syl.note.name,
      };
    });

    // Pitch Curve line
    if (points.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      // Played progress highlight
      const lineRelTime = currentTime >= line.startTime ? currentTime - line.startTime : currentTime;
      const playX = Math.max(0, Math.min(w, (lineRelTime / dur) * w));
      const played = points.filter((p) => p.x <= playX);
      if (played.length > 1) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        played.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }

      // Note dots + pitch names
      points.forEach((p) => {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(p.note, p.x - 6, p.y - 8);
      });

      // Playhead vertical line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, h);
      ctx.stroke();
    }
  }, [line, height, currentTime]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#090D16] shadow-inner mt-3">
      <div className="text-[11px] font-mono text-slate-400 px-3 py-1 bg-slate-900/60 border-b border-slate-800/80 flex justify-between">
        <span>Melody Pitch Contour</span>
        <span>Key: D minor (Low D3 → Peak F4)</span>
      </div>
      <canvas ref={canvasRef} className="w-full block" />
    </div>
  );
}
