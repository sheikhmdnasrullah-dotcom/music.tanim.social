'use client';

// Draws the melody contour of one line from the syllable note data,
// with a moving playhead. It visualizes the song's written melody —
// nothing it hears from you.

import { useEffect, useRef } from 'react';
import { useSongPlayer } from '@/state/SongPlayerContext';

interface PitchVisualizerProps {
  lineId?: string;
  height?: number;
}

const MIDI_MIN = 46;
const MIDI_MAX = 70;

function midiToY(midi: number, h: number): number {
  const normalized = (midi - MIDI_MIN) / (MIDI_MAX - MIDI_MIN);
  return h - normalized * h * 0.85 - h * 0.075;
}

export function PitchVisualizer({ lineId, height = 140 }: PitchVisualizerProps) {
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
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // Soft grid at C3, D3, E3, F3, G3, A3, B3, C4
    ctx.strokeStyle = '#ececec';
    ctx.lineWidth = 1;
    for (let midi = 48; midi <= 64; midi += 2) {
      const y = midiToY(midi, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const dur = Math.max(0.001, line.duration);
    const points = line.syllables.map((syl) => ({
      x: ((syl.startTime - line.startTime) / dur) * w,
      y: midiToY(syl.note.midi, h),
      text: syl.text,
    }));

    // Contour
    if (points.length > 1) {
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      // Played portion in accent
      const playX = ((currentTime - line.startTime) / dur) * w;
      const played = points.filter((p) => p.x <= playX);
      if (played.length > 1) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        played.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }

      // Dots
      points.forEach((p) => {
        ctx.fillStyle = '#171717';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Playhead
      if (isPlaying && playX >= 0 && playX <= w) {
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(playX, 4);
        ctx.lineTo(playX, h - 4);
        ctx.stroke();
      }
    }

    // Syllable labels
    if (points.length > 0 && w > 260) {
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#737373';
      points.forEach((p) => ctx.fillText(p.text, p.x, p.y - 7));
    }
  }, [line, currentTime, isPlaying, height]);

  return (
    <div className="w-full rounded-lg border border-border bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full block"
        aria-label="Melody contour of the current line"
      />
    </div>
  );
}
