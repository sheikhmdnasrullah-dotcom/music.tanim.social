import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC_ROOT = path.resolve(import.meta.dirname, '../../src');
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC_ROOT, specifier.slice(2));
    for (const ext of EXTENSIONS) {
      try {
        return await nextResolve(pathToFileURL(base + ext).href, context);
      } catch {
        // keep trying the next candidate extension
      }
    }
  }
  return nextResolve(specifier, context);
}
