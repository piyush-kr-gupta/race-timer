import React, { useState, useEffect } from 'react';
import { Timer, History, Settings, Plus, Keyboard, Sun, Moon, Monitor, Download } from 'lucide-react';
import { AppSettings } from '../../types/race';

interface HeaderProps {
  currentTab: 'dashboard' | 'history' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'history' | 'settings') => void;
  onQuickStart: () => void;
  onOpenShortcuts: () => void;
  isRaceActive: boolean;
  savedRacesCount?: number;
  onReturnToActiveRace?: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onQuickStart,
  onOpenShortcuts,
  isRaceActive,
  savedRacesCount = 0,
  onReturnToActiveRace,
  settings,
  onUpdateSettings,
}) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const cycleTheme = () => {
    const nextTheme = settings.theme === 'system' ? 'dark' : settings.theme === 'dark' ? 'light' : 'system';
    onUpdateSettings({ theme: nextTheme });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 pt-safe">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 font-bold text-lg text-slate-100 hover:text-orange-400 transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <Timer className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="tracking-tight hidden sm:inline">Race Timer</span>
          </button>

          {isRaceActive ? (
            <button
              onClick={onReturnToActiveRace}
              className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30 rounded-full text-xs font-semibold animate-pulse transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              Live Race
            </button>
          ) : savedRacesCount > 0 ? (
            <button
              onClick={onReturnToActiveRace}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded-full text-xs font-semibold transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              In Progress ({savedRacesCount})
            </button>
          ) : null}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${
              currentTab === 'dashboard'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Races</span>
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${
              currentTab === 'history'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${
              currentTab === 'settings'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              title="Install App"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Install</span>
            </button>
          )}

          <button
            onClick={cycleTheme}
            title={`Current theme: ${settings.theme}. Click to switch.`}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Toggle color theme"
          >
            {settings.theme === 'system' && <Monitor className="w-4 h-4" />}
            {settings.theme === 'dark' && <Moon className="w-4 h-4 text-cyan-400" />}
            {settings.theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer hover:bg-slate-800 min-h-[40px] min-w-[40px] hidden sm:flex items-center justify-center"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={onQuickStart}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Quick Start</span>
          </button>
        </div>
      </div>
    </header>
  );
};
