'use client';

// The single next action, pulled from the curriculum + review scheduler.

import Link from 'next/link';
import { nextAction } from '@/lib/practice/plan';
import { useProgress } from '@/state/ProgressContext';
import { Button } from '@/components/ui/button';

export function NextActionCard() {
  const { state } = useProgress();
  const action = nextAction(state);
  const isReview = action.detail.startsWith('Review');

  return (
    <section className="border-2 border-foreground rounded-2xl bg-white p-4 md:p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
            {isReview ? 'Review due' : 'Next up'}
          </div>
          <div className="font-bold text-lg leading-snug">{action.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {action.detail} · ~{action.minutes} min
          </div>
        </div>
        <Link href={action.href} className="flex-shrink-0">
          <Button>Do this →</Button>
        </Link>
      </div>
    </section>
  );
}
