import { canonicalComposition } from './canonical-composition';
import { MUSIC_GENERATION_PROVIDERS } from './providers';
import type { GenerationRequest, MusicGenerationProvider } from './types';

export class MusicGenerationService {
  constructor(
    private readonly providers: readonly MusicGenerationProvider[] = MUSIC_GENERATION_PROVIDERS,
  ) {}

  getCanonicalComposition() {
    return canonicalComposition();
  }

  async capabilities() {
    return Promise.all(this.providers.map((provider) => provider.capabilities()));
  }

  async generateComposition(providerId: string, request: GenerationRequest) {
    return this.provider(providerId).generateComposition(request);
  }

  async generateArrangement(providerId: string, request: GenerationRequest) {
    return this.provider(providerId).generateArrangement(request);
  }

  async generateGuideVocal(providerId: string, request: GenerationRequest) {
    return this.provider(providerId).generateGuideVocal(request);
  }

  private provider(providerId: string) {
    const provider = this.providers.find((candidate) => candidate.id === providerId);
    if (!provider) throw new Error(`Unknown music-generation provider: ${providerId}`);
    return provider;
  }
}
