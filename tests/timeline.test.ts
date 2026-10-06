import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SONG } from '@/data/song';
import { SECTION_TIMINGS, SECTION_ORDER } from '@/data/timings';
import {
  buildSectionTiming,
  findLineAtTime,
  findLineIndex,
  findSyllableAtTime,
  findSyllableIndex,
  getPhraseBounds,
} from '@/lib/music/timing';

/**
 * These tests guard the contract the player depends on: every section must
 * produce a fully timed line/syllable timeline from the generated data.
 * If a section ever ships without timing data, the karaoke-style tracking
 * (line highlight, syllable pill, phrase loop) silently breaks — so the
 * assertions below are deliberately strict.
 */

describe('buildSectionTiming', () => {
  for (const section of SONG.sections) {
    test(`${section.id}: every line and syllable is timed`, () => {
      const timing = buildSectionTiming(section);
      assert.ok(timing.duration > 0, 'section duration must be positive');
      assert.equal(timing.lines.length, section.lines.length);

      let prevEnd = 0;
      for (const line of timing.lines) {
        assert.ok(line.absoluteStart >= 0, `line ${line.id} starts before 0`);
        assert.ok(line.absoluteStart >= prevEnd - 0.001, `line ${line.id} overlaps previous line`);
        assert.ok(line.activeEnd > line.absoluteStart, `line ${line.id} has no span`);
        assert.ok(line.duration > 0, `line ${line.id} duration must be positive`);
        prevEnd = line.absoluteStart;

        assert.ok(line.timedSyllables.length === line.syllables.length, 'syllable count preserved');
        for (const syl of line.timedSyllables) {
          assert.ok(syl.absoluteStart >= line.absoluteStart - 0.001, 'syllable starts before its line');
          assert.ok(syl.absoluteEnd > syl.absoluteStart, `syllable "${syl.text}" has no span`);
          assert.ok(syl.absoluteEnd <= line.activeEnd + 0.001, 'syllable ends after its line');
        }
      }

      // The final line owns the tail of the section (breath after last note).
      assert.equal(timing.lines[timing.lines.length - 1].activeEnd, timing.duration);
    });
  }

  test('song offsets are contiguous across sections', () => {
    for (let i = 1; i < SECTION_ORDER.length; i++) {
      const prev = SECTION_TIMINGS[SECTION_ORDER[i - 1]];
      const cur = SECTION_TIMINGS[SECTION_ORDER[i]];
      assert.ok(
        Math.abs(prev.songOffset + prev.duration - cur.songOffset) < 0.05,
        `${SECTION_ORDER[i - 1]} → ${SECTION_ORDER[i]} offsets must be contiguous`,
      );
    }
  });
});

describe('line and syllable lookup', () => {
  const section = SONG.sections[0];
  const timing = buildSectionTiming(section);

  test('time 0 resolves to the first line', () => {
    assert.equal(findLineIndex(timing, 0), 0);
    assert.equal(findLineAtTime(timing, 0)?.id, timing.lines[0].id);
  });

  test('each line is found at its own midpoint', () => {
    timing.lines.forEach((line, i) => {
      const mid = (line.absoluteStart + line.activeEnd) / 2;
      assert.equal(findLineIndex(timing, mid), i, `midpoint of line ${i}`);
    });
  });

  test('time past the end resolves to the last line', () => {
    assert.equal(findLineIndex(timing, timing.duration), timing.lines.length - 1);
    assert.equal(findLineIndex(timing, timing.duration + 5), timing.lines.length - 1);
  });

  test('syllable lookup tracks the last started syllable', () => {
    const line = timing.lines[0];
    const first = line.timedSyllables[0];
    const second = line.timedSyllables[1];

    assert.equal(findSyllableIndex(line, first.absoluteStart), 0);
    if (second) {
      assert.equal(findSyllableIndex(line, second.absoluteStart), 1);
      // Between two syllables, the earlier one stays active.
      const between = (first.absoluteEnd + second.absoluteStart) / 2;
      if (between >= first.absoluteStart && between < second.absoluteStart) {
        assert.equal(findSyllableIndex(line, between), 0);
      }
    }
    assert.equal(findSyllableAtTime(line, first.absoluteStart)?.text, first.text);
    assert.equal(findSyllableAtTime(line, line.absoluteStart - 1), null);
  });
});

describe('phrase bounds (couplet looping)', () => {
  const section = SONG.sections[0];
  const timing = buildSectionTiming(section);

  test('lines pair into couplets', () => {
    const a = getPhraseBounds(timing, 0);
    const b = getPhraseBounds(timing, 1);
    const c = getPhraseBounds(timing, 2);

    assert.equal(a.start, b.start, 'lines 1 and 2 share a phrase start');
    assert.equal(a.end, b.end, 'lines 1 and 2 share a phrase end');
    // The breath after line 2 belongs to the first phrase, so phrases are
    // exactly adjacent: the next couplet starts where the first one ends.
    assert.equal(c.start, a.end, 'phrases are adjacent, breath included');
    assert.ok(a.end > timing.lines[1].absoluteEnd, 'phrase end includes the breath');
    assert.ok(a.end <= timing.duration, 'phrase end stays inside the section');
  });

  test('a phrase contains its lines', () => {
    for (let i = 0; i < timing.lines.length; i++) {
      const bounds = getPhraseBounds(timing, i);
      const line = timing.lines[i];
      assert.ok(bounds.start <= line.absoluteStart + 0.001, `phrase ${i} starts before its line`);
      assert.ok(bounds.end >= line.absoluteEnd - 0.001, `phrase ${i} ends after its line`);
    }
  });
});
