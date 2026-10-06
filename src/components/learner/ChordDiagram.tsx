'use client';

// A clean SVG chord chart built from our own chord data.
// No engine, no canvas — plain React.
//
// Convention: low E on the left, high E on the right, nut on top.
// With the app's default capo (2), a capo bar is drawn above the nut.

import type { Chord } from '@/data/chords';
import { cn } from '@/lib/utils';

interface ChordDiagramProps {
  chord: Chord;
  /** Finger to spotlight (others dimmed). null = show all. */
  highlightFinger?: number | null;
  capo?: number;
  className?: string;
}

// String x positions: low E (string 6) leftmost.
const STRING_X = [180, 152, 124, 96, 68, 40]; // index = string 1..6
const NUT_Y = 46;
const FRET_Y = [70, 110, 150, 190, 230];
const MARK_Y = 58;

function dotY(fret: number): number {
  return FRET_Y[fret - 1] + 20;
}

export function ChordDiagram({ chord, highlightFinger = null, capo = 2, className }: ChordDiagramProps) {
  const strumLow = Math.max(...chord.strum); // lowest (thickest) string strummed
  const strumHigh = Math.min(...chord.strum); // highest (thinnest) string strummed

  return (
    <svg
      viewBox="0 0 220 268"
      className={cn('w-full max-w-[240px]', className)}
      role="img"
      aria-label={`${chord.name} chord diagram`}
    >
      {/* Capo bar */}
      {capo > 0 && (
        <g>
          <rect x={28} y={20} width={164} height={12} rx={2} fill="#171717" />
          <text x={110} y={30} textAnchor="middle" fontSize={9} fill="#ffffff" fontFamily="monospace">
            CAPO {capo}
          </text>
        </g>
      )}

      {/* Strings */}
      {STRING_X.map((x, i) => {
        const stringNum = i + 1; // 1..6
        const muted = chord.frets[5 - i] === -1;
        return (
          <line
            key={stringNum}
            x1={x}
            y1={NUT_Y}
            x2={x}
            y2={FRET_Y[4]}
            stroke={stringNum === 1 ? '#404040' : '#737373'}
            strokeWidth={stringNum === 1 ? 1.2 : 0.8 + (6 - stringNum) * 0.12}
          />
        );
      })}

      {/* Nut */}
      <rect x={28} y={NUT_Y - 4} width={164} height={5} fill="#171717" />

      {/* Fret wires */}
      {FRET_Y.slice(0, 4).map((y) => (
        <line key={y} x1={30} y1={y} x2={190} y2={y} stroke="#d4d4d4" strokeWidth={1.5} />
      ))}
      <line x1={30} y1={FRET_Y[4]} x2={190} y2={FRET_Y[4]} stroke="#a3a3a3" strokeWidth={1.5} />

      {/* Fret numbers */}
      {[1, 2, 3, 4].map((f) => (
        <text key={f} x={204} y={dotY(f) + 3} fontSize={9} fill="#a3a3a3" fontFamily="monospace">
          {f}
        </text>
      ))}

      {/* Muted / open markers */}
      {chord.frets.map((fret, i) => {
        const stringNum = 6 - i; // frets array is low E first
        const x = STRING_X[stringNum - 1];
        if (fret === -1) {
          return (
            <g key={`m-${stringNum}`} stroke="#dc2626" strokeWidth={2} strokeLinecap="round">
              <line x1={x - 5} y1={MARK_Y - 5} x2={x + 5} y2={MARK_Y + 5} />
              <line x1={x + 5} y1={MARK_Y - 5} x2={x - 5} y2={MARK_Y + 5} />
            </g>
          );
        }
        if (fret === 0) {
          return (
            <circle
              key={`o-${stringNum}`}
              cx={x}
              cy={MARK_Y}
              r={5}
              fill="none"
              stroke="#171717"
              strokeWidth={1.5}
            />
          );
        }
        return null;
      })}

      {/* Finger dots */}
      {chord.fingers.map((f) => {
        const x = STRING_X[f.string - 1];
        const y = dotY(f.fret);
        const highlighted = highlightFinger !== null && f.finger === highlightFinger;
        const dimmed = highlightFinger !== null && !highlighted;
        return (
          <g key={`${f.string}-${f.fret}`} opacity={dimmed ? 0.25 : 1}>
            <circle
              cx={x}
              cy={y}
              r={13}
              fill={highlighted ? '#d97706' : '#171717'}
              stroke={highlighted ? '#d97706' : 'none'}
              strokeWidth={highlighted ? 3 : 0}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="#ffffff"
            >
              {f.finger}
            </text>
          </g>
        );
      })}

      {/* Strum range marker: lowest string to start the strum */}
      <g>
        <text
          x={STRING_X[strumLow - 1]}
          y={252}
          textAnchor="middle"
          fontSize={13}
          fill="#d97706"
          fontWeight={700}
        >
          ↓
        </text>
        <text x={110} y={264} textAnchor="middle" fontSize={9} fill="#737373" fontFamily="monospace">
          strum {strumLow}→{strumHigh}
        </text>
      </g>
    </svg>
  );
}
