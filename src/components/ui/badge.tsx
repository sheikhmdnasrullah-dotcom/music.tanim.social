import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    accent: 'bg-accent-light text-accent',
    success: 'bg-emerald-50 text-success',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
