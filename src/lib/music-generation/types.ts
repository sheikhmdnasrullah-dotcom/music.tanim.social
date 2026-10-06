import type { Song } from '@/types/song';

export type GenerationProviderId = 'yue2' | 'ace-step-1.5' | 'diffsinger';

export interface CompositionPlan {
  id: string;
  version: string;
  songId: Song['id'];
  bpm: number;
  key: string;
  timeSignature: string;
  sections: Array<{
    id: string;
    name: string;
    chordProgression: string[];
    melody: Array<{
      syllable: string;
      note: string;
      midi: number;
      startTime: number;
      duration: number;
    }>;
  }>;
  source: 'canonical' | 'generated';
  immutable: boolean;
}

export interface GenerationCapabilities {
  provider: GenerationProviderId;
  available: boolean;
  reason: string;
  requires: string[];
}

export interface GenerationRequest {
  song: Song;
  composition: CompositionPlan;
  outputVersion: string;
}

export interface GeneratedAssets {
  provider: GenerationProviderId;
  version: string;
  instrumental?: string;
  fullMix?: string;
  guideVocal?: string;
  melodyReference?: string;
  status: 'generated' | 'unavailable';
}

export interface MusicGenerationProvider {
  readonly id: GenerationProviderId;
  capabilities(): Promise<GenerationCapabilities>;
  generateComposition(request: GenerationRequest): Promise<CompositionPlan>;
  generateArrangement(request: GenerationRequest): Promise<GeneratedAssets>;
  generateGuideVocal(request: GenerationRequest): Promise<GeneratedAssets>;
}
