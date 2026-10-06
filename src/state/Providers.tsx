'use client';

// All app-wide providers in one place, mounted in the root layout.

import React from 'react';
import { ProgressProvider } from '@/state/ProgressContext';
import { SongPlayerProvider } from '@/state/SongPlayerContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider>
      <SongPlayerProvider>{children}</SongPlayerProvider>
    </ProgressProvider>
  );
}
