'use client';

// Top navigation. Client component because it tracks the active route.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Player' },
  { href: '/practice', label: 'Practice' },
  { href: '/song', label: 'Song' },
  { href: '/guitar', label: 'Guitar' },
  { href: '/progress', label: 'Progress' },
];

export function AppNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="border-b border-border bg-white/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 h-14">
          <Link href="/" className="flex items-baseline gap-2 min-w-0">
            <span className="font-bold tracking-tight truncate">
              Before I Learned the Words
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              personal practice studio
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? 'page' : undefined}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(l.href)
                    ? 'bg-foreground text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
