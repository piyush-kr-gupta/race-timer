import { useState, useEffect } from 'react';
import { getLocalDateKey } from '../utils/dateUtils';

/**
 * Custom hook providing today's local date key ('YYYY-MM-DD').
 * Reactively triggers component re-renders when a new calendar day arrives
 * (at midnight, when tab becomes visible, or on window focus).
 */
export function useCurrentDay(): string {
  const [todayKey, setTodayKey] = useState<string>(() => getLocalDateKey());

  useEffect(() => {
    const checkDay = () => {
      const nowKey = getLocalDateKey();
      setTodayKey((prev) => (prev !== nowKey ? nowKey : prev));
    };

    // Periodic check every 15 seconds
    const intervalId = setInterval(checkDay, 15_000);

    // Immediate check on tab visibility change or window focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDay();
      }
    };
    const handleFocus = () => {
      checkDay();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return todayKey;
}
