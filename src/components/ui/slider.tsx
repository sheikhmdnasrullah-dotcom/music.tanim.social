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
}: SliderProps) {
  return (
    <div className={cn('w-full', className)}>
      <label className="block mb-2 flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {showValue && (
          <span className="font-mono text-foreground tabular-nums">
            {value}{unit}
          </span>
        )}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm"
      />
    </div>
  );
}
