# Open-Source Stack

This document records the open-source libraries used in this project, their purposes, and integration details.

## Audio Playback & Waveform

### wavesurfer.js
- **Repository**: https://github.com/katspaugh/wavesurfer.js
- **Version**: 8.x
- **License**: BSD-3-Clause
- **Purpose**: Audio waveform visualization, playback, seeking, and regions
- **Integration**: `src/components/music/AudioPlayer.tsx`, `src/hooks/use-song-player.ts`
- **Why selected**: Actively maintained, TypeScript API, React integration via `@wavesurfer/react`, supports Web Audio backend for accurate playback control, regions plugin for looping

### @wavesurfer/react
- **Repository**: https://github.com/katspaugh/wavesurfer.js
- **Version**: 1.x
- **License**: BSD-3-Clause
- **Purpose**: React wrapper for wavesurfer.js
- **Integration**: Used as peer dependency of wavesurfer.js

## Pitch Detection

### pitchy
- **Repository**: https://github.com/ianprime0509/pitchy
- **Version**: 4.1.0
- **License**: Zero Clause BSD
- **Purpose**: Real-time pitch detection using McLeod Pitch Method (MPM)
- **Integration**: `src/hooks/use-pitch-tracker.ts`
- **Why selected**: Lightweight, fast (McLeod Pitch Method is robust for monophonic pitch), works in browser and Node, simple API, 11k weekly downloads

## Audio Time-Stretching (Future)

### @soundtouchjs/audio-worklet
- **Repository**: https://github.com/cutterbl/SoundTouchJS
- **Version**: 2.x
- **License**: MIT
- **Purpose**: Pitch-preserving time-stretching via AudioWorklet
- **Integration**: Reserved for Phase 2 tempo control with pitch preservation
- **Why selected**: Modern AudioWorklet implementation (replaces deprecated ScriptProcessorNode), independent tempo and pitch control, good for vocal practice

## Music Notation (Future)

### alphaTab
- **Repository**: https://github.com/CoderLine/alphaTab
- **Version**: 1.8.x
- **License**: MPL-2.0
- **Purpose**: Guitar tablature, MusicXML, Guitar Pro file rendering with browser MIDI playback
- **Integration**: Reserved for Phase 4 (guitar tab display, MusicXML import)
- **Why selected**: Supports Guitar Pro 3-8, MusicXML, AlphaTex, built-in MIDI synthesizer, TypeScript, actively maintained (published 2 days ago)

### OpenSheetMusicDisplay (OSMD)
- **Repository**: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
- **Version**: 2.x
- **License**: BSD-3-Clause
- **Purpose**: MusicXML rendering in browser using VexFlow
- **Integration**: Reserved for Phase 4 (alternative MusicXML renderer)
- **Why selected**: TypeScript-based, actively maintained, supports guitar tabs from MusicXML

## UI & Design

### Tailwind CSS
- **Version**: 4.x
- **License**: MIT
- **Purpose**: Utility-first CSS framework
- **Integration**: `src/app/globals.css`, all components

### clsx
- **Version**: 2.x
- **License**: MIT
- **Purpose**: Conditional className utility
- **Integration**: `src/lib/utils.ts`

### tailwind-merge
- **Version**: 3.x
- **License**: MIT
- **Purpose**: Merge Tailwind CSS classes with conflict resolution
- **Integration**: `src/lib/utils.ts`

### lucide-react
- **Version**: 1.52.x
- **License**: ISC
- **Purpose**: Icon library
- **Integration**: Reserved for UI icons

## Singing Voice Synthesis (Future)

### DiffSinger (OpenVPI maintained)
- **Repository**: https://github.com/openvpi/DiffSinger
- **License**: Apache-2.0
- **Purpose**: Singing voice synthesis via shallow diffusion mechanism
- **Integration**: Reserved for Phase 6 (AI guide vocal generation)
- **Why selected**: Actively maintained fork, 44.1kHz output, production-compatible

### Seed-VC
- **Repository**: https://github.com/Plachtaa/seed-vc
- **License**: GPL-3.0
- **Purpose**: Zero-shot voice conversion and singing voice conversion
- **Integration**: Reserved for Phase 6 (user voice cloning)
- **Why selected**: Zero-shot capability, supports singing voice conversion, real-time capable

## Framework

### Next.js
- **Version**: 16.3.8
- **License**: MIT
- **Purpose**: React framework with SSR, routing, and optimization
- **Integration**: Project root

### React
- **Version**: 19.2.8
- **License**: MIT
- **Purpose**: UI library
- **Integration**: All components

### TypeScript
- **Version**: 5.x
- **License**: Apache-2.0
- **Purpose**: Type-safe JavaScript
- **Integration**: All source files

### Turbopack
- **Version**: Bundled with Next.js 16
- **License**: MIT
- **Purpose**: Fast development bundler
- **Integration**: Next.js config