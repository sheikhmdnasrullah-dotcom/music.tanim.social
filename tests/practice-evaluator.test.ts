import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { noteToFrequency } from '@/lib/music/notes';
import { evaluateNote, evaluateTiming, type PracticeTarget } from '@/lib/practice/note-evaluator';

const A2: PracticeTarget = {
  noteName: 'A2',
  midi: 45,
  frequency: noteToFrequency(45),
  string: 5,
  fret: 0,
};

const heard = (frequency: number, overrides: Partial<{ clarity: number; rms: number }> = {}) => ({
  frequency,
  clarity: overrides.clarity ?? 0.95,
  rms: overrides.rms ?? 0.08,
});

describe('note evaluation', () => {
  test('accepts a pitch within tolerance as correct', () => {
    const result = evaluateNote(A2, heard(A2.frequency));
    assert.equal(result.verdict, 'correct');
    assert.equal(result.isCorrect, true);
    assert.ok(Math.abs(result.centsError ?? 999) < 1);
  });

  test('accepts a slightly sharp reading but reports the cent error', () => {
    const sharp = A2.frequency * Math.pow(2, 20 / 1200); // +20 cents
    const result = evaluateNote(A2, heard(sharp));
    assert.equal(result.verdict, 'correct');
    assert.ok((result.centsError ?? 0) > 15);
    assert.match(result.message, /sharp/);
  });

  test('rejects a whole tone away as incorrect', () => {
    const result = evaluateNote(A2, heard(noteToFrequency(47))); // B2
    assert.equal(result.verdict, 'incorrect');
    assert.equal(result.isCorrect, false);
    assert.match(result.message, /target A2/);
  });

  test('never passes on the expected note alone — a silent room is not a success', () => {
    const silent = { frequency: 0, clarity: 0, rms: 0.001 };
    const result = evaluateNote(A2, silent);
    assert.equal(result.verdict, 'too-quiet');
    assert.equal(result.isCorrect, false);
  });

  test('reports too-quiet when the signal is barely there', () => {
    const result = evaluateNote(A2, heard(0, { rms: 0.004 }));
    assert.equal(result.verdict, 'too-quiet');
    assert.match(result.message, /Too quiet/);
  });

  test('reports uncertain when the detector itself is not sure', () => {
    const result = evaluateNote(A2, heard(A2.frequency, { clarity: 0.4 }));
    assert.equal(result.verdict, 'uncertain');
    assert.equal(result.isCorrect, false);
    assert.match(result.message, /not clear enough/);
  });

  test('exposes TARGET / DETECTED / CONFIDENCE in the advanced detail', () => {
    const result = evaluateNote(A2, heard(A2.frequency));
    assert.match(result.detail, /^TARGET: A2 · string 5 fret 0 · \d+\.\d{1,2} Hz$/m);
    assert.match(result.detail, /^DETECTED: A2 · \d+\.\d Hz/m);
    assert.match(result.detail, /^CONFIDENCE: 0\.\d{2}$/m);
    assert.equal(result.confidence, 0.95);
  });

  test('works without lesson context (no string/fret available)', () => {
    const target: PracticeTarget = { noteName: 'A2', midi: 45, frequency: noteToFrequency(45) };
    const result = evaluateNote(target, heard(target.frequency));
    assert.equal(result.verdict, 'correct');
    assert.doesNotMatch(result.detail, /string/);
  });
});

describe('timing evaluation', () => {
  const target = { start: 2.5, duration: 0.5 };

  test('accepts an onset inside the tolerance window', () => {
    const result = evaluateTiming(target, 2.53);
    assert.equal(result.verdict, 'on-time');
    assert.ok((result.offsetMs ?? 0) > 0);
  });

  test('flags an early onset', () => {
    const result = evaluateTiming(target, 2.2);
    assert.equal(result.verdict, 'too-early');
    assert.match(result.message, /early/);
    assert.ok((result.offsetMs ?? 0) < 0);
  });

  test('flags a late onset', () => {
    const result = evaluateTiming(target, 2.9);
    assert.equal(result.verdict, 'too-late');
    assert.match(result.message, /late/);
    assert.ok((result.offsetMs ?? 0) > 0);
  });

  test('tolerance is configurable', () => {
    const strict = evaluateTiming(target, 2.55, { toleranceMs: 20 });
    assert.equal(strict.verdict, 'too-late');
    const loose = evaluateTiming(target, 2.55, { toleranceMs: 100 });
    assert.equal(loose.verdict, 'on-time');
  });
});
