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
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { DEFAULT_PLEDGE_MESSAGE } from '../../services/storage/seedData';
import { formatCutoffTimeDisplay } from '../../utils/dateUtils';

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
  const [confirmClearApologies, setConfirmClearApologies] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);

  const handleTestAudio = () => {
    setTestingAudio(true);
    audio.playCountdownWarning(3);
    setTimeout(() => {
      audio.playWarningAlert();
      setTimeout(() => {
        audio.playTaskComplete();
        setTestingAudio(false);
      }, 500);
    }, 400);
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

          {/* Display Timer in Browser Tab Title */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Display Timer in Browser Tab Title</span>
              <span className="text-xs text-slate-400">Update Chrome tab title with remaining time and race name (e.g. 05:00 - Workout) during active races</span>
            </div>
            <input
              type="checkbox"
              checked={settings.tabTitleTimerEnabled}
              onChange={(e) => onUpdateSettings({ tabTitleTimerEnabled: e.target.checked })}
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

          {/* Final Second-by-Second Countdown Warning */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">
                Final Countdown Warning (Every Second)
              </span>
              <span className="text-xs text-slate-400">
                Trigger gentle audio/visual warnings every second from:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { label: '10s to 1s', value: 10 },
                { label: '15s to 1s', value: 15 },
                { label: 'Disabled', value: 0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateSettings({ countdownWarningThreshold: opt.value })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer min-h-[36px] ${
                    (settings.countdownWarningThreshold ?? 10) === opt.value
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
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

      {/* ACCOUNTABILITY & DAILY PLEDGE SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Accountability & Daily Pledge</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enforce a persistent commitment dialogue if scheduled races are incomplete by the daily cutoff.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 self-start sm:self-center">
            <span>Enforce Accountability</span>
            <input
              type="checkbox"
              checked={settings.accountabilityEnabled !== false}
              onChange={(e) => onUpdateSettings({ accountabilityEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500 cursor-pointer"
            />
          </label>
        </div>

        {settings.accountabilityEnabled !== false && (
          <div className="space-y-5 pt-1">
            {/* Cutoff Time Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-200 block">Daily Cutoff Time</span>
                <span className="text-xs text-slate-400">
                  Cutoff deadline when unfinished races trigger the persistent popup (current:{' '}
                  <span className="text-rose-400 font-semibold">
                    {formatCutoffTimeDisplay(settings.accountabilityCutoffTime || '21:00')}
                  </span>
                  )
                </span>
              </div>
              <input
                type="time"
                value={settings.accountabilityCutoffTime || '21:00'}
                onChange={(e) => onUpdateSettings({ accountabilityCutoffTime: e.target.value })}
                className="bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3 py-1.5 text-sm font-mono text-slate-200 outline-none w-36 text-center cursor-pointer"
              />
            </div>

            {/* Pledge Message Input */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-200 block">Exact Pledge Message</span>
                  <span className="text-xs text-slate-400">
                    Must be typed word-for-word into the persistent popup before the "Apology to Self" button unlocks.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ accountabilityPledgeMessage: DEFAULT_PLEDGE_MESSAGE })}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition border border-slate-800 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>

              <textarea
                value={settings.accountabilityPledgeMessage || DEFAULT_PLEDGE_MESSAGE}
                onChange={(e) => onUpdateSettings({ accountabilityPledgeMessage: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-xs sm:text-sm text-slate-200 outline-none resize-none leading-relaxed"
                placeholder="Enter custom pledge message..."
              />
            </div>

            {/* Apologies Tracker Summary */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Apologies Recorded: {settings.apologyLog?.length || 0}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    All apologies are stored locally and included in backups. View full details in the History tab.
                  </span>
                </div>
              </div>

              {settings.apologyLog && settings.apologyLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearApologies(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl transition cursor-pointer shrink-0"
                >
                  Clear Apologies Log
                </button>
              )}
            </div>
          </div>
        )}
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

      {/* Clear Apologies Dialog */}
      <ConfirmDialog
        isOpen={confirmClearApologies}
        title="Clear Apology History?"
        message="Are you sure you want to delete all logged apology records? This action cannot be undone."
        isDestructive
        confirmText="Clear Apologies"
        onConfirm={() => {
          onUpdateSettings({ apologyLog: [] });
          setConfirmClearApologies(false);
          onShowToast('Apology history log cleared.');
        }}
        onCancel={() => setConfirmClearApologies(false)}
      />
    </div>
  );
};
