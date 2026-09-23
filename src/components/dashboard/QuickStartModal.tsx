import React, { useState } from 'react';
import { X, Play, Clock, Sparkles } from 'lucide-react';
import { RaceTemplate } from '../../types/race';
import { parseDurationToSeconds, formatDurationHuman } from '../../utils/duration';

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRace: (template: RaceTemplate) => void;
}

interface Preset {
  name: string;
  duration: number; // seconds
  category: string;
  tasks: Array<{ name: string; duration: number }>;
}

const PRESETS: Preset[] = [
  {
    name: '25-minute Pomodoro',
    duration: 1500,
    category: 'Productivity',
    tasks: [
      { name: 'Laser Focus Sprint', duration: 1500 },
      { name: 'Recovery Break', duration: 300 },
    ],
  },
  {
    name: '45-minute Technical Interview',
    duration: 2700,
    category: 'Interview Prep',
    tasks: [
      { name: 'Understand & Clarify Problem', duration: 300 },
      { name: 'Algorithm & Design', duration: 600 },
      { name: 'Live Coding', duration: 1200 },
      { name: 'Dry Run & Edge Cases', duration: 360 },
      { name: 'Questions & Discussion', duration: 240 },
    ],
  },
  {
    name: '60-minute Deep Work',
    duration: 3600,
    category: 'Deep Work',
    tasks: [
      { name: 'Daily Target & Prep', duration: 300 },
      { name: 'Uninterrupted Flow Block', duration: 3000 },
      { name: 'Review & Log', duration: 300 },
    ],
  },
  {
    name: '90-minute Study Session',
    duration: 5400,
    category: 'Study',
    tasks: [
      { name: 'Concept Review & Reading', duration: 1800 },
      { name: 'Quick 5m Stretch', duration: 300 },
      { name: 'Active Recall & Practice Problems', duration: 2700 },
      { name: 'Self-Quiz & Summary', duration: 600 },
    ],
  },
];

export const QuickStartModal: React.FC<QuickStartModalProps> = ({
  isOpen,
  onClose,
  onStartRace,
}) => {
  const [raceName, setRaceName] = useState('');
  const [durationInput, setDurationInput] = useState('25m');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset);
    setRaceName(preset.name);
    setDurationInput(formatDurationHuman(preset.duration));
  };

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDuration = parseDurationToSeconds(durationInput) || 1500;
    const finalName = raceName.trim() || 'Quick Race';

    let tasks = selectedPreset?.tasks.map((t, idx) => ({
      id: `task-${Date.now()}-${idx}`,
      name: t.name,
      durationSeconds: t.duration,
      order: idx,
      enabled: true,
    }));

    if (!tasks || tasks.length === 0) {
      tasks = [
        {
          id: `task-${Date.now()}-0`,
          name: finalName,
          durationSeconds: finalDuration,
          order: 0,
          enabled: true,
        },
      ];
    }

    const template: RaceTemplate = {
      id: `race-quick-${Date.now()}`,
      name: finalName,
      category: selectedPreset?.category || 'Quick Start',
      tags: ['Quick'],
      description: 'Quick started race sequence',
      tasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: false,
    };

    onStartRace(template);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-start-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="quick-start-title" className="text-lg font-bold text-slate-100">
                Quick Start Race
              </h3>
              <p className="text-xs text-slate-400">Pick a preset or enter a name and duration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Popular Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedPreset?.name === p.name
                    ? 'bg-orange-500/15 border-orange-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="font-semibold text-xs text-slate-100">{p.name}</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {formatDurationHuman(p.duration)} • {p.tasks.length} tasks
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleLaunch} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Race Name
            </label>
            <input
              type="text"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="e.g. System Design Mock Interview"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Duration (e.g. 5, 25m, 45:00, 1h)
            </label>
            <input
              type="text"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="25m"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Parsed: {formatDurationHuman(parseDurationToSeconds(durationInput))}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer min-h-[44px]"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Race Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
