# Music generation comparison

## Status

No model was falsely installed or benchmarked on the development machine. The app now exposes provider adapters and `/api/music-generation/status`, but each adapter reports unavailable until a real model service is configured.

This is intentional: YuE2 currently expects a Linux/NVIDIA environment with substantial VRAM, and generated audio must not be presented as tested when it was not produced and listened to.

## Evaluation protocol

When a suitable model server is available, generate the same short, non-canonical test section with YuE2 and ACE-Step 1.5. Keep outputs under separate versioned generation directories and score:

- melody quality and pitch stability
- vocal quality and lyric adherence
- accompaniment, bass, drums, guitar/piano, and transitions
- dynamics, emotional expression, naturalness, and contemporary production
- inspectability of the symbolic score

Canonical playback must continue using the locked project stems until a generated candidate passes human listening review and is explicitly selected as an alternative version.
