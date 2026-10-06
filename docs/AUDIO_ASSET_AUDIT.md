# Audio Asset Audit

Current state of `public/audio` and how each asset set is used.
Companion docs: `docs/music-technology-architecture.md` (signal path),
`docs/MUSIC_GENERATION_COMPARISON.md` (generation policy).

## Inventory

| Location | Contents | Used by |
| --- | --- | --- |
| `public/audio/male_guide/` | 9 files — full song + 8 section guide-vocal recordings (~15 MB) | Player `guideVocal` stem (`section.audioFile`) |
| `public/audio/user_voice/` | 10 files — full song + 8 sections + `User_Voice_Reference_Clean.wav` (~130 MB) | Player `userVoice` stem (`section.userAudioFile`) |
| `public/audio/canonical/` | 45 files — 5 stems × 8 sections + 5 full-song stems (`*_guide_vocal`, `*_instrumental`, `*_melody_ref`, `*_user_voice`, `*_full_mix`) (~430 MB) | Player `instrumental` and `melodyRef` stems; fallback guide-vocal source |
| `public/audio/*.wav` / `*.mid` | Reference exports: `01 — Full Melody Guide (80 BPM)`, `02 — Slow Practice Melody (60 BPM)`, and per-section `Guide — <Section>` WAV/MIDI pairs | Reference/authoring only — **not** in playback |
| `music/songs/before-i-learned-the-words/song.json` | Canonical manifest (version `1.0.0`, sections, lyrics, required stems) | `npm run music:verify` |

The canonical package is complete: every section ships all five stems.
Naming is `verse-1_instrumental.wav` style (the bridge/outro ids have no
hyphen, matching their section ids).

## Verification

`npm run music:verify` (`scripts/verify-song-assets.mjs`) reads the
manifest and checks every full-song and section stem for: existence,
RIFF/WAVE container, PCM 16-bit format, sample rate, channels, and data
duration. Run it before treating the canonical package as ready.

## Playback usage (what is actually heard)

- **guideVocal** — `male_guide/<Section>.wav` (real recordings of the
  locked melody).
- **instrumental / melodyRef** — `canonical/<section>_instrumental.wav` /
  `_melody_ref.wav` (locked, versioned with the manifest; the
  `hum` mode raises the melody-ref stem).
- **userVoice** — `user_voice/<Section>.wav` (the learner’s voice profile).
- **slow practice** — the player uses pitch-preserving
  `playbackRate` (0.5×–1.5×) on the 80 BPM stems; the 60 BPM reference
  files are kept for authoring reference only.
- **recordings** — `MediaRecorder` captures the microphone to an in-memory
  WebM blob; it is playable in the UI but is never persisted to disk and
  never uploaded.

## Honesty notes (unchanged policy)

- Nothing in the player is synthesized in real time. The Karplus-Strong
  guitar model and Web Audio metronome are used only in the guitar
  trainers, never in song playback.
- No generative model output is in canonical playback
  (`docs/MUSIC_GENERATION_COMPARISON.md`); `/api/music-generation/status`
  reports adapters as unavailable until a real service is configured.
- If a stem is ever missing, the audio element simply stays silent and the
  UI reports what is actually loaded — no substitute content is swapped in.

## History

- **Regression post-mortem (pre-fix):** line/syllable timings were
  authoring placeholders (`startTime: 0`) while real per-section audio
  existed, so karaoke-style tracking silently did nothing. Fixed by
  generating `src/data/timings.ts` from the guide-vocal audio
  (`scripts/build-timings.mjs`), wiring `buildSectionTiming` into the
  player, and guarding the invariants with `tests/timeline.test.ts`.
- **Canonical stems** were previously incomplete (some sections had only
  `full_mix`) and were kept out of playback on that basis; the package is
  now complete and verified, and the player uses the locked stems.
