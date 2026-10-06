'use client';

// React wrapper around the local progress store. Loads once on mount,
// saves on every change. Everything stays on this device.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { AttemptInput, ItemKind, ProgressState } from '@/lib/practice/progress-store';
import {
  emptyProgress,
  endSession,
  loadProgress,
  recordAttempt,
  saveProgress,
  setLevel,
} from '@/lib/practice/progress-store';

export interface ProgressValue {
  state: ProgressState;
  /** Record one attempt (score 0..1, optional measured value). */
  record: (itemId: string, kind: ItemKind, input: AttemptInput) => void;
  changeLevel: (level: 'beginner' | 'advanced') => void;
  endCurrentSession: () => void;
}

const ProgressContext = createContext<ProgressValue | null>(null);

export function useProgress(): ProgressValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  // Start empty on the server and during hydration, load real data after mount.
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(loadProgress());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveProgress(state);
  }, [state, loaded]);

  const record = useCallback(
    (itemId: string, kind: ItemKind, input: AttemptInput) => {
      setState((prev) => recordAttempt(prev, itemId, kind, input));
    },
    [],
  );

  const changeLevel = useCallback((level: 'beginner' | 'advanced') => {
    setState((prev) => setLevel(prev, level));
  }, []);

  const endCurrentSession = useCallback(() => {
    setState((prev) =>
      endSession(prev, (s) => {
        const lines: string[] = [];
        for (const [id] of Object.entries(s.items)) {
          const last = s.items[id]?.history[s.items[id]?.history.length - 1];
          if (last) lines.push(id);
        }
        return lines.slice(0, 12);
      }),
    );
  }, []);

  return (
    <ProgressContext.Provider value={{ state, record, changeLevel, endCurrentSession }}>
      {children}
    </ProgressContext.Provider>
  );
}
