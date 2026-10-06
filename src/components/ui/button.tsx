import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'default';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';

  const variants = {
    primary: 'bg-foreground text-white hover:bg-neutral-800 active:scale-[0.98]',
    default: 'bg-foreground text-white hover:bg-neutral-800 active:scale-[0.98]',
    secondary: 'bg-muted text-foreground hover:bg-neutral-200 active:scale-[0.98]',
    outline: 'border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.98]',
    ghost: 'text-foreground hover:bg-muted active:scale-[0.98]',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-red-700 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
