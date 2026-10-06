import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'default';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-foreground text-white hover:bg-neutral-800 active:scale-[0.98]',
    default: 'bg-foreground text-white hover:bg-neutral-800 active:scale-[0.98]',
    secondary: 'bg-muted text-foreground hover:bg-neutral-200 active:scale-[0.98]',
    outline: 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 active:scale-[0.98]',
    ghost: 'text-foreground hover:bg-muted active:scale-[0.98]',
    danger: 'bg-danger text-white hover:bg-red-700 active:scale-[0.98]',
  };
  
  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-8 text-base',
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
