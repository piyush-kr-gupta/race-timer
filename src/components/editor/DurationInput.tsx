import React, { useState, useEffect } from 'react';
import { parseDurationToSeconds, formatTime, formatDurationHuman } from '../../utils/duration';
import { Plus, Minus } from 'lucide-react';

interface DurationInputProps {
  seconds: number;
  onChange: (newSeconds: number) => void;
  className?: string;
}

export const DurationInput: React.FC<DurationInputProps> = ({
  seconds,
  onChange,
  className = '',
}) => {
  const [textValue, setTextValue] = useState(formatTime(seconds));

  useEffect(() => {
    setTextValue(formatTime(seconds));
  }, [seconds]);

  const handleBlur = () => {
    const parsed = parseDurationToSeconds(textValue);
    onChange(parsed);
    setTextValue(formatTime(parsed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
    const parsed = parseDurationToSeconds(e.target.value);
    if (parsed > 0) {
      onChange(parsed);
    }
  };

  const increment = (delta: number) => {
    const next = Math.max(30, seconds + delta);
    onChange(next);
    setTextValue(formatTime(next));
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => increment(-60)}
          title="Decrease 1 min"
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-700"
          aria-label="Decrease 1 minute"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="text"
          value={textValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="05:00"
          className="w-20 sm:w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center text-xs font-mono font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 tabular-nums min-h-[36px]"
          aria-label="Task duration"
        />

        <button
          type="button"
          onClick={() => increment(60)}
          title="Increase 1 min"
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-700"
          aria-label="Increase 1 minute"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <span className="text-[10px] text-slate-400 text-center font-medium">
        {formatDurationHuman(seconds)}
      </span>
    </div>
  );
};
