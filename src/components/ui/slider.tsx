import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  unit?: string;
  className?: string;
}

export function Slider({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  showValue = true, 
  unit = '',
  className,
  ...props 
}: SliderProps) {
  return (
    <div className={cn('w-full', className)}>
      <label className="block mb-1.5 flex justify-between text-sm font-medium text-foreground">
        <span>{label}</span>
        {showValue && <span className="text-muted-foreground font-mono">{value}{unit}</span>}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-md"
        {...props}
      />
    </div>
  );
}