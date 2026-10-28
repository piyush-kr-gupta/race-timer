import React, { useState, useMemo } from 'react';
import {
  RaceTemplate,
  RaceRun,
  AppSettings,
  RaceHabitMetric,
  DailyHabitActivity,
} from '../../types/race';
import {
  calculateRaceHabits,
  calculateDailyActivities,
  calculateHabitSummary,
  calculateDaysPassed,
} from '../../utils/habitAnalytics';
import { getLocalDateKey } from '../../utils/dateUtils';
import { formatDurationHuman, formatTime } from '../../utils/duration';
import {
  Activity,
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Clock,
  Play,
  Search,
  Settings as SettingsIcon,
  BarChart3,
  CalendarCheck,
} from 'lucide-react';

interface HabitTrackerDashboardProps {
  templates: RaceTemplate[];
  runs: RaceRun[];
  settings: AppSettings;
  onStartRace: (template: RaceTemplate) => void;
  onToggleDoneToday: (templateId: string, isCurrentlyDone: boolean) => void;
  onNavigateToSettings?: () => void;
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
}

export const HabitTrackerDashboard: React.FC<HabitTrackerDashboardProps> = ({
  templates,
  runs,
  settings,
  onStartRace,
  onToggleDoneToday,
  onNavigateToSettings,
}) => {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const startDateStr = settings.habitTrackerStartDate || '2026-10-01';

  // State controls
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [graphMetric, setGraphMetric] = useState<'races' | 'time'>('races');
  const [graphRangeDays, setGraphRangeDays] = useState<number>(30); // 14, 30, or all
  const [hoveredDay, setHoveredDay] = useState<DailyHabitActivity | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailyHabitActivity | null>(null);

  // Calculate habit metrics
  const daysPassed = useMemo(
    () => calculateDaysPassed(startDateStr, todayKey),
    [startDateStr, todayKey]
  );

  const metrics: RaceHabitMetric[] = useMemo(
    () => calculateRaceHabits(templates, runs, startDateStr, todayKey),
    [templates, runs, startDateStr, todayKey]
  );

  const summary = useMemo(
    () => calculateHabitSummary(metrics),
    [metrics]
  );

  // Daily activities for interactive graph and heatmap
  const allDailyActivities = useMemo(
    () => calculateDailyActivities(templates, runs, startDateStr, todayKey),
    [templates, runs, startDateStr, todayKey]
  );

  // Filtered daily activities for trend graph
  const graphActivities = useMemo(() => {
    if (graphRangeDays === 0 || graphRangeDays >= allDailyActivities.length) {
      return allDailyActivities;
    }
    return allDailyActivities.slice(-graphRangeDays);
  }, [allDailyActivities, graphRangeDays]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category && !t.isArchived) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [templates]);

  // Filtered metrics for habit cards
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      if (m.isArchived) return false;
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(query);
        const matchCategory = m.category.toLowerCase().includes(query);
        const matchTag = m.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchName && !matchCategory && !matchTag) return false;
      }
      return true;
    });
  }, [metrics, selectedCategory, searchQuery]);

  // SVG Chart Calculations
  const maxGraphValue = useMemo(() => {
    if (graphMetric === 'races') {
      const maxCount = Math.max(...graphActivities.map((d) => d.completedRacesCount), 1);
      return Math.max(maxCount, 3);
    } else {
      const maxSecs = Math.max(...graphActivities.map((d) => d.totalSeconds), 60);
      return Math.max(maxSecs, 3600); // at least 1 hour
    }
  }, [graphActivities, graphMetric]);

  const svgHeight = 160;
  const svgPadding = 24;

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header & Start Date Anchor Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-orange-400" />
            <span>Habit Tracker & Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track race consistency, continuous streaks, and execution volume over time.
          </p>
        </div>

        {/* Start Date Indicator & Quick Settings Link */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>
              Tracking from <strong className="text-slate-100">{startDateStr}</strong> ({daysPassed} days elapsed)
            </span>
          </div>
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              title="Change Habit Tracker Start Date in Settings"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition cursor-pointer"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Configure</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Consistency Rate */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Overall Consistency</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">{summary.overallConsistencyRate}%</span>
            <span className="text-xs text-slate-400">avg across races</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.overallConsistencyRate)}%` }}
            />
          </div>
        </div>

        {/* Longest Active Streak */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Longest Active Streak</span>
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-400">{summary.maxCurrentStreak}</span>
            <span className="text-xs text-slate-400">consecutive days 🔥</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Best historical streak: <strong className="text-slate-200">{summary.bestHistoricalStreak} days</strong>
          </div>
        </div>

        {/* Races Completed Today */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Races Done Today</span>
            <CalendarCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">{summary.racesDoneTodayCount}</span>
            <span className="text-xs text-slate-400">/ {summary.activeRaces} active races</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            {summary.racesDoneTodayCount === summary.activeRaces && summary.activeRaces > 0 ? (
              <span className="text-emerald-400 font-semibold">All races completed today! 🎉</span>
            ) : (
              <span>{summary.activeRaces - summary.racesDoneTodayCount} remaining for today</span>
            )}
          </div>
        </div>

        {/* Total Focus Time */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Focus Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-100">
              {formatDurationHuman(summary.totalFocusSeconds)}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Total completed runs: <strong className="text-slate-200">{summary.totalRunsCompleted} runs</strong>
          </div>
        </div>
      </div>

      {/* Interactive Trend Chart Section */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-400" />
              <span>Daily Habit Consistency Trend</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hover over any day bar to view completed races and focus duration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setGraphMetric('races')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  graphMetric === 'races'
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Races
              </button>
              <button
                onClick={() => setGraphMetric('time')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  graphMetric === 'time'
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Focus Time
              </button>
            </div>

            {/* Range Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setGraphRangeDays(14)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  graphRangeDays === 14 ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
                }`}
              >
                14d
              </button>
              <button
                onClick={() => setGraphRangeDays(30)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  graphRangeDays === 30 ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
                }`}
              >
                30d
              </button>
              <button
                onClick={() => setGraphRangeDays(0)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  graphRangeDays === 0 ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="relative w-full pt-2">
          {graphActivities.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-500 text-xs">
              No activity recorded for this period yet.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div style={{ minWidth: Math.max(500, graphActivities.length * 18) }}>
                <svg
                  className="w-full overflow-visible"
                  height={svgHeight}
                  viewBox={`0 0 ${graphActivities.length * 24 + 40} ${svgHeight}`}
                >
                  {/* Grid Lines */}
                  {[0, 0.33, 0.66, 1].map((pct, i) => {
                    const y = svgPadding + (1 - pct) * (svgHeight - svgPadding * 2);
                    const label =
                      graphMetric === 'races'
                        ? Math.round(pct * maxGraphValue)
                        : formatTime(Math.round(pct * maxGraphValue));
                    return (
                      <g key={i}>
                        <line
                          x1={30}
                          y1={y}
                          x2={graphActivities.length * 24 + 35}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={24}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill="#64748b"
                          fontFamily="sans-serif"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {graphActivities.map((act, idx) => {
                    const value =
                      graphMetric === 'races' ? act.completedRacesCount : act.totalSeconds;
                    const chartHeight = svgHeight - svgPadding * 2;
                    const barHeight = Math.max(
                      value > 0 ? 6 : 0,
                      Math.round((value / maxGraphValue) * chartHeight)
                    );
                    const x = 36 + idx * 24;
                    const y = svgHeight - svgPadding - barHeight;
                    const isToday = act.dateKey === todayKey;
                    const isHovered = hoveredDay?.dateKey === act.dateKey;

                    return (
                      <g
                        key={act.dateKey}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredDay(act)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => setSelectedDayDetail(act)}
                      >
                        {/* Interactive Click Area */}
                        <rect
                          x={x - 4}
                          y={svgPadding}
                          width={20}
                          height={chartHeight}
                          fill="transparent"
                        />

                        {/* Background subtle column indicator */}
                        {isHovered && (
                          <rect
                            x={x - 2}
                            y={svgPadding}
                            width={16}
                            height={chartHeight}
                            fill="#334155"
                            opacity={0.3}
                            rx={3}
                          />
                        )}

                        {/* Foreground Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={12}
                          height={barHeight}
                          rx={3}
                          className={`transition-all duration-300 ${
                            value === 0
                              ? 'fill-slate-800'
                              : isHovered
                              ? 'fill-orange-400'
                              : isToday
                              ? 'fill-amber-400'
                              : 'fill-orange-500'
                          }`}
                        />

                        {/* Date Label (Every few ticks or when hovered/today) */}
                        {(idx % 5 === 0 || isToday || isHovered) && (
                          <text
                            x={x + 6}
                            y={svgHeight - 6}
                            textAnchor="middle"
                            fontSize="8"
                            fill={isToday ? '#f59e0b' : '#64748b'}
                            fontWeight={isToday ? 'bold' : 'normal'}
                          >
                            {act.dateKey.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Interactive Floating Tooltip */}
          {hoveredDay && (
            <div className="mt-2 p-3 bg-slate-950/95 border border-slate-700/80 rounded-xl shadow-xl flex items-center justify-between text-xs transition animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  {hoveredDay.completedRacesCount}
                </div>
                <div>
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    <span>{hoveredDay.dateKey}</span>
                    {hoveredDay.dateKey === todayKey && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded font-semibold">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {hoveredDay.completedRacesCount === 0
                      ? 'No races completed on this day.'
                      : `Completed: ${hoveredDay.raceNames.join(', ')}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-200">
                  {formatDurationHuman(hoveredDay.totalSeconds)}
                </span>
                <div className="text-[10px] text-slate-500">{hoveredDay.totalRunsCount} total runs</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GitHub-style Contribution Heatmap Matrix */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Activity Heatmap</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily habit completion matrix since start date.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-950/80 border border-emerald-800/40" />
            <div className="w-3 h-3 rounded-sm bg-emerald-800 border border-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-400" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="flex flex-wrap gap-1.5 min-w-[500px]">
            {allDailyActivities.map((day) => {
              const count = day.completedRacesCount;
              const isToday = day.dateKey === todayKey;
              let bg = 'bg-slate-900 border-slate-800';
              if (count === 1) bg = 'bg-emerald-950/90 border-emerald-800/60 text-emerald-300';
              else if (count === 2) bg = 'bg-emerald-800 border-emerald-700 text-emerald-100';
              else if (count >= 3) bg = 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold';

              return (
                <button
                  key={day.dateKey}
                  onClick={() => setSelectedDayDetail(day)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={`${day.dateKey}: ${count} race(s) completed (${formatDurationHuman(
                    day.totalSeconds
                  )})`}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-[10px] transition-all cursor-pointer hover:scale-110 ${bg} ${
                    isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950' : ''
                  }`}
                >
                  {count > 0 ? count : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Race Habit Cards Section */}
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap min-h-[36px] ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Categories ({metrics.filter((m) => !m.isArchived).length})
            </button>
            {categories.map((cat) => {
              const count = metrics.filter((m) => !m.isArchived && m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap min-h-[36px] ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search races..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 min-h-[38px]"
            />
          </div>
        </div>

        {/* Cards Grid */}
        {filteredMetrics.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
            No race habits found matching your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMetrics.map((metric) => {
              const template = templates.find((t) => t.id === metric.templateId);

              return (
                <div
                  key={metric.templateId}
                  className={`bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between transition hover:border-slate-700 ${
                    metric.isDoneToday
                      ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                      : 'border-slate-800/80'
                  }`}
                >
                  <div>
                    {/* Top Row: Category badge & Done Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {metric.category}
                      </span>

                      {metric.isDoneToday ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Done Today</span>
                        </span>
                      ) : metric.currentStreak > 0 ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
                          <span>⏳ Pending Today</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          Not completed today
                        </span>
                      )}
                    </div>

                    {/* Race Title */}
                    <h3 className="text-base font-bold text-slate-100 mt-2.5">
                      {metric.name}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {metric.taskCount} tasks • {formatDurationHuman(metric.totalAllocatedSeconds)} allocated
                    </div>

                    {/* Done / Days Passed Highlight */}
                    <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">Consistency Ratio</div>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-orange-400">
                            {metric.doneDaysCount}
                          </span>
                          <span className="text-slate-400 text-xs">/ {metric.daysPassed} days</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 font-bold text-xs rounded-lg border border-orange-500/30">
                          {metric.completionRate}%
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {metric.totalRunsCount} total runs
                        </div>
                      </div>
                    </div>

                    {/* Consistency Progress Bar */}
                    <div className="mt-2.5 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/60">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${metric.completionRate}%` }}
                      />
                    </div>

                    {/* Streak Counters & 7-Day Sparkline */}
                    <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      {/* Streak Counters */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-1 font-bold ${
                            metric.currentStreak > 0 ? 'text-orange-400' : 'text-slate-500'
                          }`}
                        >
                          <Flame
                            className={`w-4 h-4 ${
                              metric.isDoneToday ? 'text-orange-400 fill-orange-400 animate-bounce' : ''
                            }`}
                          />
                          <span>{metric.currentStreak}d streak</span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Best: {metric.bestStreak}d</span>
                        </div>
                      </div>

                      {/* 7-Day Sparkline Dots */}
                      <div className="flex items-center gap-1" title="Last 7 calendar days">
                        {metric.recent7Days.map((dot) => (
                          <div
                            key={dot.dateKey}
                            title={`${dot.dateKey}: ${dot.completed ? 'Done' : 'Missed'}`}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              dot.completed
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                : 'bg-slate-800 border border-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    {/* Mark Done Today Toggle Button */}
                    <button
                      onClick={() => onToggleDoneToday(metric.templateId, metric.isDoneToday)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] ${
                        metric.isDoneToday
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{metric.isDoneToday ? 'Marked Done' : 'Mark Done Today'}</span>
                    </button>

                    {/* Start Race Button */}
                    {template && (
                      <button
                        onClick={() => onStartRace(template)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[38px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Detail Modal/Drawer if clicked from Heatmap */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                <span>Activity on {selectedDayDetail.dateKey}</span>
              </h3>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="text-slate-400 hover:text-slate-200 p-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Completed Races</span>
                <span className="font-bold text-slate-100">{selectedDayDetail.completedRacesCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Total Focus Time</span>
                <span className="font-bold text-slate-100">
                  {formatDurationHuman(selectedDayDetail.totalSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Total Run Sessions</span>
                <span className="font-bold text-slate-100">{selectedDayDetail.totalRunsCount}</span>
              </div>

              {selectedDayDetail.raceNames.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-400 mb-2">Races Completed:</div>
                  <ul className="space-y-1.5">
                    {selectedDayDetail.raceNames.map((name, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-200 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
