'use client';

import Link from 'next/link';
import { nextAction } from '@/lib/practice/plan';
import { useProgress } from '@/state/ProgressContext';
import { Button } from '@/components/ui/button';

export function NextActionCard() {
  const { state } = useProgress();
  const action = nextAction(state);
  const isReview = action.detail.startsWith('Review');

  return (
    <section className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
            {isReview ? 'Review due' : 'Next up'}
          </div>
          <div className="font-medium text-sm leading-snug">{action.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {action.detail} · ~{action.minutes} min
          </div>
        </div>
        <Link href={action.href} className="flex-shrink-0">
          <Button size="sm">Do this</Button>
        </Link>
      </div>
    </section>
  );
}
