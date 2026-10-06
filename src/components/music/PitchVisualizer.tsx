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

export function PitchVisualizer({ lineId, height = 80 }: PitchVisualizerProps) {
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
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, w, h);

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

    if (points.length > 1) {
      ctx.strokeStyle = '#d4d4d4';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      const lineRelTime = Math.max(0, currentTime - line.absoluteStart);
      const playX = Math.max(0, Math.min(w, (lineRelTime / dur) * w));
      const played = points.filter((p) => p.x <= playX);
      if (played.length > 1) {
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        played.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }

      points.forEach((p) => {
        ctx.fillStyle = played.length > 0 && p.x <= playX ? '#0a0a0a' : '#a3a3a3';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (points.length > 0) {
        ctx.strokeStyle = '#737373';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, h);
        ctx.stroke();
      }
    }
  }, [line, height, currentTime]);

  return (
    <div className="w-full overflow-hidden rounded-md">
      <canvas ref={canvasRef} className="w-full block" />
    </div>
  );
}
