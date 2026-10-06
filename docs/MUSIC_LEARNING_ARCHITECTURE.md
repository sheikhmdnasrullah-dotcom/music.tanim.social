# Music Learning Architecture

How the app turns a locked song into a practice system. The technical
signal path is documented in `docs/music-technology-architecture.md`; this
document covers the learning layer above it.

## The locked source of truth

- One song: “Before I Learned the Words”, D minor, 80 BPM, 4/4, capo 2.
- Lyrics, note-for-note melody, timings, and chord charts are frozen in
  `src/data/song.ts`, `src/data/timings.ts` (generated) and
  `src/data/song-guitar.ts`, mirrored by the canonical manifest
  `music/songs/before-i-learned-the-words/song.json`
  (`canonicalSongVersion: 1.0.0`).
- Every feature (player, karaoke, drills, theory, songwriting template)
  derives from that data. No feature hardcodes notes that the data does not
  contain.

## Learning items

Each practiceable thing is an item with a stable id:

| Kind | Item id shape | Where practiced |
| --- | --- | --- |
| Chord | `chord:<id>` | `/guitar/chords` |
| Transition | `transition:<id>` | `/guitar/transitions` |
| Strum stage | `strum:<stage>` | `/guitar/strumming` |
| Line (vocal) | `line:<section>:<index>` | `/practice`, SingCheck |
| Note target | `line:<section>:<index>` (shared with the line) | `/guitar/note-practice` |

The curriculum order lives in `CURRICULUM` (`src/lib/practice/plan.ts`):
chords → transitions → strumming stages → lines in song order.

## Progress model (local-first)

Stored in `localStorage` under `btlw-practice-v1`
(`src/lib/practice/progress-store.ts`). No backend, no account.

Per item: `attempts`, `cleanStreak`, `best` (minimum measured cent error
when the input supplies one), `mastery`, `reviewStep`, `nextReviewAt`,
and a bounded `history` of recent attempts.

Mastery ladder:

- **new → learning** after the first attempt.
- **mastered** after 3 consecutive clean attempts (score ≥ 0.9).
- **solid** after reaching the top of the review ladder with a 6-streak.
- A missed review (unclean attempt while due) drops the item back to
  learning and resets its review step.

Spaced review: `REVIEW_LADDER_DAYS = [1, 3, 7, 14]`. `isReviewDue` decides
when an item comes back; `nextAction(state)` picks what to practice next
(review-due items first, then weak spots, then curriculum order).

Sessions: `endSession()` closes the current practice session when the
learner leaves the practice room; the Progress page shows totals,
milestones, and per-section readiness.

## Feedback loops — measured first, self-report second

1. **Measured (microphone):** `pitchy` (MPM) detection → onset-gated note
   events → `evaluateNote()` compares TARGET vs DETECTED vs CONFIDENCE and
   returns a settled verdict (`correct` / `incorrect`) or an honest
   non-verdict (`too-quiet` / `uncertain`). Only settled verdicts are
   written to progress. Used by `/guitar/note-practice` (guitar, with
   string/fret identification from `src/lib/music/fretboard.ts`) and by
   `SingCheck` on `/practice` (singing, judged against the melody note
   active in the timeline at detection time).
2. **Measured (timed):** the strumming trainer measures offset against the
   Web Audio metronome clock; the tuner measures cents against open-string
   targets.
3. **Self-report:** “Nailed / Mostly / Again” on `/practice` — explicitly
   labelled as the learner’s honest rating; it feeds the same mastery
   ladder, so a self-rated clean sings still requires 3 in a row.

The layering rule (from the tech doc) applies to every loop: the UI may
only display what the detector actually measured, with confidence shown
alongside.

## Timeline contract

`buildSectionTiming(section)` (`src/lib/music/timing.ts`) merges the song
data with the generated `SECTION_TIMINGS` into `TimedLine` /
`TimedSyllable` objects with absolute section-relative times. It powers:

- line/syllable highlighting in the player (rAF loop),
- phrase (couplet) looping and `seekToLine`,
- the pitch-contour visualizer,
- SingCheck target selection,
- “Why this line works” theory statements (`src/lib/music/theory.ts`).

Timings are generated from the guide-vocal audio
(`scripts/build-timings.mjs`), and `tests/timeline.test.ts` asserts the
invariants the UI depends on (ordered, non-overlapping, fully covered).

## Theories grounded in data

`src/lib/music/theory.ts` computes (never asserts) D-minor scale degrees,
line pitch spans, and out-of-scale notes; `describeLine()` produces the
“Why this line works” copy. The `/your-song` page renders the song’s
structure (sections, bar counts, degree-labeled progressions) as a
template for a new song, with notes kept in local storage only.
