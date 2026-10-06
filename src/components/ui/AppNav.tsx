'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';

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
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 h-12">
          <Link href="/" className="flex items-center gap-2 min-w-0 group">
            <Music className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="font-semibold tracking-tight text-sm truncate text-foreground">
              Before I Learned the Words
            </span>
          </Link>
          <nav className="flex items-center gap-0.5" aria-label="Main">
            {LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-medium transition-colors rounded-md',
                    active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
