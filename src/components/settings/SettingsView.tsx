import React, { useState } from 'react';
import { AppSettings } from '../../types/race';
import { DataManagementSection } from './DataManagementSection';
import { DurationInput } from '../editor/DurationInput';
import { audio } from '../../services/timer/audioService';
import { notifications } from '../../services/timer/notificationService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Settings,
  Volume2,
  Clock,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Keyboard,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onResetSeedData: () => Promise<{ added: number; updated: number }>;
  onRefreshData: () => void;
  onShowToast: (msg: string, undo?: () => void) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetSeedData,
  onRefreshData,
  onShowToast,
}) => {
  const [confirmResetSeed, setConfirmResetSeed] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);

  const handleTestAudio = () => {
    setTestingAudio(true);
    audio.playTaskComplete();
    setTimeout(() => {
      audio.playWarningAlert();
      setTestingAudio(false);
    }, 700);
  };

  const handleToggleNotifications = async () => {
    if (!settings.browserNotificationsEnabled) {
      const granted = await notifications.requestPermission();
      if (granted) {
        onUpdateSettings({ browserNotificationsEnabled: true });
        notifications.notify('Race Timer Notifications Enabled', {
          body: 'You will receive warnings and completion notices.',
        });
      } else {
        alert('Notification permission was not granted by your browser.');
      }
    } else {
      onUpdateSettings({ browserNotificationsEnabled: false });
    }
  };

  const handleToggleThreshold = (seconds: number) => {
    const current = new Set(settings.warningThresholds);
    if (current.has(seconds)) {
      current.delete(seconds);
    } else {
      current.add(seconds);
    }
    const updated = Array.from(current).sort((a, b) => b - a);
    onUpdateSettings({ warningThresholds: updated });
  };

  const handleConfirmResetSeed = async () => {
    const { added, updated } = await onResetSeedData();
    onShowToast(`Seed data restored: ${added} added, ${updated} refreshed.`);
    setConfirmResetSeed(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* View Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-orange-400" />
          <span>Application Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Customize timer behavior, audio cues, appearance, and local backups.
        </p>
      </div>

      {/* SEED DATA SECTION (Required by User Instructions) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Demo & Testing Seed Data</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Seed data provides realistic race templates across multiple categories (Interview Prep, System Design, Pomodoro, 90m Deep Work, HIIT Workout) and sample historical runs. You can reset seed data anytime without overwriting your personal races.
            </p>
          </div>

          <button
            onClick={() => setConfirmResetSeed(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-semibold transition cursor-pointer min-h-[44px] shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Seed Data</span>
          </button>
        </div>
      </div>

      {/* TIMER BEHAVIOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-800">
          <Clock className="w-4 h-4 text-orange-400" />
          <span>Timer Behavior</span>
        </h3>

        <div className="space-y-4">
          {/* Default Task Duration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Default Task Duration</span>
              <span className="text-xs text-slate-400">Duration assigned to newly created tasks</span>
            </div>
            <DurationInput
              seconds={settings.defaultTaskDuration}
              onChange={(s) => onUpdateSettings({ defaultTaskDuration: s })}
            />
          </div>

          {/* Auto Advance */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Auto-Advance Tasks</span>
              <span className="text-xs text-slate-400">Automatically switch to the next task when timer expires</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAdvance}
              onChange={(e) => onUpdateSettings({ autoAdvance: e.target.checked })}
              className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </div>

          {/* Allow Overtime */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Allow Overtime Tracking</span>
              <span className="text-xs text-slate-400">Continue counting upward when allocated duration expires (+02:15)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowOvertime}
              onChange={(e) => onUpdateSettings({ allowOvertime: e.target.checked })}
              className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </div>

          {/* Screen Wake Lock */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Screen Wake Lock</span>
              <span className="text-xs text-slate-400">Keep display awake while a race is active</span>
            </div>
            <input
              type="checkbox"
              checked={settings.wakeLockEnabled}
              onChange={(e) => onUpdateSettings({ wakeLockEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* AUDIO & NOTIFICATIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Audio & Notifications</span>
          </h3>
          <button
            onClick={handleTestAudio}
            disabled={testingAudio || !settings.soundEnabled}
            className="text-xs font-semibold px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-400 rounded-xl transition cursor-pointer"
          >
            {testingAudio ? 'Playing...' : 'Test Sound'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Sound Enabled */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Sound Effects</span>
              <span className="text-xs text-slate-400">Offline Web Audio synthesizer for chimes and alerts</span>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </div>

          {/* Volume Slider */}
          {settings.soundEnabled && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Volume</span>
                <span className="text-xs text-slate-400">{Math.round(settings.soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                className="w-48 accent-orange-500 cursor-pointer"
              />
            </div>
          )}

          {/* Warning Thresholds */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Ending Warning Thresholds</span>
              <span className="text-xs text-slate-400">Trigger gentle audio/visual warnings at:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {[
                { label: '5 minutes', sec: 300 },
                { label: '2 minutes', sec: 120 },
                { label: '1 minute', sec: 60 },
                { label: '30 seconds', sec: 30 },
              ].map(({ label, sec }) => (
                <label
                  key={sec}
                  className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={settings.warningThresholds.includes(sec)}
                    onChange={() => handleToggleThreshold(sec)}
                    className="rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Browser Notifications</span>
              <span className="text-xs text-slate-400">Optional desktop notifications when tasks expire</span>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                settings.browserNotificationsEnabled
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {settings.browserNotificationsEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      {/* APPEARANCE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Appearance & Theme</span>
        </h3>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Color Theme</span>
              <span className="text-xs text-slate-400">Select your preferred viewing appearance</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => onUpdateSettings({ theme: 'system' })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  settings.theme === 'system' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  settings.theme === 'dark' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  settings.theme === 'light' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-purple-400" />
            <span>Keyboard Shortcuts</span>
          </h3>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={settings.keyboardShortcutsEnabled}
              onChange={(e) => onUpdateSettings({ keyboardShortcutsEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60">
            <span>Play / Pause</span>
            <kbd className="font-mono text-orange-400 font-bold">Space</kbd>
          </div>
          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60">
            <span>Complete Task</span>
            <kbd className="font-mono text-orange-400 font-bold">Enter</kbd>
          </div>
          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60">
            <span>Skip Task</span>
            <kbd className="font-mono text-orange-400 font-bold">S</kbd>
          </div>
          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60">
            <span>Restart Current Task</span>
            <kbd className="font-mono text-orange-400 font-bold">R</kbd>
          </div>
          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60">
            <span>Toggle Focus Mode</span>
            <kbd className="font-mono text-orange-400 font-bold">F</kbd>
          </div>
          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60">
            <span>Exit Focus Mode / Dialog</span>
            <kbd className="font-mono text-orange-400 font-bold">Esc</kbd>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE LOCAL DATA MANAGEMENT (Required by User Instructions) */}
      <DataManagementSection
        settings={settings}
        onRefreshData={onRefreshData}
        onShowToast={onShowToast}
      />

      {/* Seed Data Reset Dialog */}
      <ConfirmDialog
        isOpen={confirmResetSeed}
        title="Reset Seed Data Templates?"
        message="This will reload the official seed templates (Google L5 Interview, System Design, Pomodoro, 90m Deep Work, HIIT Workout) and sample runs. All your custom created races will remain untouched."
        confirmText="Reset Seed Data"
        onConfirm={handleConfirmResetSeed}
        onCancel={() => setConfirmResetSeed(false)}
      />
    </div>
  );
};
