import { useState, useEffect, useMemo } from 'react';
import { useSettings } from './hooks/useSettings';
import { useRaces } from './hooks/useRaces';
import { useTimerEngine } from './hooks/useTimerEngine';
import { Header } from './components/common/Header';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { RaceDashboard } from './components/dashboard/RaceDashboard';
import { QuickStartModal } from './components/dashboard/QuickStartModal';
import { RaceEditor } from './components/editor/RaceEditor';
import { RacePlayer } from './components/player/RacePlayer';
import { InterruptionModal } from './components/player/InterruptionModal';
import { RaceResults } from './components/results/RaceResults';
import { RaceHistoryView } from './components/history/RaceHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { RaceTemplate, RaceRun, ActiveRunRuntimeState } from './types/race';
import { storage, isRunFullyCompleted } from './services/storage/indexedDb';

export function App() {
  const { settings, updateSettings } = useSettings();
  const {
    templates,
    runs,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleArchive,
    deleteRun,
    clearAllRuns,
    resetSeedData,
    refresh,
  } = useRaces();

  const {
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
    addSessionTask,
    toggleSessionTask,
    deleteSessionTask,
    updateSessionTask,
    clearCompletedSessionTasks,
  } = useTimerEngine(settings);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [activeView, setActiveView] = useState<'main' | 'editor' | 'player' | 'results'>('main');

  // Modals & Sub-states
  const [editingTemplate, setEditingTemplate] = useState<RaceTemplate | undefined>(undefined);
  const [viewingResultRun, setViewingResultRun] = useState<RaceRun | null>(null);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirm delete race modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Prompt when user starts a race template that already has a saved in-progress run
  const [existingSavedPrompt, setExistingSavedPrompt] = useState<{
    template: RaceTemplate;
    savedState: ActiveRunRuntimeState;
  } | null>(null);

  // Prompt when another race is currently active/running and user starts a new race
  const [activeRaceSwitchPrompt, setActiveRaceSwitchPrompt] = useState<{
    newTemplate: RaceTemplate;
  } | null>(null);

  const addToast = (message: string, onUndo?: () => void, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newToast: ToastMessage = { id, message, type, onUndo };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filter out any fully completed runs from saved races
  const activeSavedRaces = useMemo(() => {
    return savedRaces.filter((s) => !isRunFullyCompleted(s));
  }, [savedRaces]);

  // Watch for race completion transition & clean up active state
  useEffect(() => {
    if (tickData?.timerState === 'RACE_COMPLETED') {
      const run = currentRun;
      if (run) {
        storage.deleteActiveRuntimeState(run.id).then(() => {
          refreshSavedRaces();
        }).catch(console.error);
      }
      if (activeView === 'player' && currentRun) {
        setViewingResultRun(currentRun);
        setActiveView('results');
      }
    }
  }, [tickData?.timerState, activeView, currentRun, refreshSavedRaces]);

  const isRaceActive = Boolean(
    tickData &&
      (tickData.timerState === 'RUNNING' ||
        tickData.timerState === 'PAUSED' ||
        tickData.timerState === 'WARNING' ||
        tickData.timerState === 'OVERTIME')
  );

  // Handlers
  const startNewRaceDirectly = (template: RaceTemplate) => {
    initializeRun(template);
    setActiveView('player');
    start();
  };

  const handleStartRace = async (template: RaceTemplate) => {
    // 1. If this template already has a saved in-progress run, ask user to resume or start fresh
    const existingSaved = activeSavedRaces.find((s) => s.templateId === template.id);
    if (existingSaved) {
      setExistingSavedPrompt({
        template,
        savedState: existingSaved,
      });
      return;
    }

    // 2. If a DIFFERENT race is currently active, prompt user so current race is not lost
    if (isRaceActive && currentRun && currentRun.templateId !== template.id) {
      setActiveRaceSwitchPrompt({ newTemplate: template });
      return;
    }

    startNewRaceDirectly(template);
  };

  const handleSaveAndResumeLater = async () => {
    const saved = await saveCurrentRaceAndExit();
    if (saved) {
      addToast(`Saved progress for "${saved.templateSnapshot.name}". You can resume anytime from the dashboard.`);
    }
    setActiveView('main');
    setCurrentTab('dashboard');
  };

  const handleExitPlayer = async () => {
    if (isRaceActive) {
      await saveCurrentRaceAndExit();
      addToast(`Saved progress for "${currentRun?.templateSnapshot.name}".`);
    }
    setActiveView('main');
  };

  const handleResumeSavedRace = (state: ActiveRunRuntimeState) => {
    resumeRace(state);
    setActiveView('player');
    addToast(`Resumed "${state.templateSnapshot.name}" from saved point.`);
  };

  const handleDiscardSavedRace = async (runId: string) => {
    await discardSavedRace(runId);
    addToast('Saved race progress discarded.');
  };

  const handleEditRace = (template: RaceTemplate) => {
    setEditingTemplate(template);
    setActiveView('editor');
  };

  const handleCreateRace = () => {
    setEditingTemplate(undefined);
    setActiveView('editor');
  };

  const handleSaveRace = async (template: RaceTemplate) => {
    await saveTemplate(template);
    setActiveView('main');
    addToast(`Saved "${template.name}" successfully.`);
  };

  const handleDuplicateRace = async (templateId: string) => {
    const dup = await duplicateTemplate(templateId);
    addToast(`Duplicated "${dup.name}".`);
  };

  const handleToggleArchiveRace = async (templateId: string) => {
    await toggleArchive(templateId);
    addToast('Race archive status updated.');
  };

  const handleConfirmDeleteRace = async () => {
    if (!deleteTarget) return;
    await deleteTemplate(deleteTarget.id);
    addToast(`Deleted "${deleteTarget.name}".`);
    setDeleteTarget(null);
  };

  const handleResumeInterrupted = (savedState: any) => {
    resumeInterrupted(savedState);
    setActiveView('player');
  };

  const handleRestartInterrupted = (savedState: any) => {
    initializeRun(savedState.templateSnapshot);
    setActiveView('player');
    start();
    discardInterrupted();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white theme-transition">
      {/* Top Header (visible unless in Player) */}
      {activeView !== 'player' && (
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setActiveView('main');
          }}
          onQuickStart={() => setIsQuickStartOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          isRaceActive={isRaceActive}
          savedRacesCount={activeSavedRaces.length}
          onReturnToActiveRace={() => {
            setActiveView('player');
            if (!isRaceActive && activeSavedRaces[0]) {
              resumeRace(activeSavedRaces[0]);
            }
          }}
          settings={settings}
          onUpdateSettings={updateSettings}
        />
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {/* INTERRUPTED RACE RESTORATION MODAL */}
        {interruptedState && activeView !== 'player' && (
          <InterruptionModal
            state={interruptedState}
            onResume={handleResumeInterrupted}
            onRestart={handleRestartInterrupted}
            onDiscard={discardInterrupted}
          />
        )}

        {/* ACTIVE VIEW: PLAYER */}
        {activeView === 'player' && tickData && currentRun && (
          <RacePlayer
            tickData={tickData}
            run={currentRun}
            onPlay={start}
            onPause={pause}
            onComplete={completeTask}
            onSkip={skipTask}
            onRestartTask={restartTask}
            onRestartRace={restartRace}
            onFinishRace={finishRace}
            onExitPlayer={handleExitPlayer}
            onSaveAndResumeLater={handleSaveAndResumeLater}
            expiredAlert={expiredNotification}
            keyboardShortcutsEnabled={settings.keyboardShortcutsEnabled}
            onAddSessionTask={addSessionTask}
            onToggleSessionTask={toggleSessionTask}
            onDeleteSessionTask={deleteSessionTask}
            onUpdateSessionTask={updateSessionTask}
            onClearCompletedSessionTasks={clearCompletedSessionTasks}
          />
        )}

        {/* ACTIVE VIEW: EDITOR */}
        {activeView === 'editor' && (
          <RaceEditor
            initialTemplate={editingTemplate}
            defaultTaskDuration={settings.defaultTaskDuration}
            onSave={handleSaveRace}
            onCancel={() => setActiveView('main')}
            onShowToast={addToast}
          />
        )}

        {/* ACTIVE VIEW: RESULTS */}
        {activeView === 'results' && viewingResultRun && (
          <RaceResults
            run={viewingResultRun}
            onRunAgain={(template) => {
              handleStartRace(template);
            }}
            onEditRace={(template) => {
              handleEditRace(template);
            }}
            onBackHome={() => {
              setActiveView('main');
              setCurrentTab('dashboard');
            }}
          />
        )}

        {/* ACTIVE VIEW: MAIN TABS */}
        {activeView === 'main' && (
          <>
            {currentTab === 'dashboard' && (
              <RaceDashboard
                templates={templates}
                runs={runs}
                savedRaces={activeSavedRaces}
                isRaceActive={isRaceActive}
                activeRaceName={currentRun?.templateSnapshot.name}
                activeRunId={currentRun?.id}
                onResumeActiveRace={() => setActiveView('player')}
                onResumeSavedRace={handleResumeSavedRace}
                onDiscardSavedRace={handleDiscardSavedRace}
                onCreateRace={handleCreateRace}
                onStartRace={handleStartRace}
                onEditRace={handleEditRace}
                onDuplicateRace={handleDuplicateRace}
                onToggleArchive={handleToggleArchiveRace}
                onDeleteRace={(id, name) => setDeleteTarget({ id, name })}
              />
            )}

            {currentTab === 'history' && (
              <RaceHistoryView
                runs={runs}
                onSelectRun={(run) => {
                  setViewingResultRun(run);
                  setActiveView('results');
                }}
                onRunAgain={handleStartRace}
                onDeleteRun={async (id) => {
                  await deleteRun(id);
                  addToast('Run history record deleted.');
                }}
                onClearAllRuns={async () => {
                  await clearAllRuns();
                  addToast('All race history cleared.');
                }}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={updateSettings}
                onResetSeedData={resetSeedData}
                onRefreshData={refresh}
                onShowToast={addToast}
              />
            )}
          </>
        )}
      </main>

      {/* QUICK START MODAL */}
      <QuickStartModal
        isOpen={isQuickStartOpen}
        onClose={() => setIsQuickStartOpen(false)}
        onStartRace={handleStartRace}
      />

      {/* SHORTCUTS MODAL */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* CONFIRM DELETE RACE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Race Template?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Any past historical runs from this race will be preserved.`}
        isDestructive
        confirmText="Delete Race"
        onConfirm={handleConfirmDeleteRace}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* CONFIRM RESUME OR START FRESH FOR TEMPLATE WITH EXISTING SAVED PROGRESS */}
      <ConfirmDialog
        isOpen={Boolean(existingSavedPrompt)}
        title="Saved Progress Found"
        message={`You have saved progress for "${existingSavedPrompt?.template.name}" at Task ${(existingSavedPrompt?.savedState.currentTaskIndex || 0) + 1}. Would you like to resume where you left off, or start a brand new run from the beginning?`}
        confirmText="Resume Saved Progress"
        cancelText="Start Fresh"
        onConfirm={() => {
          if (existingSavedPrompt) {
            handleResumeSavedRace(existingSavedPrompt.savedState);
            setExistingSavedPrompt(null);
          }
        }}
        onCancel={async () => {
          if (existingSavedPrompt) {
            await discardSavedRace(existingSavedPrompt.savedState.runId);
            startNewRaceDirectly(existingSavedPrompt.template);
            setExistingSavedPrompt(null);
          }
        }}
      />

      {/* CONFIRM SAVE CURRENT ACTIVE RACE WHEN SWITCHING TO ANOTHER RACE */}
      <ConfirmDialog
        isOpen={Boolean(activeRaceSwitchPrompt)}
        title="Active Race in Progress"
        message={`"${currentRun?.templateSnapshot.name}" is currently active. Would you like to save its progress so you can resume it later and start "${activeRaceSwitchPrompt?.newTemplate.name}"?`}
        confirmText="Save Progress & Start New"
        cancelText="Discard Current & Start"
        onConfirm={async () => {
          if (activeRaceSwitchPrompt) {
            await saveCurrentRaceAndExit();
            addToast(`Saved progress for "${currentRun?.templateSnapshot.name}".`);
            startNewRaceDirectly(activeRaceSwitchPrompt.newTemplate);
            setActiveRaceSwitchPrompt(null);
          }
        }}
        onCancel={async () => {
          if (activeRaceSwitchPrompt) {
            if (currentRun) await discardSavedRace(currentRun.id);
            startNewRaceDirectly(activeRaceSwitchPrompt.newTemplate);
            setActiveRaceSwitchPrompt(null);
          }
        }}
      />

      {/* TOAST CONTAINER */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
