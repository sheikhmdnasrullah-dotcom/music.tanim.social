import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SONG } from '@/data/song';
import { buildSectionTiming } from '@/lib/music/timing';
import {
  chordDegree,
  chordRoot,
  describeLine,
  isInDmScale,
  lineNoteSpan,
} from '@/lib/music/theory';

describe('chord roots and degrees', () => {
  test('parses chord names into roots', () => {
    assert.equal(chordRoot('Cadd9'), 'C');
    assert.equal(chordRoot('Em7'), 'E');
    assert.equal(chordRoot('Fmaj7'), 'F');
    assert.equal(chordRoot('G'), 'G');
  });

  test('roots map to D minor degrees as used in the song', () => {
    assert.equal(chordDegree('Cadd9'), 'VII');
    assert.equal(chordDegree('Em7'), 'ii');
    assert.equal(chordDegree('Fmaj7'), 'III');
    assert.equal(chordDegree('G'), 'IV');
    assert.equal(chordDegree('Am7'), 'v');
    assert.equal(chordDegree('Dm7'), 'i');
  });

  test('unknown roots report no degree instead of guessing', () => {
    assert.equal(chordDegree('Bb'), null);
    assert.equal(chordDegree('Nonsense'), null);
  });
});

describe('D natural minor scale', () => {
  test('scale members and non-members', () => {
    assert.ok(isInDmScale(50), 'D3 is in the scale');
    assert.ok(isInDmScale(58), 'Bb3 is in the scale');
    assert.ok(isInDmScale(60), 'C4 is in the scale');
    assert.ok(!isInDmScale(59), 'B natural is the raised 7th, not in the natural scale');
    assert.ok(!isInDmScale(51), 'D#3 is not in the scale');
  });
});

describe('line theory', () => {
  const section = SONG.sections[0];
  const timing = buildSectionTiming(section);
  const line = timing.lines[0];

  test('span matches the actual melody data', () => {
    const span = lineNoteSpan(line);
    assert.ok(span, 'line has a span');
    const midis = line.timedSyllables.map((s) => s.note.midi);
    assert.equal(span!.lowMidi, Math.min(...midis));
    assert.equal(span!.highMidi, Math.max(...midis));
    assert.equal(span!.spanSemitones, span!.highMidi - span!.lowMidi);
  });

  test('describeLine returns verifiable statements', () => {
    const statements = describeLine(line, 'Cadd9');
    assert.ok(statements.length >= 3, 'at least span, scale, and chord statements');
    assert.match(statements[0], /span of \d+ semitone/);
    assert.match(statements[statements.length - 1], /Cadd9 — the VII chord/);
  });

  test('every verse-1 line reports its scale relationship', () => {
    for (const l of timing.lines) {
      const statements = describeLine(l);
      const scaleStatement = statements.find((s) =>
        /scale/i.test(s),
      );
      assert.ok(scaleStatement, `line "${l.text}" must state its scale relationship`);
    }
  });
});
