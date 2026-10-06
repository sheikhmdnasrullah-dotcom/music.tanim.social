// Local, honest progress. Everything is stored on this device in
// localStorage — no accounts, no cloud, no pretending.
//
// Mastery rule (from the workbook's "3 in a row" method):
// three clean attempts in a row make an item solid. Clean means
// score >= 0.9, whether that score came from a measured value
// (transition time) or an honest self-report ("nailed it").

export type ItemKind = 'chord' | 'transition' | 'strum' | 'line';
export type Mastery = 'new' | 'learning' | 'mastered' | 'solid';

export interface Attempt {
  ts: number;
  /** 0..1 — 1 = clean. */
  score: number;
  /** Raw value when measured, e.g. transition time in seconds (lower = better). */
  value?: number;
  label?: string;
}

export interface ItemRecord {
  kind: ItemKind;
  attempts: number;
  cleanStreak: number;
  /** Best raw value (lower is better when value is a time). */
  best: number | null;
  lastPracticedAt: number | null;
  mastery: Mastery;
  reviewStep: number;
  nextReviewAt: number | null;
  history: Attempt[];
}

export interface SessionSummary {
  endedAt: number;
  minutes: number;
  lines: string[]; // human-readable results
}

export interface ProgressState {
  items: Record<string, ItemRecord>;
  sessions: SessionSummary[];
  currentSession: {
    startedAt: number | null;
    touches: Record<string, number>; // itemId -> last activity ts
  };
  level: 'beginner' | 'advanced';
}

const STORAGE_KEY = 'btlw-practice-v1';
const DAY = 24 * 60 * 60 * 1000;
const REVIEW_LADDER_DAYS = [1, 3, 7, 14];
const CLEAN = 0.9;

export function emptyProgress(): ProgressState {
  return {
    items: {},
    sessions: [],
    currentSession: { startedAt: null, touches: {} },
    level: 'beginner',
  };
}

export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as ProgressState;
    return { ...emptyProgress(), ...parsed };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — practice still works, progress just won't persist.
  }
}

export function setLevel(state: ProgressState, level: 'beginner' | 'advanced'): ProgressState {
  return { ...state, level };
}

function touchSession(state: ProgressState, itemId: string): ProgressState {
  const now = Date.now();
  return {
    ...state,
    currentSession: {
      startedAt: state.currentSession.startedAt ?? now,
      touches: { ...state.currentSession.touches, [itemId]: now },
    },
  };
}


export interface AttemptInput {
  score: number;
  value?: number;
  label?: string;
}

/** Record one attempt against an item and update mastery + review scheduling. */
export function recordAttempt(
  state: ProgressState,
  itemId: string,
  kind: ItemKind,
  input: AttemptInput,
): ProgressState {
  const now = Date.now();
  const prev = state.items[itemId];
  const clean = input.score >= CLEAN;

  const record: ItemRecord = prev ?? {
    kind,
    attempts: 0,
    cleanStreak: 0,
    best: null,
    lastPracticedAt: null,
    mastery: 'new',
    reviewStep: 0,
    nextReviewAt: null,
    history: [],
  };

  const cleanStreak = clean ? record.cleanStreak + 1 : 0;

  let mastery: Mastery;
  if (cleanStreak >= 3) {
    mastery = record.mastery === 'solid' ? 'solid' : 'mastered';
  } else {
    mastery = 'learning';
  }

  // Review scheduling for mastered items: practice again before it fades.
  let reviewStep = record.reviewStep;
  let nextReviewAt: number | null = null;
  if (mastery === 'mastered' || mastery === 'solid') {
    if (clean) {
      if (cleanStreak > 3) reviewStep = Math.min(reviewStep + 1, REVIEW_LADDER_DAYS.length - 1);
      nextReviewAt = now + REVIEW_LADDER_DAYS[reviewStep] * DAY;
      if (reviewStep >= REVIEW_LADDER_DAYS.length - 1 && cleanStreak >= 6) mastery = 'solid';
    } else {
      // A missed review drops it back to learning.
      reviewStep = 0;
      mastery = 'learning';
    }
  }

  const best =
    input.value !== undefined && (record.best === null || input.value < record.best)
      ? input.value
      : record.best;

  const next: ItemRecord = {
    ...record,
    kind,
    attempts: record.attempts + 1,
    cleanStreak,
    best,
    lastPracticedAt: now,
    mastery,
    reviewStep,
    nextReviewAt,
    history: [
      ...record.history,
      { ts: now, score: input.score, value: input.value, label: input.label },
    ].slice(-30),
  };

  return touchSession({ ...state, items: { ...state.items, [itemId]: next } }, itemId);
}

export function isReviewDue(state: ProgressState, itemId: string, now = Date.now()): boolean {
  const item = state.items[itemId];
  if (!item) return false;
  if (item.mastery !== 'mastered' && item.mastery !== 'solid') return false;
  return item.nextReviewAt !== null && item.nextReviewAt <= now;
}

/** End the current session (when the learner heads home) and keep a summary. */
export function endSession(
  state: ProgressState,
  describe: (state: ProgressState) => string[],
): ProgressState {
  const started = state.currentSession.startedAt;
  const touches = state.currentSession.touches;
  const itemCount = Object.keys(touches).length;
  if (!started || itemCount === 0) {
    return { ...state, currentSession: { startedAt: null, touches: {} } };
  }
  const summary: SessionSummary = {
    endedAt: Date.now(),
    minutes: Math.max(1, Math.round((Date.now() - started) / 60000)),
    lines: describe(state),
  };
  return {
    ...state,
    sessions: [summary, ...state.sessions].slice(0, 20),
    currentSession: { startedAt: null, touches: {} },
  };
}

/** Count of items at each mastery level, for progress views. */
export function masteryCounts(
  state: ProgressState,
  itemIds: string[],
): Record<Mastery, number> {
  const counts: Record<Mastery, number> = { new: 0, learning: 0, mastered: 0, solid: 0 };
  for (const id of itemIds) {
    const item = state.items[id];
    counts[item ? item.mastery : 'new'] += 1;
  }
  return counts;
}
