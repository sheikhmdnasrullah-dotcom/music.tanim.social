import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD_TUNING } from '@/types/guitar';
import { frequencyToNote, noteToFrequency } from '@/lib/music/notes';

test('alias loader resolves @/ specifiers', () => {
  assert.equal(STANDARD_TUNING.notes[0], 40);
});

test('frequencyToNote round-trips', () => {
  const a4 = frequencyToNote(440);
  assert.equal(a4?.name, 'A');
  assert.equal(noteToFrequency(a4!.midi), 440);
});
