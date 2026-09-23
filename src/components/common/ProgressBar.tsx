import React from 'react';

interface ProgressBarProps {
  progressPercent: number; // 0 to 100
  color?: 'orange' | 'cyan' | 'emerald' | 'rose' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  isOvertime?: boolean;
  className?: string;
  label?: string;
  sublabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progressPercent,
  color = 'orange',
  size = 'md',
  isOvertime = false,
  className = '',
  label,
  sublabel,
}) => {
  const clamped = Math.max(0, Math.min(100, progressPercent));

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';

  const colorClasses = {
    orange: 'bg-gradient-to-r from-orange-500 to-amber-500',
    cyan: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    rose: 'bg-gradient-to-r from-rose-500 to-red-600',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
  };

  const activeColor = isOvertime ? 'bg-gradient-to-r from-rose-600 to-red-700 animate-pulse' : colorClasses[color];

  return (
    <div className={`w-full ${className}`}>
      {(label || sublabel) && (
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5 font-medium">
          {label && <span>{label}</span>}
          {sublabel && <span className="tabular-nums font-semibold text-slate-300">{sublabel}</span>}
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 ${heightClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${activeColor}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
