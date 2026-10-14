import React, { useState, useEffect, useMemo } from 'react';
import { RaceTemplate, RaceRun, ActiveRunRuntimeState, RaceSortOption } from '../../types/race';
import { TimerTickData } from '../../services/timer/timerEngine';
import { isRunFullyCompleted } from '../../services/storage/indexedDb';
import { RaceCard } from './RaceCard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatTime, formatDurationHuman } from '../../utils/duration';
import { isTemplateDoneToday } from '../../utils/dateUtils';
import { useCurrentDay } from '../../hooks/useCurrentDay';
import { Plus, Search, Play, Sparkles, BookmarkCheck, Trash2, CheckCircle2, Trophy, Clock } from 'lucide-react';

export const DASHBOARD_SORT_STORAGE_KEY = 'race_timer_dashboard_sort';

export function getTemplateAllocatedSeconds(template: RaceTemplate): number {
  const enabledTasks = template.tasks.filter((t) => t.enabled);
  const tasks = enabledTasks.length > 0 ? enabledTasks : template.tasks;
  return tasks.reduce((sum, t) => sum + t.durationSeconds, 0);
}

export function calculateSavedRaceRemainingSeconds(
  state: ActiveRunRuntimeState,
  isCurrentActive: boolean,
  activeTickData?: TimerTickData | null
): number {
  if (isCurrentActive && activeTickData) {
    return Math.max(0, activeTickData.raceRemainingSeconds);
  }
  const enabledTasks = state.templateSnapshot.tasks.filter((t) => t.enabled);
  const tasksForTotal = enabledTasks.length > 0 ? enabledTasks : state.templateSnapshot.tasks;
  const totalAllocated = tasksForTotal.reduce((sum, t) => sum + t.durationSeconds, 0);

  const now = Date.now();
  const raceCurrentPaused = state.racePausedAt !== null ? now - state.racePausedAt : 0;
  const totalRacePausedMs = state.raceAccumulatedPausedMs + raceCurrentPaused;
  const rawRaceElapsedMs = state.raceStartedAt > 0
    ? Math.max(0, now - state.raceStartedAt - totalRacePausedMs)
    : 0;
  const raceElapsed = Math.floor(rawRaceElapsedMs / 1000);
  return Math.max(0, totalAllocated - raceElapsed);
}

interface RaceDashboardProps {
  templates: RaceTemplate[];
  runs: RaceRun[];
  savedRaces?: ActiveRunRuntimeState[];
  isRaceActive: boolean;
  activeRaceName?: string;
  activeRunId?: string;
  activeTickData?: TimerTickData | null;
  sortBy?: RaceSortOption;
  onSortByChange?: (newSort: RaceSortOption) => void;
  onResumeActiveRace?: () => void;
  onResumeSavedRace?: (state: ActiveRunRuntimeState) => void;
  onDiscardSavedRace?: (runId: string) => void;
  onCreateRace: () => void;
  onStartRace: (template: RaceTemplate) => void;
  onEditRace: (template: RaceTemplate) => void;
  onDuplicateRace: (templateId: string) => void;
  onToggleArchive: (templateId: string) => void;
  onDeleteRace: (templateId: string, name: string) => void;
  onToggleDoneToday?: (templateId: string, isCurrentlyDone: boolean) => void;
}

export const RaceDashboard: React.FC<RaceDashboardProps> = ({
  templates,
  runs,
  savedRaces = [],
  isRaceActive,
  activeRaceName,
  activeRunId,
  activeTickData,
  sortBy: propSortBy,
  onSortByChange,
  onResumeActiveRace,
  onResumeSavedRace,
  onDiscardSavedRace,
  onCreateRace,
  onStartRace,
  onEditRace,
  onDuplicateRace,
  onToggleArchive,
  onDeleteRace,
  onToggleDoneToday,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'done-today' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<RaceSortOption>(() => {
    if (propSortBy) return propSortBy;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY);
        if (saved === 'updated' || saved === 'name' || saved === 'duration-desc' || saved === 'duration-asc') {
          return saved as RaceSortOption;
        }
      }
    } catch {}
    return 'updated';
  });

  // Keep state in sync if prop changes from external settings
  useEffect(() => {
    if (propSortBy && propSortBy !== sortBy) {
      setSortBy(propSortBy);
    }
  }, [propSortBy]);

  const handleSortChange = (newSort: RaceSortOption) => {
    setSortBy(newSort);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DASHBOARD_SORT_STORAGE_KEY, newSort);
      }
    } catch {}
    onSortByChange?.(newSort);
  };

  const todayKey = useCurrentDay();
  const [discardTarget, setDiscardTarget] = useState<{ runId: string; name: string } | null>(null);

  // Filter out any completed races from saved runs
  const activeSavedRaces = useMemo(() => {
    return savedRaces.filter((s) => !isRunFullyCompleted(s));
  }, [savedRaces]);

  // Collect unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [templates]);

  // Map saved races by templateId
  const savedRacesByTemplateId = useMemo(() => {
    const map = new Map<string, ActiveRunRuntimeState>();
    for (const s of activeSavedRaces) {
      if (!map.has(s.templateId)) {
        map.set(s.templateId, s);
      }
    }
    return map;
  }, [activeSavedRaces]);

  // Map latest run for each template
  const latestRunsByTemplate = useMemo(() => {
    const map = new Map<string, RaceRun>();
    for (const run of runs) {
      if (!map.has(run.templateId)) {
        map.set(run.templateId, run);
      }
    }
    return map;
  }, [runs]);

  // Map Done for Today status for each template
  const isDoneTodayMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const t of templates) {
      map.set(t.id, isTemplateDoneToday(t, runs, todayKey));
    }
    return map;
  }, [templates, runs, todayKey]);

  // Tab counts
  const activeCount = useMemo(() => {
    return templates.filter((t) => !t.isArchived && !isDoneTodayMap.get(t.id)).length;
  }, [templates, isDoneTodayMap]);

  const doneTodayCount = useMemo(() => {
    return templates.filter((t) => !t.isArchived && isDoneTodayMap.get(t.id)).length;
  }, [templates, isDoneTodayMap]);

  const archivedCount = useMemo(() => {
    return templates.filter((t) => t.isArchived).length;
  }, [templates]);

  const allCount = templates.length;

  // Filtered & sorted templates
  const filteredTemplates = useMemo(() => {
    return templates
      .filter((t) => {
        const isDoneToday = Boolean(isDoneTodayMap.get(t.id));

        // Tab mode filter
        if (filterMode === 'active') {
          if (t.isArchived || isDoneToday) return false;
        } else if (filterMode === 'done-today') {
          if (t.isArchived || !isDoneToday) return false;
        } else if (filterMode === 'archived') {
          if (!t.isArchived) return false;
        }
        // 'all' includes all templates

        // Category filter
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = t.name.toLowerCase().includes(q);
          const descMatch = (t.description || '').toLowerCase().includes(q);
          const catMatch = (t.category || '').toLowerCase().includes(q);
          const tagMatch = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
          const taskMatch = t.tasks.some((task) => task.name.toLowerCase().includes(q));
          if (!nameMatch && !descMatch && !catMatch && !tagMatch && !taskMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'duration-desc') {
          const durA = a.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          const durB = b.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          return durB - durA;
        }
        if (sortBy === 'duration-asc') {
          const durA = a.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          const durB = b.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          return durA - durB;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [templates, searchQuery, selectedCategory, filterMode, sortBy, isDoneTodayMap]);

  // Total accumulated time for the currently selected tab & filters
  const accumulatedSeconds = useMemo(() => {
    return filteredTemplates.reduce((sum, template) => {
      if (filterMode === 'active') {
        const savedState = savedRacesByTemplateId.get(template.id);
        if (savedState) {
          const isCurrentActive = isRaceActive && activeRunId === savedState.runId;
          return sum + calculateSavedRaceRemainingSeconds(savedState, isCurrentActive, activeTickData);
        }
        return sum + getTemplateAllocatedSeconds(template);
      }
      // For 'all', 'done-today', 'archived', show the total accumulated duration of the races
      return sum + getTemplateAllocatedSeconds(template);
    }, 0);
  }, [filteredTemplates, filterMode, savedRacesByTemplateId, isRaceActive, activeRunId, activeTickData]);

  const accumulatedTimeLabel = useMemo(() => {
    switch (filterMode) {
      case 'active':
        return 'Pending Time';
      case 'done-today':
        return 'Done Today';
      case 'archived':
        return 'Archived Time';
      case 'all':
        return 'Total Time';
    }
  }, [filterMode]);

  const timeBadgeColor = filterMode === 'done-today' ? 'text-emerald-400' : 'text-orange-400';

  return (
    <div className="space-y-6 pb-12">
      {/* IN-PROGRESS / SAVED RACES SECTION */}
      {activeSavedRaces.length > 0 ? (
        <div className="bg-slate-900/90 border border-orange-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>In-Progress & Saved Races</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    {activeSavedRaces.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Switch back and resume any saved race right from where you left off.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeSavedRaces.map((state) => {
              const currentTask = state.templateSnapshot.tasks[state.currentTaskIndex];
              const completedCount = state.taskRuns.filter(
                (t) => t.status === 'completed' || t.status === 'expired'
              ).length;
              const totalTasks = state.templateSnapshot.tasks.filter((t) => t.enabled).length || state.templateSnapshot.tasks.length;
              const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

              const isCurrentActive = isRaceActive && activeRunId === state.runId;

              // Calculate total race remaining time accurately
              let totalRemaining = 0;
              let totalOvertime = 0;

              if (isCurrentActive && activeTickData) {
                totalRemaining = activeTickData.raceRemainingSeconds;
                totalOvertime = activeTickData.raceOvertimeSeconds;
              } else {
                const enabledTasks = state.templateSnapshot.tasks.filter((t) => t.enabled);
                const tasksForTotal = enabledTasks.length > 0 ? enabledTasks : state.templateSnapshot.tasks;
                const totalAllocated = tasksForTotal.reduce((sum, t) => sum + t.durationSeconds, 0);

                const now = Date.now();
                const raceCurrentPaused = state.racePausedAt !== null ? now - state.racePausedAt : 0;
                const totalRacePausedMs = state.raceAccumulatedPausedMs + raceCurrentPaused;
                const rawRaceElapsedMs = state.raceStartedAt > 0
                  ? Math.max(0, now - state.raceStartedAt - totalRacePausedMs)
                  : 0;
                const raceElapsed = Math.floor(rawRaceElapsedMs / 1000);

                totalRemaining = Math.max(0, totalAllocated - raceElapsed);
                totalOvertime = Math.max(0, raceElapsed - totalAllocated);
              }

              return (
                <div
                  key={state.runId}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {state.templateSnapshot.name}
                      </span>
                      {isCurrentActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Live Now
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                          ⏸ Saved
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="text-orange-400 font-medium truncate">
                        Task {state.currentTaskIndex + 1}/{totalTasks}: {currentTask?.name || 'Task'}
                      </span>
                      <span className="font-mono text-slate-300 shrink-0 ml-2">
                        {totalOvertime > 0
                          ? `+${formatTime(totalOvertime)} overtime`
                          : `${formatTime(totalRemaining)} remaining`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                      <span>{completedCount} of {totalTasks} tasks complete ({pct}%)</span>
                      {state.savedAt && (
                        <span>Saved {new Date(state.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => onResumeSavedRace ? onResumeSavedRace(state) : onResumeActiveRace?.()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer min-h-[36px]"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Resume Race</span>
                    </button>
                    <button
                      onClick={() => setDiscardTarget({ runId: state.runId, name: state.templateSnapshot.name })}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Discard saved run"
                      aria-label="Discard saved run"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : isRaceActive ? (
        /* Live Active Race Alert Banner (if no saved races list) */
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-950/80 via-amber-950/60 to-slate-900 border border-orange-500/40 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <div>
              <h4 className="text-sm font-bold text-orange-200">
                Active Race in Progress
              </h4>
              <p className="text-xs text-slate-300 font-medium">
                {activeRaceName || 'A race'} is running right now.
              </p>
            </div>
          </div>
          <button
            onClick={onResumeActiveRace}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer min-h-[40px]"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Resume Race
          </button>
        </div>
      ) : null}

      {/* Main Bar: Search, Category, Sorting & Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search races, tasks, categories..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter races by category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              aria-label="Sort races by"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as RaceSortOption)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px] cursor-pointer"
            >
              <option value="updated">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
              <option value="duration-desc">Duration (Longest)</option>
              <option value="duration-asc">Duration (Shortest)</option>
            </select>
          </div>

          {/* Create Race Button */}
          <button
            onClick={onCreateRace}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Race</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Active vs Done for Today vs Archived vs All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium flex-wrap">
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'active'
                ? 'bg-slate-800 text-orange-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Active</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-900/80 text-slate-300 border border-slate-700/50">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setFilterMode('done-today')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'done-today'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Done for Today</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] border ${
                doneTodayCount > 0
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700/50'
              }`}
            >
              {doneTodayCount}
            </span>
          </button>
          <button
            onClick={() => setFilterMode('archived')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'archived'
                ? 'bg-slate-800 text-orange-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Archived</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-900/80 text-slate-300 border border-slate-700/50">
              {archivedCount}
            </span>
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-slate-800 text-orange-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-900/80 text-slate-300 border border-slate-700/50">
              {allCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-400 shrink-0 flex-wrap">
          <span>
            Showing {filteredTemplates.length} {filteredTemplates.length === 1 ? 'race' : 'races'}
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 font-medium shadow-sm"
            aria-label={`${accumulatedTimeLabel}: ${formatDurationHuman(accumulatedSeconds)}`}
          >
            <Clock className={`w-3.5 h-3.5 ${timeBadgeColor} shrink-0`} />
            <span>
              <span className="text-slate-400">{accumulatedTimeLabel}: </span>
              <strong className="text-slate-100 font-semibold font-mono">
                {formatDurationHuman(accumulatedSeconds)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Race Cards Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <RaceCard
              key={template.id}
              template={template}
              isDoneToday={Boolean(isDoneTodayMap.get(template.id))}
              lastRun={latestRunsByTemplate.get(template.id)}
              savedRun={savedRacesByTemplateId.get(template.id)}
              onStart={onStartRace}
              onResumeSaved={onResumeSavedRace}
              onEdit={onEditRace}
              onDuplicate={onDuplicateRace}
              onToggleArchive={onToggleArchive}
              onDelete={onDeleteRace}
              onToggleDoneToday={
                onToggleDoneToday
                  ? () => onToggleDoneToday(template.id, Boolean(isDoneTodayMap.get(template.id)))
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            {filterMode === 'done-today' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : filterMode === 'active' && doneTodayCount > 0 ? (
              <Trophy className="w-6 h-6 text-amber-400" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200">
              {searchQuery
                ? 'No races found'
                : filterMode === 'done-today'
                ? 'No races completed today yet'
                : filterMode === 'active' && doneTodayCount > 0
                ? 'All races completed for today! 🎉'
                : filterMode === 'archived'
                ? 'No archived races'
                : 'No races found'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No races match your search filters. Try a different query.'
                : filterMode === 'done-today'
                ? 'Complete a race from the Active tab and it will move here until tomorrow!'
                : filterMode === 'active' && doneTodayCount > 0
                ? 'Great work! You have completed all your active races today. They will automatically move back to Active when tomorrow arrives.'
                : filterMode === 'archived'
                ? 'Archived races will appear here. You can archive races you are not actively using.'
                : 'Create your first race template and start competing against your own clock.'}
            </p>
          </div>
          {filterMode === 'active' && doneTodayCount > 0 ? (
            <button
              onClick={() => setFilterMode('done-today')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              View Done for Today ({doneTodayCount})
            </button>
          ) : (
            <button
              onClick={onCreateRace}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create Race
            </button>
          )}
        </div>
      )}

      {/* Confirm Discard Saved Run Dialog */}
      <ConfirmDialog
        isOpen={Boolean(discardTarget)}
        title="Discard In-Progress Run?"
        message={`Are you sure you want to discard your saved progress for "${discardTarget?.name}"? This cannot be undone.`}
        isDestructive
        confirmText="Discard Run"
        onConfirm={() => {
          if (discardTarget) {
            onDiscardSavedRace?.(discardTarget.runId);
            setDiscardTarget(null);
          }
        }}
        onCancel={() => setDiscardTarget(null)}
      />
    </div>
  );
};
