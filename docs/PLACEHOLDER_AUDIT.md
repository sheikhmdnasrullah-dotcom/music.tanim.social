# Placeholder audit

The application must not present simulated music analysis as real playback or recording.

## Resolved

| Area | Previous risk | Current implementation |
| --- | --- | --- |
| Guide playback | Browser speech/TTS could sound like singing | Locked WAV guide-vocal stems from `public/audio/canonical/` |
| Accompaniment | Vocal-only playback | Synchronized guide, instrumental, melody, and user-voice stems |
| Recording | UI-only recording control | `MediaRecorder` captures a real microphone take and exposes a playable blob |
| Pitch feedback | Static/fake score risk | `pitchy` microphone analysis with detected frequency, note, cents, and confidence |
| Guitar tuner | Animated placeholder risk | Web Audio microphone input and pitch detection against standard tuning |
| Guitar diagrams | Decorative-only fretboard risk | Interactive chord and fretboard components with note calculations |

## Intentionally unavailable

| Feature | User-visible behavior |
| --- | --- |
| DiffSinger/ YuE generation | Not used in canonical playback. The locked song must not be rewritten by a generative model. |
| Commercial or unknown model weights | Not downloaded. No model is installed without a verified license and reproducible output. |

Run `npm run music:verify` before treating the canonical song package as ready. It checks every full-song and section stem for existence, PCM format, sample rate, channels, and playable duration.
