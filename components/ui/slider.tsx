'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      label,
      className,
      disabled = false,
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {label}
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {value}
            </span>
          </div>
        )}
        <input
          ref={ref}
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary outline-none transition-opacity',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Webkit track
            '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full',
            // Webkit thumb
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
            // Firefox track
            '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-secondary',
            // Firefox thumb
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110'
          )}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${percentage}%, hsl(var(--secondary)) ${percentage}%)`,
          }}
        />
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
