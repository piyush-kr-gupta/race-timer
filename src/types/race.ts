export type TimerState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'WARNING'
  | 'OVERTIME'
  | 'TASK_COMPLETED'
  | 'TASK_SKIPPED'
  | 'TASK_EXPIRED'
  | 'RACE_COMPLETED'
  | 'RACE_CANCELLED';

export type TaskStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'expired';

export type RunStatus = 'running' | 'paused' | 'completed' | 'abandoned';

export interface Task {
  id: string;
  name: string;
  durationSeconds: number;
  notes?: string;
  order: number;
  enabled: boolean;
  color?: string;
  icon?: string;
}

export interface RaceTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  tasks: Task[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  isArchived?: boolean;
  isSample?: boolean;
  manualDoneDate?: string; // Local date 'YYYY-MM-DD' when explicitly marked as done for today
  manualActiveDate?: string; // Local date 'YYYY-MM-DD' when explicitly restored to active for today
  settings?: {
    autoAdvance?: boolean;
    allowOvertime?: boolean;
    warningThresholds?: number[];
    countdownWarningThreshold?: number; // e.g. 10, 15, or 0
  };
}

export interface TaskRunEvent {
  type: 'start' | 'pause' | 'resume' | 'complete' | 'skip' | 'expire';
  timestamp: string; // ISO
  elapsedMsAtEvent?: number;
}

export interface TaskRun {
  taskId: string;
  taskSnapshot: Task;
  allocatedSeconds: number;
  actualSeconds: number;
  overtimeSeconds: number;
  startedAt?: string; // ISO
  completedAt?: string; // ISO
  status: TaskStatus;
  events: TaskRunEvent[];
}

export interface SessionTaskItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO
  completedAt?: string; // ISO
}

export interface RaceRun {
  id: string;
  templateId: string;
  templateSnapshot: RaceTemplate;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  status: RunStatus;
  totalAllocatedSeconds: number;
  totalActualSeconds: number;
  totalOvertimeSeconds: number;
  totalPausedSeconds: number;
  taskRuns: TaskRun[];
  sessionTasks?: SessionTaskItem[];
}

export interface ActiveRunRuntimeState {
  runId: string;
  templateId: string;
  currentTaskIndex: number;
  timerState: TimerState;
  
  // High-precision timestamps (ms epoch)
  taskStartedAt: number;
  taskPausedAt: number | null;
  taskAccumulatedPausedMs: number;
  
  raceStartedAt: number;
  racePausedAt: number | null;
  raceAccumulatedPausedMs: number;

  lastTickTimestamp: number;
  taskRuns: TaskRun[];
  templateSnapshot: RaceTemplate;
  sessionTasks?: SessionTaskItem[];
  savedAt?: string; // ISO string when explicitly saved
  isExplicitlySaved?: boolean; // Flag to distinguish intentional saves from background auto-saves
}

export interface AppSettings {
  defaultTaskDuration: number; // e.g. 300
  autoAdvance: boolean;
  allowOvertime: boolean;
  autoStartNext: boolean;
  countdownMode: 'down' | 'up';
  timerUpdateFrequencyMs: number;
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  warningSoundEnabled: boolean;
  completionSoundEnabled: boolean;
  ttsTaskNameEnabled: boolean; // Announce task name with Text-to-Speech when a new task starts
  browserNotificationsEnabled: boolean;
  warningThresholds: number[]; // seconds e.g. [300, 120, 60, 30]
  countdownWarningThreshold: number; // e.g. 10 or 15 or 0 (disabled), triggers gentle warning every second down to 1s
  theme: 'system' | 'dark' | 'light';
  largeTimerMode: boolean;
  compactMode: boolean;
  keyboardShortcutsEnabled: boolean;
  wakeLockEnabled: boolean;
  tabTitleTimerEnabled: boolean; // Display remaining timer in Chrome tab title (MM:SS)
  dashboardSortBy: RaceSortOption; // Persistent sort preference in dashboard
  skipConfirmations: Record<string, boolean>; // e.g. { deleteRace: false, deleteTask: false }
  lastBackupAt: string | null;
  // 9 PM Deadline Accountability
  accountabilityEnabled: boolean;
  accountabilityCutoffTime: string; // e.g. '21:00' (24-hour HH:MM)
  accountabilityPledgeMessage: string;
  apologyLog: ApologyEntry[];
  // Habit Tracker
  habitTrackerStartDate?: string; // e.g. 'YYYY-MM-DD' reference start date
}

export interface ApologyEntry {
  id: string;
  dateKey: string; // 'YYYY-MM-DD'
  timestamp: string; // ISO
  message: string;
  pendingRaceNames: string[];
  pendingRaceCount: number;
}

export type RaceSortOption = 'updated' | 'name' | 'duration-desc' | 'duration-asc';

export interface BackupExportData {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  raceTemplates: RaceTemplate[];
  raceRuns: RaceRun[];
  settings: AppSettings;
  activeStates?: ActiveRunRuntimeState[];
}

export type ImportMode = 'merge' | 'replace';

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  templatesCount: number;
  runsCount: number;
  hasSettings: boolean;
  parsedData?: BackupExportData;
}

// ===================== HABIT TRACKER ANALYTICS =====================

export interface RaceHabitMetric {
  templateId: string;
  name: string;
  category: string;
  tags: string[];
  taskCount: number;
  totalAllocatedSeconds: number;
  doneDaysCount: number;      // unique calendar days completed
  daysPassed: number;         // days elapsed since habit tracker start date
  completionRate: number;     // % consistency (0 - 100)
  totalRunsCount: number;     // total completed runs in window
  totalActualSeconds: number; // total time spent in seconds
  currentStreak: number;      // active streak in days
  bestStreak: number;         // all-time best streak in days
  isDoneToday: boolean;       // completed or marked done today
  recent7Days: { dateKey: string; completed: boolean }[];
  lastCompletedDate?: string;
  isArchived: boolean;
}

export interface DailyHabitActivity {
  dateKey: string;            // 'YYYY-MM-DD'
  completedRacesCount: number;
  totalRunsCount: number;
  totalSeconds: number;
  raceNames: string[];
}

export interface HabitTrackerSummary {
  totalRaces: number;
  activeRaces: number;
  overallConsistencyRate: number;
  maxCurrentStreak: number;
  bestHistoricalStreak: number;
  totalRunsCompleted: number;
  totalFocusSeconds: number;
  racesDoneTodayCount: number;
}
