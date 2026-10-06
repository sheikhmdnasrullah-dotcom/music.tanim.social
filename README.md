# Before I Learned the Words — Music Learning App

A local-first practice environment for one locked song: **“Before I Learned
the Words”** (D minor, 80 BPM, 4/4, capo 2). It teaches the melody by
singing, and the guitar part by chord, transition, and strumming drills —
with real microphone feedback wherever the UI claims to measure anything.

## What is real

- **Playback** — synchronized multi-stem `HTMLAudioElement` player over
  locked WAV stems (guide vocal, instrumental, melody reference, user
  voice profile), with pitch-preserving slow practice and phrase/section
  looping.
- **Pitch feedback** — `pitchy` (McLeod Pitch Method) microphone analysis:
  guitar tuner, note practice with string/fret identification, and the
  singing “Check my pitch” loop, all judged as TARGET vs DETECTED vs
  CONFIDENCE with honest non-verdicts (`too-quiet`, `uncertain`).
- **Guitar synthesis** — Karplus-Strong plucked-string Web Audio model
  (capo-2 standard tuning) for chord and strum practice; a lookahead
  Web Audio metronome scheduler shared by the metronome page and the
  strumming trainer.
- **Progress** — local-only (`localStorage`): attempts, clean streaks,
  mastery (learning → mastered → solid), spaced review (1/3/7/14 days),
  and next-action planning. No backend, no account.
- **Timings** — line/syllable timings are generated from the
  guide-vocal audio (`scripts/build-timings.mjs`), not hand-drawn, and are
  guarded by tests.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Multi-stem player: section transport, modes, stem mixer, line/syllable tracking, recording |
| `/practice?section=…&line=…` | Practice room: stage, drills, measured pitch check, self-report, guitar context |
| `/song` | Full lyric sheet with note-for-note melody and structure |
| `/your-song` | Songwriting template: the song’s structure + degree-labeled progressions |
| `/guitar` | Guitar hub |
| `/guitar/chords` · `/guitar/transitions` · `/guitar/strumming` | Chord shapes, move coaching, strum stages |
| `/guitar/metronome` · `/guitar/tuner` · `/guitar/note-practice` | Timing, tuning, and measured note practice |
| `/progress` | Mastery, review queue, milestones, session history |
| `/api/music-generation/status` | Reports generation adapters (unavailable until a licensed service is configured) |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Microphone features (tuner, note practice, SingCheck, recording) need
browser permission for `getUserMedia`; everything else works without it.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next config + React hooks rules) |
| `npm test` | Node 24 native test runner over `tests/*.test.ts` (zero test dependencies; `tests/setup/register.mjs` maps `@/` imports) |
| `npm run music:verify` | Verifies every canonical stem (RIFF/PCM16/rate/channels/duration) against the manifest |

## Architecture docs

- `docs/music-technology-architecture.md` — the seven-layer signal path (input → processing → events → context → eval → feedback → progress)
- `docs/MUSIC_LEARNING_ARCHITECTURE.md` — items, mastery ladder, spaced review, feedback-loop policy
- `docs/AUDIO_ASSET_AUDIT.md` — audio inventory, verification, playback usage
- `docs/DESIGN_SYSTEM.md` — tokens and component conventions
- `docs/open-source-stack.md` — library rationale and honest usage status
- `docs/MUSIC_GENERATION_COMPARISON.md` + `docs/MUSIC_MODEL_LICENSES.md` — generation policy (none in canonical playback)
- `docs/PLACEHOLDER_AUDIT.md` — what is real vs intentionally unavailable

## Repository & deployment

- Repo: `github.com/sheikhmdnasrullah-dotcom/music.tanim.social`, branch `main`
- Hosting: Vercel project `project` — push to `main` is the release
  (https://music.tanim.social)
- Before pushing: `npm run typecheck && npm test && npm run build`
- Multiple agents share this working tree — stage your own files, never
  force-push (full rules in `AGENTS.md`)
