# Open-Source Music Stack

Library-by-library rationale and current usage. Versions are read from
`package.json`. The honesty rule for the whole stack: a library is only
counted as “in use” if a feature that reaches the learner imports it.

## Core

| Library | Version | Role | Status |
| --- | --- | --- | --- |
| `next` | 16.3.8 | App framework (App Router, Turbopack build) | In use |
| `react` / `react-dom` | 19.2.8 | UI | In use |
| `typescript` | ^5 | Type safety, run in tests via Node 24 type stripping | In use |
| `tailwindcss` + `@tailwindcss/postcss` | ^4 | Utility-first CSS, `@theme inline` tokens | In use |

## Music

| Library | Version | Role | Status |
| --- | --- | --- | --- |
| `pitchy` | ^4.1.0 | McLeod Pitch Method (MPM) autocorrelation pitch detector — the ear for tuner, note-practice, and SingCheck | In use (`src/hooks/use-pitch-tracker.ts`) |
| `tonal` | ^6.5.0 | Music-theory helpers (note names, intervals, scale degrees) | Available; theory logic in `src/lib/music/notes.ts` / `theory.ts` is intentionally self-contained and tested |
| `tone` | ^15.1.22 | Web Audio synth/scheduling | Available; the metronome and guitar synth are hand-rolled Web Audio (`src/lib/audio/`) and do not import it |

## UI

| Library | Version | Role | Status |
| --- | --- | --- | --- |
| `lucide-react` | ^1.52.0 | Icons (transport, nav) | In use |
| `class-variance-authority` + `clsx` + `tailwind-merge` | — | `cn()` and variant-based components | In use |

## No backend, no models

- There is no database, no Prisma, no ORM, and no account system. Progress
  lives in `localStorage` (`src/lib/practice/progress-store.ts`).
- No MediaPipe, no ML runtime, and no generative-audio model is installed
  or loaded in the browser. Generation is behind provider adapters that
  report unavailable until a real, licensed service is configured
  (`docs/MUSIC_GENERATION_COMPARISON.md`, `docs/MUSIC_MODEL_LICENSES.md`).

## Removed / no longer referenced

Earlier versions of the app scaffolded heavier audio tooling that the
current implementation does not import:

- `wavesurfer.js` / `@wavesurfer/react` — the player uses synchronized
  `HTMLAudioElement` stems with a `requestAnimationFrame` master clock.
- `@coderline/alphatab` — tab rendering was dropped with the dead
  `src/lib/guitar/` scaffold.
- `@soundtouchjs/audio-worklet` — slow practice is done with
  pitch-preserving `playbackRate`, not offline time-stretching.

These packages still appear in `package.json` and should be pruned in a
dedicated dependency-hygiene pass (they are not imported anywhere under
`src/` today).
