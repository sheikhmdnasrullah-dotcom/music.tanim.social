import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD_TUNING, DROP_D_TUNING } from '@/types/guitar';
import { noteToFrequency } from '@/lib/music/notes';
import {
  identifyFretPositions,
  openMidiForString,
  positionLabel,
  stringFromNotesIndex,
  notesIndexFromString,
} from '@/lib/music/fretboard';

describe('tuning index <-> string numbering', () => {
  test('standard tuning maps string 6 to the low E (MIDI 40)', () => {
    assert.equal(openMidiForString(STANDARD_TUNING, 6), 40);
    assert.equal(openMidiForString(STANDARD_TUNING, 1), 64);
    assert.equal(openMidiForString(STANDARD_TUNING, 5), 45);
    assert.equal(openMidiForString(STANDARD_TUNING, 4), 50);
    assert.equal(openMidiForString(STANDARD_TUNING, 3), 55);
    assert.equal(openMidiForString(STANDARD_TUNING, 2), 59);
  });

  test('string <-> index conversion round-trips', () => {
    for (const string of [1, 2, 3, 4, 5, 6] as const) {
      assert.equal(stringFromNotesIndex(notesIndexFromString(string)), string);
    }
    assert.equal(stringFromNotesIndex(0), 6);
    assert.equal(notesIndexFromString(6), 0);
  });

  test('drop D only lowers string 6', () => {
    assert.equal(openMidiForString(DROP_D_TUNING, 6), 38);
    assert.equal(openMidiForString(DROP_D_TUNING, 5), 45);
  });
});

describe('open string identification', () => {
  test('open low E resolves to string 6 fret 0 (regression: Hz was used as MIDI)', () => {
    const openE = noteToFrequency(40);
    const result = identifyFretPositions({ frequency: openE, clarity: 0.95 });

    assert.equal(result.noteMidi, 40);
    assert.equal(result.noteName, 'E2');
    assert.equal(result.best?.string, 6);
    assert.equal(result.best?.fret, 0);
    assert.ok(result.stringConfidence > 0.4, `expected a confident leader, got ${result.stringConfidence}`);
  });

  test('open A resolves to string 5 fret 0 and reports the real alternatives', () => {
    const openA = noteToFrequency(45);
    const result = identifyFretPositions({ frequency: openA, clarity: 0.95 });

    assert.equal(result.noteName, 'A2');
    assert.equal(result.best?.string, 5);
    assert.equal(result.best?.fret, 0);

    const asStrings = result.positions.map((position) => position.string);
    assert.deepEqual(asStrings, [5, 6], 'A2 is reachable from 5th open and 6th string 5th fret');
    assert.ok(
      !asStrings.includes(4),
      '4th string starts on D3, so it cannot reach A2 at any non-negative fret',
    );
    assert.ok(result.ambiguous, 'pitch alone cannot pick a unique string for A2');
    assert.match(result.explanation, /Possible positions/);
    assert.match(result.explanation, /Most likely: 5th string open/);
  });

  test('no position can play a note above the neck', () => {
    const result = identifyFretPositions({ frequency: noteToFrequency(100), clarity: 0.9 });
    assert.equal(result.positions.length, 0);
    assert.equal(result.best, null);
    assert.equal(result.string, null);
    assert.equal(result.stringConfidence, 0);
    assert.match(result.explanation, /outside the playable range/);
  });

  test('every reported position really produces the detected pitch', () => {
    const frequency = noteToFrequency(52); // G#3
    const result = identifyFretPositions({ frequency, clarity: 0.9 });
    assert.ok(result.positions.length > 0);
    for (const position of result.positions) {
      assert.equal(position.openMidi + position.fret, result.noteMidi);
    }
  });
});

describe('lesson context collapses the ambiguity', () => {
  test('a target string makes string identification decisive', () => {
    const openA = noteToFrequency(45);
    const withoutContext = identifyFretPositions({ frequency: openA, clarity: 0.95 });
    const withContext = identifyFretPositions({
      frequency: openA,
      clarity: 0.95,
      target: { string: 5, fret: 0 },
    });

    assert.ok(
      withContext.stringConfidence > 0.9,
      `expected >0.9 with lesson context, got ${withContext.stringConfidence}`,
    );
    assert.ok(withContext.stringConfidence > withoutContext.stringConfidence);
    assert.equal(withContext.ambiguous, false);
    assert.equal(withContext.best?.string, 5);
    assert.equal(withContext.best?.fret, 0);
    assert.match(withContext.explanation, /Lesson target: 5th string open/);
  });

  test('a target string suppresses, but never deletes, the alternatives', () => {
    const result = identifyFretPositions({
      frequency: noteToFrequency(45),
      clarity: 0.95,
      target: { string: 5, fret: 0 },
    });
    assert.ok(result.positions.length > 1, 'physical alternatives still exist and stay visible');
    assert.equal(result.positions[0].string, 5);
  });

  test('temporal context nudges toward the string just played', () => {
    const frequency = noteToFrequency(50);
    const cold = identifyFretPositions({ frequency, clarity: 0.9 });
    const warm = identifyFretPositions({ frequency, clarity: 0.9, previous: { string: 4, fret: 0 } });

    const coldBest = cold.positions.find((position) => position.string === 4);
    const warmBest = warm.positions.find((position) => position.string === 4);
    assert.ok(coldBest && warmBest);
    assert.ok(warmBest.posterior > coldBest.posterior);
  });
});

describe('posteriors are honest', () => {
  test('ranked posteriors sum to 1', () => {
    const result = identifyFretPositions({ frequency: noteToFrequency(45), clarity: 0.9 });
    const sum = result.positions.reduce((total, position) => total + position.posterior, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `posterior mass was ${sum}`);
  });

  test('positions are ranked best-first', () => {
    const result = identifyFretPositions({ frequency: noteToFrequency(45), clarity: 0.9 });
    for (let i = 1; i < result.positions.length; i++) {
      assert.ok(result.positions[i - 1].posterior >= result.positions[i].posterior);
    }
  });

  test('pitch confidence is carried through untouched', () => {
    const result = identifyFretPositions({ frequency: noteToFrequency(45), clarity: 0.42 });
    assert.equal(result.pitchConfidence, 0.42);
  });
});

describe('position labels', () => {
  test('renders the spec format', () => {
    assert.equal(positionLabel({ string: 5, fret: 0 }), '5th string open');
    assert.equal(positionLabel({ string: 4, fret: 7 }), '4th string 7th fret');
    assert.equal(positionLabel({ string: 6, fret: 5 }), '6th string 5th fret');
    assert.equal(positionLabel({ string: 1, fret: 12 }), '1st string 12th fret');
    assert.equal(positionLabel({ string: 2, fret: 1 }), '2nd string 1st fret');
    assert.equal(positionLabel({ string: 3, fret: 2 }), '3rd string 2nd fret');
  });
});
