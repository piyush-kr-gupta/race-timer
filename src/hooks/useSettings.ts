import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types/race';
import { storage } from '../services/storage/indexedDb';
import { DEFAULT_SETTINGS } from '../services/storage/seedData';
import { audio } from '../services/timer/audioService';
import { speech } from '../services/timer/speechService';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Apply theme to document
  const applyTheme = useCallback((theme: 'system' | 'dark' | 'light') => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      root.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    storage.getSettings().then((s) => {
      if (mounted) {
        setSettings(s);
        applyTheme(s.theme);
        audio.setEnabled(s.soundEnabled);
        audio.setVolume(s.soundVolume);
        speech.setEnabled(s.soundEnabled && s.ttsTaskNameEnabled !== false);
        speech.setVolume(s.soundVolume);
        setLoading(false);
      }
    });

    // Listen to OS theme changes if on system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      storage.getSettings().then((curr) => {
        if (curr.theme === 'system') {
          applyTheme('system');
        }
      });
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mounted = false;
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [applyTheme]);

  const updateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await storage.saveSettings(partial);
    setSettings(updated);
    if (partial.theme) {
      applyTheme(partial.theme);
    }
    if (partial.soundEnabled !== undefined) {
      audio.setEnabled(partial.soundEnabled);
    }
    if (partial.soundVolume !== undefined) {
      audio.setVolume(partial.soundVolume);
      speech.setVolume(partial.soundVolume);
    }
    if (partial.soundEnabled !== undefined || partial.ttsTaskNameEnabled !== undefined) {
      speech.setEnabled(updated.soundEnabled && updated.ttsTaskNameEnabled !== false);
    }
    return updated;
  };

  return {
    settings,
    loading,
    updateSettings,
  };
}
