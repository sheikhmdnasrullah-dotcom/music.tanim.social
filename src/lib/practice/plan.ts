// The curriculum: one ordered path through the song, guitar and voice
// interleaved, so every practice session has a clear next step.
import { SONG_CHORD_ORDER, TRANSITIONS } from '@/data/song-guitar';
import { SONG } from '@/data/song';
import type { ProgressState } from '@/lib/practice/progress-store';
import { isReviewDue } from '@/lib/practice/progress-store';

export interface CurriculumItem {
  id: string;
  kind: 'chord' | 'transition' | 'strum' | 'line';
  label: string;
  detail: string;
  href: string;
  minutes: number;
}

function lineLabel(sectionId: string, index: number): { label: string; detail: string } {
  const section = SONG.sections.find((s) => s.id === sectionId);
  const line = section?.lines[index];
  if (!line) return { label: 'Line', detail: '' };
  const short = line.text.length > 34 ? line.text.slice(0, 32).trimEnd() + '…' : line.text;
  return {
    label: `Sing: “${short}”`,
    detail: `${section?.name ?? ''} — line ${index + 1}`,
  };
}

function lineItem(sectionId: string, index: number, minutes = 8): CurriculumItem {
  const { label, detail } = lineLabel(sectionId, index);
  return {
    id: `line:${sectionId}:${index}`,
    kind: 'line',
    label,
    detail,
    href: `/practice?section=${sectionId}&line=${index}`,
    minutes,
  };
}

function chordItem(chord: string): CurriculumItem {
  return {
    id: `chord:${chord}`,
    kind: 'chord',
    label: `Learn chord: ${prettyChord(chord)}`,
    detail: 'See it, hear it, place it, strum it',
    href: `/guitar/chords?chord=${chord}`,
    minutes: 6,
  };
}

function prettyChord(id: string): string {
  if (id === 'cadd9') return 'Cadd9';
  if (id === 'fmaj7') return 'Fmaj7';
  return id.toUpperCase();
}

function transitionItem(id: string): CurriculumItem {
  const t = TRANSITIONS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown transition ${id}`);
  return {
    id: `transition:${id}`,
    kind: 'transition',
    label: `Switch: ${prettyChord(t.from)} → ${prettyChord(t.to)}`,
    detail: t.section === 'verse' ? 'Verse chain' : t.section === 'chorus' ? 'Chorus' : t.section,
    href: `/guitar/transitions?a=${t.from}&b=${t.to}`,
    minutes: 5,
  };
}

function strumItem(id: 'stage-1' | 'stage-2' | 'stage-3'): CurriculumItem {
  return {
    id: `strum:${id}`,
    kind: 'strum',
    label: id === 'stage-1' ? 'Strum: one strum on beat one' : id === 'stage-2' ? 'Strum: downs on every count' : 'Strum: follow the guide',
    detail: 'With the metronome',
    href: `/guitar/strumming?stage=${id}`,
    minutes: 5,
  };
}

/** The full ordered path. Index 0 is the very first thing a beginner does. */
export const CURRICULUM: CurriculumItem[] = [
  chordItem('cadd9'),
  lineItem('verse-1', 0),
  chordItem('em7'),
  transitionItem('cadd9-to-em7'),
  chordItem('am7'),
  lineItem('verse-1', 1),
  transitionItem('em7-to-am7'),
  chordItem('fmaj7'),
  transitionItem('am7-to-fmaj7'),
  lineItem('verse-1', 2),
  transitionItem('fmaj7-to-cadd9'),
  strumItem('stage-1'),
  lineItem('verse-1', 3),
  strumItem('stage-2'),
  chordItem('g'),
  chordItem('dm7'),
  transitionItem('cadd9-to-g'),
  transitionItem('g-to-em7'),
  transitionItem('em7-to-cadd9'),
  transitionItem('cadd9-to-dm7'),
  transitionItem('dm7-to-g'),
  lineItem('pre-chorus-1', 0),
  lineItem('pre-chorus-1', 1),
  lineItem('pre-chorus-1', 2),
  lineItem('pre-chorus-1', 3),
  chordItem('f'),
  transitionItem('cadd9-to-f'),
  transitionItem('f-to-am7'),
  transitionItem('am7-to-g'),
  transitionItem('g-to-cadd9'),
  lineItem('chorus-1', 0),
  lineItem('chorus-1', 1),
  lineItem('chorus-1', 2),
  lineItem('chorus-1', 3),
  chordItem('gb'),
  chordItem('gsus4'),
  transitionItem('cadd9-to-gb'),
  transitionItem('gb-to-am7'),
  transitionItem('am7-to-f'),
  transitionItem('f-to-gsus4'),
  transitionItem('gsus4-to-g'),
  strumItem('stage-3'),
  chordItem('c'),
  chordItem('am'),
  transitionItem('am-to-f'),
  transitionItem('f-to-c'),
  transitionItem('c-to-g'),
  transitionItem('g-to-am'),
  lineItem('bridge', 0),
  lineItem('bridge', 1),
  lineItem('bridge', 2),
  lineItem('bridge', 3),
  chordItem('em'),
  transitionItem('em-to-c'),
  transitionItem('c-to-fmaj7'),
  lineItem('outro', 0),
  lineItem('outro', 1),
];

export const CURRICULUM_IDS: string[] = CURRICULUM.map((c) => c.id);

export const ITEM_MAP: Record<string, CurriculumItem> = Object.fromEntries(
  CURRICULUM.map((c) => [c.id, c]),
);

/**
 * Build today's plan: due reviews first, then the next not-mastered
 * curriculum items until the time budget is used up.
 */
export function buildPlan(state: ProgressState, minutes: number): CurriculumItem[] {
  const now = Date.now();
  const plan: CurriculumItem[] = [];
  let budget = minutes;

  // 1) Reviews that are due (mastered items that need keeping warm).
  for (const item of CURRICULUM) {
    if (budget <= 0) break;
    if (isReviewDue(state, item.id, now)) {
      plan.push({ ...item, detail: `Review — ${item.detail}`, minutes: Math.min(3, item.minutes) });
      budget -= Math.min(3, item.minutes);
    }
  }

  // 2) The next things to learn, in curriculum order.
  for (const item of CURRICULUM) {
    if (budget <= 0) break;
    if (plan.some((p) => p.id === item.id)) continue;
    const rec = state.items[item.id];
    if (rec && (rec.mastery === 'mastered' || rec.mastery === 'solid')) continue;
    plan.push(item);
    budget -= item.minutes;
  }

  // 3) If everything is mastered, keep the plan honest: spaced reviews only.
  if (plan.length === 0) {
    for (const item of CURRICULUM.slice(0, 4)) {
      plan.push({ ...item, detail: 'Keep it warm — review', minutes: 3 });
    }
  }

  return plan;
}

/** The very next thing to do — the single primary action on the home page. */
export function nextAction(state: ProgressState): CurriculumItem {
  const due = CURRICULUM.find((item) => isReviewDue(state, item.id));
  if (due) return { ...due, detail: `Review — ${due.detail}` };
  return (
    CURRICULUM.find((item) => {
      const rec = state.items[item.id];
      return !rec || (rec.mastery !== 'mastered' && rec.mastery !== 'solid');
    }) ?? CURRICULUM[0]
  );
}

/**
 * Honest weak spots: items the learner has touched but is not solid on,
 * ordered by most recent struggle.
 */
export function weakSpots(state: ProgressState, max = 3): CurriculumItem[] {
  const out: { item: CurriculumItem; rec: NonNullable<ProgressState['items'][string]> }[] = [];
  for (const item of CURRICULUM) {
    const rec = state.items[item.id];
    if (!rec || rec.attempts === 0) continue;
    if (rec.mastery === 'mastered' || rec.mastery === 'solid') continue;
    const lastMissed = [...rec.history].reverse().find((h) => h.score < 0.9);
    out.push({ item, rec });
    void lastMissed;
  }
  out.sort((a, b) => (b.rec.lastPracticedAt ?? 0) - (a.rec.lastPracticedAt ?? 0));
  return out.slice(0, max).map((o) => o.item);
}

export interface Milestone {
  id: string;
  label: string;
  reached: boolean;
  when: number | null;
}

/** Adult milestones — quiet marks, no confetti. */
export function getMilestones(state: ProgressState): Milestone[] {
  const chordIds = SONG_CHORD_ORDER.map((c) => `chord:${c}`);
  const item = (id: string) => state.items[id];
  const lastTs = (...ids: string[]): number | null => {
    let best: number | null = null;
    for (const id of ids) {
      const ts = item(id)?.lastPracticedAt ?? null;
      if (ts !== null && (best === null || ts > best)) best = ts;
    }
    return best;
  };
  const verseChords = chordIds.slice(0, 4);
  const allChordsDone = verseChords.every((id) => {
    const r = item(id);
    return r && (r.mastery === 'mastered' || r.mastery === 'solid');
  });
  const chordMastered = chordIds.find((id) => {
    const r = item(id);
    return r && (r.mastery === 'mastered' || r.mastery === 'solid');
  });
  const lineMastered = Object.keys(state.items).find(
    (id) =>
      state.items[id]?.kind === 'line' &&
      (state.items[id]?.mastery === 'mastered' || state.items[id]?.mastery === 'solid'),
  );
  const transMastered = Object.keys(state.items).find(
    (id) =>
      state.items[id]?.kind === 'transition' &&
      (state.items[id]?.mastery === 'mastered' || state.items[id]?.mastery === 'solid'),
  );

  return [
    { id: 'first-chord', label: 'First chord mastered', reached: !!chordMastered, when: chordMastered ? lastTs(chordMastered) : null },
    { id: 'first-switch', label: 'First clean chord switch', reached: !!transMastered, when: transMastered ? lastTs(transMastered) : null },
    { id: 'verse-chords', label: 'All verse chords solid', reached: allChordsDone, when: allChordsDone ? lastTs(...verseChords) : null },
    { id: 'first-line', label: 'First line sung 3 clean times', reached: !!lineMastered, when: lineMastered ? lastTs(lineMastered) : null },
    {
      id: 'ten-sessions',
      label: 'Ten practice sessions',
      reached: state.sessions.length >= 10,
      when: state.sessions.length >= 10 ? state.sessions[9]?.endedAt ?? null : null,
    },
  ];
}
