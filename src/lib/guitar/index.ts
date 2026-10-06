export { GuitarEngine, GuitarEngineFactory, GuitarEngineRegistry } from './engine';
export type { ChordDiagramOptions, FretboardOptions } from './engine';
export { AlphaTabEngine, AlphaTabEngineFactory } from './alphatab-engine';
export * from '@/types/guitar';

import { GuitarEngineRegistry } from './engine';
import { AlphaTabEngineFactory } from './alphatab-engine';

GuitarEngineRegistry.register('alphatab', new AlphaTabEngineFactory(), true);

export function createGuitarEngine(name?: string) {
  return GuitarEngineRegistry.create(name);
}