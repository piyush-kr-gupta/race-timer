import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerEngine, TimerTickData } from '../services/timer/timerEngine';
import { RaceTemplate, RaceRun, AppSettings, ActiveRunRuntimeState } from '../types/race';
import { storage } from '../services/storage/indexedDb';

export function useTimerEngine(settings: AppSettings) {
  const engineRef = useRef<TimerEngine | null>(null);
  const [tickData, setTickData] = useState<TimerTickData | null>(null);
  const [currentRun, setCurrentRun] = useState<RaceRun | null>(null);
  const [savedRaces, setSavedRaces] = useState<ActiveRunRuntimeState[]>([]);
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

  const refreshSavedRaces = useCallback(async () => {
    try {
      const states = await storage.getAllActiveRuntimeStates();
      setSavedRaces(states);
    } catch (e) {
      console.error('Failed to load saved races:', e);
    }
  }, []);

  // Update engine settings when settings change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Check for saved and interrupted races on mount
  useEffect(() => {
    refreshSavedRaces().then(() => {
      storage.getActiveRuntimeState().then((state) => {
        // Only prompt modal for ungracefully interrupted runs that were running
        if (state && state.timerState === 'RUNNING') {
          setInterruptedState(state);
        }
      });
    });
  }, [refreshSavedRaces]);

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
    const engine = engineRef.current;
    if (!engine) return;
    engine.finishRace();
    const run = engine.getCurrentRun();
    if (run) {
      await storage.saveRun(run);
      await storage.deleteActiveRuntimeState(run.id);
    }
    await refreshSavedRaces();
  }, [refreshSavedRaces]);

  const saveCurrentRaceAndExit = useCallback(async (): Promise<ActiveRunRuntimeState | null> => {
    const engine = engineRef.current;
    if (!engine) return null;
    const state = engine.pauseAndGetState();
    if (state) {
      await storage.saveActiveRuntimeState(state);
      await refreshSavedRaces();
    }
    return state;
  }, [refreshSavedRaces]);

  const resumeRace = useCallback(async (savedState: ActiveRunRuntimeState) => {
    const engine = engineRef.current;
    if (!engine) return;

    // If another race is currently loaded and different, save it first
    const current = engine.getCurrentRun();
    if (current && current.id !== savedState.runId) {
      const currentState = engine.pauseAndGetState();
      if (currentState) {
        await storage.saveActiveRuntimeState(currentState);
      }
    }

    engine.recover(savedState);
    setCurrentRun(engine.getCurrentRun());
    setTickData(engine.getTickData());
    setInterruptedState(null);
    await refreshSavedRaces();
  }, [refreshSavedRaces]);

  const discardSavedRace = useCallback(async (runId: string) => {
    await storage.deleteActiveRuntimeState(runId);
    const engine = engineRef.current;
    if (engine && engine.getCurrentRun()?.id === runId) {
      engine.clearCurrentRun();
      setCurrentRun(null);
      setTickData(null);
    }
    if (interruptedState?.runId === runId) {
      setInterruptedState(null);
    }
    await refreshSavedRaces();
  }, [interruptedState?.runId, refreshSavedRaces]);

  const resumeInterrupted = useCallback((savedState: ActiveRunRuntimeState) => {
    resumeRace(savedState);
  }, [resumeRace]);

  const discardInterrupted = useCallback(async () => {
    if (interruptedState) {
      await discardSavedRace(interruptedState.runId);
    }
  }, [discardSavedRace, interruptedState]);

  return {
    engine: engineRef.current,
    tickData,
    currentRun,
    savedRaces,
    interruptedState,
    expiredNotification,
    refreshSavedRaces,
    initializeRun,
    start,
    pause,
    completeTask,
    skipTask,
    restartTask,
    restartRace,
    finishRace,
    saveCurrentRaceAndExit,
    resumeRace,
    discardSavedRace,
    resumeInterrupted,
    discardInterrupted,
  };
}
