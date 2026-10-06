# Guitar Technology Comparison Report

## Executive Summary

After researching the open-source guitar technology ecosystem, **alphaTab** emerges as the unequivocal best foundation for guitar notation, tablature, and music data modeling. **Tone.js** is the best audio engine. **pitchy** (already in project) handles monophonic pitch detection well.

---

## Technology Comparison Matrix

| Project | Guitar Rendering | Tabs | Chords | Tuning | MIDI | Audio | Learning | Pitch Detection | License | Maintenance | Integration |
|---------|------------------|------|--------|--------|------|-------|----------|-----------------|---------|-------------|-------------|
| **alphaTab** | ✅ Excellent (SVG/Canvas) | ✅ Full GP3-7, MusicXML | ✅ Full chord diagrams | ✅ Any tuning | ✅ Import/Export | ✅ alphaSynth (SoundFont) | ❌ Not a learning app | ❌ No | MPL-2.0 | ✅ Active (2,684 commits, 1.9k★) | ✅ npm @coderline/alphatab |
| **GuitarPicker** | ✅ Custom note highway | ✅ Custom format | ✅ Chord library | ✅ Multiple | ❌ No | ✅ Web Audio synth | ✅ Full learning app | ✅ Autocorrelation (monophonic) | MIT | ⚠️ New (28 commits, 1★) | ⚠️ No npm package |
| **ChordRain** | ✅ Falling-note (Canvas) | ✅ Via alphaTab | ⚠️ Basic | ✅ Via alphaTab | ✅ Import | ✅ Tone.js | ✅ Guitar Hero style | ❌ No | MIT | ⚠️ New (12 commits, 0★) | ✅ Next.js + alphaTab example |
| **FretFlow** | ✅ Fretboard (React) | ❌ No | ✅ Chord overlay | ✅ Multiple | ❌ No | ✅ Tone.js | ✅ Theory/practice | ❌ No | **AGPL-3.0** ⚠️ | ✅ Active (617 commits) | ✅ React + Tonal.js |
| **Tablatures** | ✅ Via alphaTab | ✅ Via alphaTab | ⚠️ Basic | ✅ Via alphaTab | ❌ No | ✅ Via alphaTab | ✅ Player features | ❌ No | MPL-2.0 | ✅ Active (247 commits, 50★) | ✅ Svelte + alphaTab example |
| **guitarpro (Rust)** | ❌ No | ✅ Parse GP3-7, MSCZ | ✅ Model | ✅ Model | ✅ Export | ❌ No | ❌ No | ❌ No | MIT | ✅ Active (323 commits, 48★) | ⚠️ WASM needed for browser |
| **Tone.js** | ❌ No | ❌ No | ✅ Chord synth | ❌ No | ✅ Import via @tonejs/midi | ✅ **Best Web Audio** | ❌ No | ❌ No | MIT | ✅ Very active (5,551 commits, 14.8k★) | ✅ npm tone |
| **pitchy** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ✅ YIN (monophonic) | MIT | ⚠️ Low activity | ✅ Already in project |

---

## Recommendations

### 🥇 BEST FOUNDATION: **alphaTab**
- **Why**: Only library with complete Guitar Pro 3-7 + MusicXML support, proper tablature rendering, chord diagrams, fingering, all guitar techniques, and built-in playback
- **License**: MPL-2.0 (file-level copyleft, safe for application integration)
- **Integration**: npm package `@coderline/alphatab` with TypeScript definitions
- **Covers**: Rendering, parsing, data model, playback, tunings, techniques

### 🥈 BEST SECONDARY LIBRARY: **Tonal.js** (used by FretFlow)
- **Why**: Pure music theory library (scales, chords, intervals, note relationships) - no rendering
- **License**: MIT
- **Integration**: npm `tonal`
- **Covers**: Scale/chord theory, note positions, transposition, interval calculations

### 🥇 BEST AUDIO ENGINE: **Tone.js**
- **Why**: Most mature Web Audio framework, excellent scheduling, sampling, synthesis, effects
- **License**: MIT
- **Integration**: npm `tone`
- **Use for**: Backing tracks, metronome, chord playback, guitar synthesis via sampler

### 🥇 BEST PITCH ENGINE: **pitchy** (already integrated)
- **Why**: YIN algorithm, works well for monophonic input (single notes, vocals)
- **License**: MIT
- **Already in**: `package.json` as `pitchy@^4.1.0`
- **Limitation**: Monophonic only - cannot detect chords from microphone

### 🥇 BEST IMPORT FORMAT: **Guitar Pro (.gp, .gp5, .gpx, .gp3, .gp4) + MusicXML**
- **Why**: alphaTab natively parses both; Guitar Pro is the de facto standard for guitar tabs
- **Backend option**: `guitarpro` Rust library via WASM for server-side parsing/validation

### 🥇 BEST LEARNING COMPONENTS: **Custom (build on alphaTab + Tone.js)**
- **Why**: No existing learning component library matches our requirements (clean design, vocal-guitar connection, progressive curriculum)
- **Reference architectures**: GuitarPicker (note highway, local-first), ChordRain (falling notes), FretFlow (CAGED/3NPS, voice leading)
- **License risk**: FretFlow is AGPL-3.0 (avoid copying code directly)

---

## Architecture Decision

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  Song Model → Guitar Adapter → Learning Components → UI    │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   alphaTab    │ │    Tone.js    │ │    pitchy     │
│  (Notation,   │ │   (Audio,     │ │  (Pitch       │
│   TAB, GP,    │ │   Synthesis,  │ │   Detection)  │
│   MusicXML)   │ │   Scheduling) │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
```

### Adapter Pattern (Critical)
Our application defines its own `GuitarEngine` interface. The alphaTab implementation is one adapter. This keeps us independent of alphaTab's API.

---

## License Audit

| Package | License | Risk | Verdict |
|---------|---------|------|---------|
| @coderline/alphatab | MPL-2.0 | Low (file-level copyleft only) | ✅ Use |
| tone | MIT | None | ✅ Use |
| pitchy | MIT | None | ✅ Use (already in) |
| tonal | MIT | None | ✅ Use |
| FretFlow code | AGPL-3.0 | **High** (viral copyleft) | ❌ Do not copy |
| GuitarPicker code | MIT | None | ✅ Reference only |
| ChordRain code | MIT | None | ✅ Reference only |
| guitarpro (Rust) | MIT | None | ✅ Use via WASM if needed |

---

## Integration Plan

1. **Install dependencies**: `@coderline/alphatab`, `tone`, `tonal`
2. **Create `GuitarEngine` interface** in `src/lib/guitar/engine.ts`
3. **Implement `AlphaTabEngine`** adapter in `src/lib/guitar/alphatab-engine.ts`
4. **Create guitar data types** in `src/types/guitar.ts` (chord, fingering, tuning, tab)
5. **Build learning components**: `ChordLesson`, `TabLesson`, `ScaleLesson`
6. **Connect to existing song data**: Map song chords → guitar chords with capo
7. **Demo**: Show chord diagram + tab + playback for current song section