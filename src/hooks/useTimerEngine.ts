import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerEngine, TimerTickData } from '../services/timer/timerEngine';
import { RaceTemplate, RaceRun, AppSettings, ActiveRunRuntimeState } from '../types/race';
import { storage } from '../services/storage/indexedDb';

export function useTimerEngine(settings: AppSettings) {
  const engineRef = useRef<TimerEngine | null>(null);
  const [tickData, setTickData] = useState<TimerTickData | null>(null);
  const [currentRun, setCurrentRun] = useState<RaceRun | null>(null);
  const [interruptedState, setInterruptedState] = useState<ActiveRunRuntimeState | null>(null);
  const [expiredNotification, setExpiredNotification] = useState<{
    taskIndex: number;
    taskName: string;
    nextTaskName?: string;
  } | null>(null);

  // Initialize engine once
  if (!engineRef.current) {
    const engine = new TimerEngine(settings);
    engine.setPersistCallback((state) => {
      storage.saveActiveRuntimeState(state).catch(console.error);
    });
    engineRef.current = engine;
  }

  // Update engine settings when settings change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Check for interrupted race on mount
  useEffect(() => {
    storage.getActiveRuntimeState().then((state) => {
      if (state && (state.timerState === 'RUNNING' || state.timerState === 'PAUSED' || state.timerState === 'WARNING' || state.timerState === 'OVERTIME')) {
        setInterruptedState(state);
      }
    });
  }, []);

  // Subscribe to engine ticks and events
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const unsubTick = engine.subscribe((data) => {
      setTickData(data);
      setCurrentRun(engine.getCurrentRun());
    });

    const unsubExpired = engine.onTaskExpired((taskIndex, taskName, nextTaskName) => {
      setExpiredNotification({ taskIndex, taskName, nextTaskName });
      setTimeout(() => setExpiredNotification(null), 5000);
    });

    return () => {
      unsubTick();
      unsubExpired();
    };
  }, []);

  const initializeRun = useCallback((template: RaceTemplate) => {
    if (!engineRef.current) return null;
    const run = engineRef.current.initializeRun(template);
    setCurrentRun(run);
    setTickData(engineRef.current.getTickData());
    return run;
  }, []);

  const start = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const completeTask = useCallback(() => {
    engineRef.current?.completeTask();
    const run = engineRef.current?.getCurrentRun();
    if (run) {
      storage.saveRun(run).catch(console.error);
    }
  }, []);

  const skipTask = useCallback(() => {
    engineRef.current?.skipTask();
    const run = engineRef.current?.getCurrentRun();
    if (run) {
      storage.saveRun(run).catch(console.error);
    }
  }, []);

  const restartTask = useCallback(() => {
    engineRef.current?.restartTask();
  }, []);

  const restartRace = useCallback(() => {
    engineRef.current?.restartRace();
  }, []);

  const finishRace = useCallback(async () => {
    if (!engineRef.current) return;
    engineRef.current.finishRace();
    const run = engineRef.current.getCurrentRun();
    if (run) {
      await storage.saveRun(run);
    }
    await storage.clearActiveRuntimeState();
  }, []);

  const resumeInterrupted = useCallback((savedState: ActiveRunRuntimeState) => {
    if (!engineRef.current) return;
    engineRef.current.recover(savedState);
    setInterruptedState(null);
  }, []);

  const discardInterrupted = useCallback(async () => {
    await storage.clearActiveRuntimeState();
    setInterruptedState(null);
  }, []);

  return {
    engine: engineRef.current,
    tickData,
    currentRun,
    interruptedState,
    expiredNotification,
    initializeRun,
    start,
    pause,
    completeTask,
    skipTask,
    restartTask,
    restartRace,
    finishRace,
    resumeInterrupted,
    discardInterrupted,
  };
}
