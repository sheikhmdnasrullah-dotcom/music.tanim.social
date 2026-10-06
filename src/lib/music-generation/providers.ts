import type {
  CompositionPlan,
  GenerationCapabilities,
  GenerationRequest,
  GeneratedAssets,
  MusicGenerationProvider,
} from './types';

abstract class RemoteModelProvider implements MusicGenerationProvider {
  abstract readonly id: MusicGenerationProvider['id'];
  abstract readonly requires: string[];

  async capabilities(): Promise<GenerationCapabilities> {
    return {
      provider: this.id,
      available: false,
      reason:
        'No verified model service is configured. Canonical playback remains available; generation is not simulated.',
      requires: this.requires,
    };
  }

  async generateComposition(_request: GenerationRequest): Promise<CompositionPlan> {
    void _request;
    throw new Error(`${this.id} is unavailable: configure its verified model service first.`);
  }

  async generateArrangement(_request: GenerationRequest): Promise<GeneratedAssets> {
    void _request;
    throw new Error(`${this.id} is unavailable: configure its verified model service first.`);
  }

  async generateGuideVocal(_request: GenerationRequest): Promise<GeneratedAssets> {
    void _request;
    throw new Error(`${this.id} is unavailable: configure its verified model service first.`);
  }
}

export class YuE2Provider extends RemoteModelProvider {
  readonly id = 'yue2' as const;
  readonly requires = ['Linux', 'Python 3.12', 'NVIDIA GPU', '24 GB VRAM', 'BF16 support'];
}

export class AceStepProvider extends RemoteModelProvider {
  readonly id = 'ace-step-1.5' as const;
  readonly requires = ['A configured ACE-Step 1.5 model service', 'Verified model-weight license'];
}

export class DiffSingerProvider extends RemoteModelProvider {
  readonly id = 'diffsinger' as const;
  readonly requires = [
    'A configured DiffSinger-compatible singer model',
    'Lyrics-to-phoneme mapping',
    'MIDI or exact pitch curve',
  ];
}

export const MUSIC_GENERATION_PROVIDERS = [
  new YuE2Provider(),
  new AceStepProvider(),
  new DiffSingerProvider(),
] satisfies MusicGenerationProvider[];
