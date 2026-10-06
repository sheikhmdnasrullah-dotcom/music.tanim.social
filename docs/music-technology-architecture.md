# Music Technology Architecture

How this application hears, measures and teaches music — what is real today, what is
approximate, and where each subsystem can be replaced.

Companion documents:

- `docs/open-source-stack.md` — library-by-library rationale and licences
- `docs/SINGING_SYNTHESIS_RESEARCH.md` — guide-voice model evaluation
- `docs/AUDIO_ASSET_AUDIT.md` — canonical stem inventory and the audio regression post-mortem

---

## 1. Layering

Every musical feature is built through the same seven layers. A feature is only as
trustworthy as the layer beneath it, so the layers are kept separable.

```text
LAYER 1  Audio input        getUserMedia, AudioContext, AnalyserNode
LAYER 2  Signal processing  time-domain buffer, RMS, MPM pitch detection
LAYER 3  Musical events     note onset, release, pitch, cents, string/fret candidates
LAYER 4  Musical context    song timeline, lesson target, tuning, section/line/syllable
LAYER 5  Practice eval      TARGET vs DETECTED vs CONFIDENCE → verdict
LAYER 6  Teacher feedback   plain-language message, then an advanced detail view
LAYER 7  Progress memory    attempts, streaks, mastery, spaced review
```

Rule: **layer N must never invent information that layer N-2 did not produce.** The UI
must not say "you played A2" when the detector only reported an unclear frame.

---

## 2. Layer 1 — Audio input

**File:** `src/hooks/use-pitch-tracker.ts`

- One `AudioContext` + one `MediaStream` per active tracker.
- `analyser.fftSize = 2048` → 43 ms of signal at 48 kHz. Chosen because the low E
  (82.4 Hz) needs about three periods to be resolvable, while a much larger window
  would make the interaction feel delayed.
- `smoothingTimeConstant = 0` — the tuner and the practice evaluator both want the raw
  window, not a running average that lags behind the player.
- `echoCancellation`, `noiseSuppression` and `autoGainControl` are **off by default**.
  They are tuned for speech and can smear instrument content. Overridable through
  `audioConstraints`.
- `start()` is idempotent — it returns early if a stream already exists, so a component
  can never open two microphones by re-rendering.
- The stream is released on unmount and on `stop()`.

**Input status** is surfaced as `error` (permission denied, no device) and `isActive`.

### Calibration (current state)

Sensitivity is exposed as `minVolumeAbsolute` (RMS floor) rather than a raw gain knob.
A guided five-step setup wizard (choose input → play a string → check signal quality →
adjust → ready) is **not built yet**.

---

## 3. Layer 2 — Pitch detection

**Library:** [`pitchy`](https://github.com/ianprime0509/pitchy) 4.1.0 (licence: 0BSD)

Uses the **McLeod Pitch Method (MPM)** — autocorrelation via the normalised square
difference function with a parabolic peak fit. Selected over a hand-rolled
autocorrelator because it handles octave errors far better and is a published,
reproducible algorithm.

Why this and not the alternatives:

| Candidate | Verdict |
| --- | --- |
| Hand-rolled autocorrelation | Rejected — the previous tuner used one; octave errors, no clarity metric |
| YIN / YIN-FFT | Good, but no equally compact, maintained browser package than `pitchy` |
| CREPE (learned model) | Rejected for now — hundreds of ms of latency, ~20 MB model, needs a WASM/ONNX runtime |
| WASM DSP | Not needed yet; MPM on a 2048-sample buffer is sub-millisecond |

Output: `[frequency, clarity]`, where `clarity` is 0–1 and is the **only** thing we
report as pitch confidence. It is never inflated.

Measured per frame and exposed as `sample.analysisMs` — the computation cost of one
frame. End-to-end latency additionally includes the ADC window (~43 ms), so the honest
figure is roughly `43 ms + analysisMs + one display frame`.

---

## 4. Layer 3 — String identification

**File:** `src/lib/music/fretboard.ts`

### The problem

Pitch does **not** uniquely determine where on the neck a note was played. A2 is
reachable from the 5th string open *and* the 6th string 5th fret. Any system that
picks one and calls it certain is lying.

### The approach

1. Convert frequency → continuous MIDI (`12·log2(f/440) + 69`), then round to get the
   semitone and cent error.
2. For every string in the tuning, compute `fret = noteMidi − openMidi` and keep the
   combinations where `0 ≤ fret ≤ maxFret`.
3. Score each surviving position with an explicit, documented prior:
   - `fretPrior(fret) = 1 / (1 + 0.35·fret)` — beginners live below the 12th fret;
   - lesson target string ×6 if it matches, ×0.08 if it does not; target fret ×4 / ×0.6;
   - previous position ×2 on the same string, ×1.3 within ±2 frets (temporal prior).
4. Normalise to posteriors that sum to 1.
5. Report **all** positions, the ranked best, and `stringConfidence = posterior(best)`.

`ambiguous` is true whenever more than one position survives and confidence is below
0.9. The explanation is rendered in the spec format:

```text
Detected A2 (110.0 Hz). Possible positions: 5th string open, 6th string 5th fret.
Most likely: 5th string open (73% confident).
```

With lesson context:

```text
Detected A2 (110.0 Hz). Possible positions: … Most likely: 5th string open (100% confident).
Lesson target: 5th string open.
```

### Honest limitation

The prior is a heuristic about beginner behaviour, **not** measured from the audio
signal. Distinguishing two positions that produce the identical pitch requires
timbre information — per-string inharmonicity, harmonic amplitudes, pluck position.
**That analysis is not implemented.** When it is, it replaces the prior function in
`identifyFretPositions`; nothing else changes.

---

## 5. Layer 4/5 — Practice evaluation

**File:** `src/lib/practice/note-evaluator.ts`

```text
Target Note ─┐
Target String├─→ evaluateNote() ─→ verdict + message + detail
Detected ────┘
```

Verdicts: `correct` · `incorrect` · `too-quiet` · `uncertain`, plus
`evaluateTiming()` → `on-time` · `too-early` · `too-late`.

Decision order (deliberate):

1. RMS below floor or no pitch → `too-quiet` — *quiet is not the same as wrong*.
2. Clarity below threshold → `uncertain` — the detector is not prepared to judge.
3. `|cents error| ≤ 50¢` → `correct`.
4. Otherwise → `incorrect`.

Correctness is decided **purely by pitch error against the target**. String/fret
identity is displayed as context but never gates pass/fail, because the same pitch is
reachable from several places.

Every evaluation carries an advanced block:

```text
TARGET: A2 · string 5 fret 0 · 110.0 Hz
DETECTED: A2 · 109.8 Hz · -1.8¢ · clarity 0.94
CONFIDENCE: 0.94
```

`CONFIDENCE` is the detector's clarity — confidence in *the reading*, not a claim that
the verdict is certainly right.

### Onset gating

The detector runs ~60×/second. `use-pitch-tracker` collapses that stream into **one
event per physical note**: a candidate must be stable for `onsetFrames` (3) before
`onNoteDetected` fires, and the note re-arms after `releaseMs` (160 ms) of silence.
Without this, a single pluck would increment the attempt counter sixty times.

The event key includes the lesson target, so moving to the next syllable re-arms the
detector even if the player produces the same pitch again.

---

## 6. Tuner

**Files:** `src/components/guitar/Tuner.tsx`, `TunerStringRow.tsx`, `src/app/guitar/tuner/page.tsx`

The tuner **reuses** `usePitchTracker`. There is exactly one pitch detector in this
application; the tuner does not run a second, weaker one.

- Note names are derived from the selected tuning's MIDI numbers, so Drop D, DADGAD,
  Open G and Open D label themselves correctly.
- The active string is whichever open string the detected pitch is nearest to.
- Beginner copy is plain language — `Perfect` / `Tune up` / `Tune down` — with cents,
  Hz and confidence confined to an advanced panel.

**History note:** the first implementation ran a hand-written O(n²) autocorrelation in
`requestAnimationFrame`, read a stale `isListening` closure so the loop never started,
and its Start button was `disabled={!isListening}` — meaning it could never be pressed.
It also hardcoded standard-tuning note names. All four defects are gone.

---

## 7. Layer 4 — Song timeline

**Files:** `src/state/SongPlayerContext.tsx`, `src/lib/music/timing.ts`,
`src/lib/audio/metronome.ts`

One authoritative clock: `AudioContext.currentTime` / HTMLAudioElement currentTime,
driven through `SongPlayerContext`. Sections → lines → syllables → notes all carry
`startTime`/`duration` on that same scale.

- The **guide vocal, instrumental, melody reference and user voice stems are kept
  sample-aligned**: the player copies the vocal element's `currentTime` onto the others
  rather than letting them drift.
- Lyric highlighting advances off that clock, giving syllable-level sync.
- **Metronome** uses the standard Web Audio lookahead scheduler (schedule ~120 ms
  ahead, tick on a 25 ms interval) — not `setInterval`-based timing.

### Known weakness

There is no single `Timeline` abstraction object yet; the clock is embodied in
`SongPlayerContext`. Any feature needing its own timing must go through that context.
Introducing a dedicated timeline module is the planned refactor, because two features
that each keep their own notion of "now" is exactly how drift starts.

---

## 8. Guide voice (singing system)

**Status: pre-rendered stems, not live synthesis.**

Guide vocals are **canonical WAV assets** committed under `public/audio/`
(`male_guide/`, `Guide — *.wav`) plus per-section melody references under
`public/audio/canonical/`. The browser plays them; it does not synthesise them.

This matters for honesty:

- The app does **not** claim real-time AI singing. It plays prepared guide audio.
- Research into live/parameterised synthesis is recorded in
  `docs/SINGING_SYNTHESIS_RESEARCH.md`: **DiffSinger** (score-driven SVS, Apache 2.0)
  for exact-melody teaching and **Seed-VC** (zero-shot voice conversion, Apache 2.0)
  for converting a guide into the learner's own voice from a 5–30 s sample.
- **OpenVoice** was rejected (speech-oriented, weak pitch control); **YuE** was rejected
  for teaching (24 GB VRAM, non-commercial weights, cannot guarantee a locked melody).

Voice policy: the guide voice is generic and non-famous. No imitation of identifiable
artists. The learner's own voice may only be used after an explicit local recording and
an explicit consent step.

---

## 9. Music data model

```text
Song
 ├── metadata (id, title, artist, bpm, key, timeSignature)
 ├── sections[]      id, name, type, startTime, duration, audioFile(s)
 │    └── lines[]    id, text, startTime, duration
 │         └── syllables[]  text, startTime, duration
 │              └── note { name, midi, frequency }
 ├── chords / guitar arrangement   (src/data/chords.ts, src/data/song-guitar.ts, src/types/guitar.ts)
 ├── timings                        (src/data/timings.ts)
 └── audio stems                    (guide / instrumental / melody / user)
```

`Syllable.note.midi` is the single source of truth for a target pitch. Nothing
converts a frequency back into a MIDI number to decide what the target was — that was
a real bug (see §11).

**Import (MusicXML / MIDI / Guitar Pro)** is not implemented. `alphaTab` is already a
dependency and is the intended engine; its integration lives behind
`src/lib/guitar/` (currently in development by a parallel workstream).

---

## 10. Open-source dependencies

| Package | Version | Licence | Role |
| --- | --- | --- | --- |
| `pitchy` | 4.1.0 | 0BSD | MPM pitch detection (tuner, practice) |
| `tone` | 15.1.22 | MIT | Audio scheduling / synthesis |
| `tonal` | 6.5.0 | MIT | Music theory (notes, chords, intervals) |
| `@coderline/alphatab` | 1.8.4 | MPL-2.0 | Tablature, MusicXML, Guitar Pro |
| `wavesurfer.js` | 8.0.1 | BSD-3-Clause | Waveform display and regions |
| `@soundtouchjs/audio-worklet` | 2.1.1 | MPL-2.0 | Time-stretch (reserved) |

All are permissively licensed except MPL-2.0 (file-level copyleft: modifications to
those packages themselves must be shared; linking from this app does not make the app
MPL).

---

## 11. Testability

**Runner:** Node's built-in test runner with native TypeScript type stripping — **zero
new dependencies**, so `package.json` stays uncontested between parallel workstreams.

```bash
node --test --import ./tests/setup/register.mjs "tests/**/*.test.ts"
```

`tests/setup/alias-loader.mjs` is a 20-line module resolve hook that maps `@/` to
`src/`, so tests can use the same import style as application code.

| Suite | Covers |
| --- | --- |
| `tests/music-fretboard.test.ts` | String numbering, every reported position really produces the pitch, ambiguity, lesson context, posterior normalisation, label formatting |
| `tests/practice-evaluator.test.ts` | correct / incorrect / too-quiet / uncertain, cent error, TARGET-DETECTED-CONFIDENCE block, timing |

**Bug these tests now pin down.** The original note-practice code computed:

```ts
Math.round((targetFreq || 440 - openNote) / 12)   // Hz minus MIDI — two different units
```

and `bestString = s + 1` over an array ordered low-to-high, which reported the low E
(MIDI 40) as *string 1*. Both are now covered by regression tests.

---

## 12. Honest limitations

Things this application does **not** do today, and will not claim to do:

- **Chord recognition.** No polyphonic detector is wired up. Chord practice must not be
  labelled "AI chord detection" until a real multi-pitch analysis exists.
- **Strum pattern detection** (down/up strokes). Not implemented. Rhythm training
  currently rests on the metronome and visual timing.
- **Muted/dead note detection.** Not implemented.
- **Fret position from timbre.** Only pitch + priors + lesson context (see §4).
- **Vocal coaching beyond pitch and timing.** Subjective qualities (tone, emotion,
  diction) cannot be honestly graded from a microphone.
- **Live guide-voice synthesis.** Pre-rendered stems only (see §8).
- **Offline operation.** Tuner, metronome and pitch detection are fully client-side and
  work offline once the page is loaded; there is no service worker yet, so a hard
  reload without network fails.

---

## 13. Replacement points

Interfaces exist so no subsystem is welded in place:

| Seam | Today | Swappable for |
| --- | --- | --- |
| `PitchDetector` | `pitchy` MPM | YIN WASM, CREPE-on-WASM |
| String identification | `identifyFretPositions()` priors | timbre/inharmonicity classifier |
| Tuner | `useTuner` → `usePitchTracker` | unchanged API, different detector |
| Guide voice | pre-rendered WAV | DiffSinger (score-driven), Seed-VC (voice conversion) |
| Tab / notation | `alphaTab` (in progress) | OpenSheetMusicDisplay, VexFlow |
| Timeline | `SongPlayerContext` | dedicated `Timeline` module |
| Metronome | Web Audio lookahead | Tone.js `Transport` |

Heavy inference (DiffSinger, Seed-VC) belongs on a backend. Microphone analysis,
tuner, metronome and recording stay local: lower latency, private, and functional
without a cloud dependency.

---

## 14. Honest status of the headline features

| Feature | Claim we are willing to make |
| --- | --- |
| Guitar tuner | Real microphone analysis, real cent error, 5 tunings |
| Single-note detection | Real MPM pitch detection with reported clarity |
| String identification | Ranked candidates + explicit confidence + ambiguity |
| Target-note practice | Real pitch comparison against the song's melody |
| Timing evaluation | Implemented and tested; not yet wired into a playing session |
| Chord practice | **Not real yet** |
| Strum detection | **Not real yet** |
| Guide singing | **Pre-rendered audio, not synthesis** |
| Song timeline + lyric sync | Real, syllable-level |
