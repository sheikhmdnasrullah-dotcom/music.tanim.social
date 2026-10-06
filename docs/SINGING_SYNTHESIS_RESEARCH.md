# Singing Voice Synthesis & AI Music Generation Research Report

**Project:** *Before I Learned the Words*  
**Scope:** Evaluation of Open-Source Singing Voice Synthesis (SVS), Voice Conversion (SVC), and Full-Song Generation Models  
**Date:** October 6, 2026  

---

## 1. Executive Summary & Model Comparison Matrix

| Technology | Primary Capability | Exact Pitch & Timing Control | Lyric / Phoneme Fidelity | Hardware Requirements | License (Code / Weights) | Feasibility for Teaching Locked Song |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenVPI DiffSinger** | Singing Voice Synthesis (SVS) | **Exact (Score/MIDI-driven)** | **High (Phoneme dictionary)** | CPU / Apple Silicon / CUDA (4GB+) | Apache 2.0 / Model-dependent | **Highest (Primary choice for exact melody teaching)** |
| **Seed-VC** | Zero-shot Voice Conversion (SVC) | **Preserves input pitch** | **Preserves input timing** | CUDA / MPS (6GB+) | Apache 2.0 / Open Weights | **Excellent (For user voice personalization)** |
| **OpenVoice (v2)** | Flexible Voice Cloning / Style | Speech-focused (Limited pitch) | High for speech | CPU / CUDA (4GB) | MIT / Non-commercial models | Moderate for speech, inadequate for singing |
| **YuE / YuE2** | Full-Song Foundation Model | Generative (Probabilistic) | High (Contextual) | 24GB VRAM NVIDIA GPU (Linux) | Apache 2.0 / CC BY-NC 4.0 | Experimental (Full generative demo, cannot guarantee locked melody) |

---

## 2. In-Depth Evaluation of Candidate Systems

### A. OpenVPI DiffSinger (Controllable Acoustic Modeling)
- **Repository:** `https://github.com/openvpi/DiffSinger`
- **Core Architecture:** Diffusion-based acoustic model driven by symbolic music score (MIDI notes, pitch curves F0, duration per phoneme, breathiness/energy curves) + HiFi-GAN / NSF-HiFiGAN neural vocoder.
- **Why it fits our requirements:** Unlike speech TTS, DiffSinger was explicitly designed for singing. It respects exact musical notation and does not alter the underlying song structure.
- **Licensing:** The codebase is Apache 2.0. Pretrained English acoustic models (e.g. OpenVPI English models) allow research and hobby usage.

### B. Seed-VC (Zero-Shot Singing Voice Conversion)
- **Repository:** `https://github.com/Plachtaa/seed-vc`
- **Core Architecture:** DiT (Diffusion Transformer) based zero-shot voice conversion with in-context learning.
- **Singing Support:** Seed-VC explicitly supports zero-shot singing voice conversion from a 5–30 second reference sample (`My Actual Voice For Reference.m4a`). It takes the synthesized guide vocal and morphs the timbre into the user's voice while strictly locking the melody pitch and timing.
- **Licensing:** Apache 2.0.

### C. YuE / YuE2 (Full Song Generation System)
- **Repository:** `https://github.com/himomohi/yue`
- **Capabilities:** End-to-end song generation from lyrics and genre prompts with full instrumental backing.
- **Hardware & Environment Constraint:** Requires Linux, Python 3.12, and 24GB VRAM NVIDIA GPU (e.g., RTX 4090 / A100).
- **Licensing Note:** Code is Apache 2.0, but weights are distributed under CC BY-NC 4.0 (Non-Commercial).
- **Role in Application:** YuE/YuE2 is an optional creative arrangement generator. It should never overwrite the locked canonical song.

---

## 3. Modular System Architecture & Provider Interfaces

To ensure long-term stability and model-agnostic operation, the application implements a clean provider layer:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Learning Studio                  │
│   (Player, Multi-Stem Faders, Syllable Sync, Pitch Tracker) │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌───────────────────────┐       ┌───────────────────────┐
    │     AudioProvider     │       │    SingingProvider    │
    │  (Web Audio Multi-    │       │ (DiffSinger / DSP /   │
    │   Stem Synchronizer)  │       │  Seed-VC Adapter)     │
    └───────────────────────┘       └───────────────────────┘
```

### TypeScript / Python Provider Interface Specifications

```typescript
export interface ISingingProvider {
  id: string;
  name: string;
  synthesizeSection(sectionId: string, options: SynthesisOptions): Promise<AudioBuffer>;
  applyVoiceConversion(sourceWav: Blob, referenceAudio: Blob): Promise<Blob>;
}

export interface IAudioProvider {
  loadStems(sectionId: string): Promise<StemCollection>;
  setVolume(stem: 'vocal' | 'instrumental' | 'melody' | 'user' | 'metronome', vol: number): void;
  setSpeed(speedMultiplier: number): void; // Pitch-preserved stretching
  setLoop(startTime: number, endTime: number, count: number): void;
}
```
