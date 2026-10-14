import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaceDashboard, DASHBOARD_SORT_STORAGE_KEY } from './RaceDashboard';
import { RaceTemplate, RaceRun, ActiveRunRuntimeState } from '../../types/race';
import { TimerTickData } from '../../services/timer/timerEngine';
import { getLocalDateKey } from '../../utils/dateUtils';

const mockTemplate: RaceTemplate = {
  id: 'template-interview',
  name: 'System Design Interview',
  category: 'Career',
  tags: ['Interview'],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  tasks: [
    {
      id: 'task-1',
      name: 'Requirements Clarification',
      durationSeconds: 300, // 5 min
      order: 0,
      enabled: true,
    },
    {
      id: 'task-2',
      name: 'High-Level Architecture',
      durationSeconds: 900, // 15 min
      order: 1,
      enabled: true,
    },
  ],
};

function createMockSavedState(overrides?: Partial<ActiveRunRuntimeState>): ActiveRunRuntimeState {
  const now = 10000000;
  // Race started 60 seconds ago, paused immediately at 60s
  return {
    runId: 'run-saved-1',
    templateId: mockTemplate.id,
    currentTaskIndex: 0,
    timerState: 'PAUSED',
    taskStartedAt: now - 60000,
    taskPausedAt: now,
    taskAccumulatedPausedMs: 0,
    raceStartedAt: now - 60000,
    racePausedAt: now,
    raceAccumulatedPausedMs: 0,
    lastTickTimestamp: now,
    taskRuns: [
      {
        taskId: 'task-1',
        taskSnapshot: mockTemplate.tasks[0],
        allocatedSeconds: 300,
        actualSeconds: 60,
        overtimeSeconds: 0,
        status: 'active',
        events: [],
      },
      {
        taskId: 'task-2',
        taskSnapshot: mockTemplate.tasks[1],
        allocatedSeconds: 900,
        actualSeconds: 0,
        overtimeSeconds: 0,
        status: 'pending',
        events: [],
      },
    ],
    templateSnapshot: mockTemplate,
    savedAt: new Date(now).toISOString(),
    isExplicitlySaved: true,
    ...overrides,
  };
}

describe('RaceDashboard - In-Progress & Saved Races Total Time Remaining', () => {
  const defaultProps = {
    templates: [mockTemplate],
    runs: [],
    isRaceActive: false,
    onCreateRace: vi.fn(),
    onStartRace: vi.fn(),
    onEditRace: vi.fn(),
    onDuplicateRace: vi.fn(),
    onToggleArchive: vi.fn(),
    onDeleteRace: vi.fn(),
  };

  it('displays total race time remaining instead of remaining task duration for saved races', () => {
    // Total race duration is 300s + 900s = 1200s (20:00).
    // Task 1 has 60s elapsed, so total race remaining = 1200s - 60s = 1140s (19:00).
    // Meanwhile, current task 1 has 300s - 60s = 240s (04:00) remaining.
    const savedRun = createMockSavedState();

    render(
      <RaceDashboard
        {...defaultProps}
        savedRaces={[savedRun]}
      />
    );

    // Section header
    expect(screen.getByText('In-Progress & Saved Races')).toBeInTheDocument();

    // Must display total race remaining: 19:00 remaining
    expect(screen.getByText('19:00 remaining')).toBeInTheDocument();

    // Must NOT display remaining task duration (04:00 left or 04:00 remaining)
    expect(screen.queryByText('04:00 left')).not.toBeInTheDocument();
    expect(screen.queryByText('04:00 remaining')).not.toBeInTheDocument();
  });

  it('displays live total race time remaining when activeTickData is provided', () => {
    const savedRun = createMockSavedState({ runId: 'run-live-1' });

    const mockTickData = {
      raceRemainingSeconds: 750, // 12:30
      raceOvertimeSeconds: 0,
    } as TimerTickData;

    render(
      <RaceDashboard
        {...defaultProps}
        savedRaces={[savedRun]}
        isRaceActive={true}
        activeRunId="run-live-1"
        activeTickData={mockTickData}
      />
    );

    // Shows 12:30 remaining from active tick data
    expect(screen.getByText('12:30 remaining')).toBeInTheDocument();
  });

  it('displays overtime when race elapsed time exceeds total allocated time', () => {
    const savedRun = createMockSavedState({ runId: 'run-overtime-1' });

    const mockTickData = {
      raceRemainingSeconds: 0,
      raceOvertimeSeconds: 125, // 02:05
    } as TimerTickData;

    render(
      <RaceDashboard
        {...defaultProps}
        savedRaces={[savedRun]}
        isRaceActive={true}
        activeRunId="run-overtime-1"
        activeTickData={mockTickData}
      />
    );

    // Shows overtime: +02:05 overtime
    expect(screen.getByText('+02:05 overtime')).toBeInTheDocument();
  });

  describe('"Done for Today" Section & Daily Transition', () => {
    const workoutTemplate: RaceTemplate = {
      id: 'template-workout',
      name: 'HIIT Morning Routine',
      category: 'Fitness',
      tags: ['HIIT'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      tasks: [
        { id: 'wt-1', name: 'Warmup', durationSeconds: 300, order: 0, enabled: true },
      ],
      isArchived: false,
    };

    const studyTemplate: RaceTemplate = {
      id: 'template-study',
      name: 'Algorithm Deep Dive',
      category: 'Study',
      tags: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      tasks: [
        { id: 'st-1', name: 'Problem Solving', durationSeconds: 600, order: 0, enabled: true },
      ],
      isArchived: false,
    };

    const archivedTemplate: RaceTemplate = {
      id: 'template-archived',
      name: 'Old Routine',
      category: 'Misc',
      tags: [],
      tasks: [],
      isArchived: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    it('renders all 4 tabs (Active, Done for Today, Archived, All) with correct initial counts', () => {
      render(
        <RaceDashboard
          {...defaultProps}
          templates={[workoutTemplate, studyTemplate, archivedTemplate]}
          runs={[]}
        />
      );

      // Tab buttons exist
      expect(screen.getByRole('button', { name: /^Active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Done for Today/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Archived/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument();

      // Active: 2 unarchived races (none done today)
      // Done for Today: 0
      // Archived: 1
      // All: 3
      const activeTab = screen.getByRole('button', { name: /^Active/i });
      expect(activeTab).toHaveTextContent('2');

      const doneTodayTab = screen.getByRole('button', { name: /^Done for Today/i });
      expect(doneTodayTab).toHaveTextContent('0');

      const archivedTab = screen.getByRole('button', { name: /^Archived/i });
      expect(archivedTab).toHaveTextContent('1');

      const allTab = screen.getByRole('button', { name: /^All/i });
      expect(allTab).toHaveTextContent('3');

      // Both active templates are visible
      expect(screen.getByText('HIIT Morning Routine')).toBeInTheDocument();
      expect(screen.getByText('Algorithm Deep Dive')).toBeInTheDocument();
      // Archived template is not visible in Active tab
      expect(screen.queryByText('Old Routine')).not.toBeInTheDocument();
    });

    it('moves a race from Active to Done for Today once completed today', () => {
      const todayKey = getLocalDateKey();
      const completedRunToday: RaceRun = {
        id: 'run-workout-today',
        templateId: workoutTemplate.id,
        templateSnapshot: workoutTemplate,
        startedAt: `${todayKey}T08:00:00.000Z`,
        completedAt: `${todayKey}T08:15:00.000Z`,
        status: 'completed',
        totalAllocatedSeconds: 300,
        totalActualSeconds: 290,
        totalOvertimeSeconds: 0,
        totalPausedSeconds: 0,
        taskRuns: [],
      };

      render(
        <RaceDashboard
          {...defaultProps}
          templates={[workoutTemplate, studyTemplate]}
          runs={[completedRunToday]}
        />
      );

      // Active tab count should now be 1 (only studyTemplate)
      const activeTab = screen.getByRole('button', { name: /^Active/i });
      expect(activeTab).toHaveTextContent('1');

      // Done for Today tab count should be 1 (workoutTemplate)
      const doneTodayTab = screen.getByRole('button', { name: /^Done for Today/i });
      expect(doneTodayTab).toHaveTextContent('1');

      // Under Active tab, workoutTemplate is MOVED AWAY and not displayed
      expect(screen.queryByText('HIIT Morning Routine')).not.toBeInTheDocument();
      expect(screen.getByText('Algorithm Deep Dive')).toBeInTheDocument();

      // Click "Done for Today" tab
      fireEvent.click(doneTodayTab);

      // Now workoutTemplate is displayed with "Done for Today" badge and "Run Again" button
      expect(screen.getByText('HIIT Morning Routine')).toBeInTheDocument();
      expect(screen.getAllByText('Done for Today').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Run Again')).toBeInTheDocument();
      // studyTemplate is NOT displayed in Done for Today tab
      expect(screen.queryByText('Algorithm Deep Dive')).not.toBeInTheDocument();
    });

    it('automatically moves completed races back to Active when the next day arrives', () => {
      // Completed yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = getLocalDateKey(yesterday);

      const completedRunYesterday: RaceRun = {
        id: 'run-workout-yesterday',
        templateId: workoutTemplate.id,
        templateSnapshot: workoutTemplate,
        startedAt: `${yesterdayKey}T08:00:00.000Z`,
        completedAt: `${yesterdayKey}T08:15:00.000Z`,
        status: 'completed',
        totalAllocatedSeconds: 300,
        totalActualSeconds: 290,
        totalOvertimeSeconds: 0,
        totalPausedSeconds: 0,
        taskRuns: [],
      };

      render(
        <RaceDashboard
          {...defaultProps}
          templates={[workoutTemplate, studyTemplate]}
          runs={[completedRunYesterday]}
        />
      );

      // Since the run was yesterday, today workoutTemplate is back in Active!
      const activeTab = screen.getByRole('button', { name: /^Active/i });
      expect(activeTab).toHaveTextContent('2');

      const doneTodayTab = screen.getByRole('button', { name: /^Done for Today/i });
      expect(doneTodayTab).toHaveTextContent('0');

      // Both templates are visible in Active
      expect(screen.getByText('HIIT Morning Routine')).toBeInTheDocument();
      expect(screen.getByText('Algorithm Deep Dive')).toBeInTheDocument();
    });

    it('triggers onToggleDoneToday callback when clicking the card checkmark button', () => {
      const onToggleDoneToday = vi.fn();

      render(
        <RaceDashboard
          {...defaultProps}
          templates={[workoutTemplate]}
          runs={[]}
          onToggleDoneToday={onToggleDoneToday}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /Mark as Done for Today/i });
      fireEvent.click(toggleBtn);

      expect(onToggleDoneToday).toHaveBeenCalledWith('template-workout', false);
    });

    it('shows encouraging empty state when all active races are done for today', () => {
      const todayKey = getLocalDateKey();
      const completedRun: RaceRun = {
        id: 'run-workout-today',
        templateId: workoutTemplate.id,
        templateSnapshot: workoutTemplate,
        startedAt: `${todayKey}T08:00:00.000Z`,
        completedAt: `${todayKey}T08:15:00.000Z`,
        status: 'completed',
        totalAllocatedSeconds: 300,
        totalActualSeconds: 290,
        totalOvertimeSeconds: 0,
        totalPausedSeconds: 0,
        taskRuns: [],
      };

      render(
        <RaceDashboard
          {...defaultProps}
          templates={[workoutTemplate]}
          runs={[completedRun]}
        />
      );

      // In Active tab, should show "All races completed for today! 🎉"
      expect(screen.getByText('All races completed for today! 🎉')).toBeInTheDocument();
      expect(screen.getByText(/View Done for Today \(1\)/i)).toBeInTheDocument();
    });
  });

  describe('Persistent Dashboard Sorting Options', () => {
    const templateA: RaceTemplate = {
      ...mockTemplate,
      id: 'template-alpha',
      name: 'Alpha Routine',
      updatedAt: '2026-10-01T00:00:00.000Z',
      tasks: [{ id: 't-1', name: 'Task 1', durationSeconds: 600, order: 0, enabled: true }],
    };

    const templateB: RaceTemplate = {
      ...mockTemplate,
      id: 'template-beta',
      name: 'Beta Routine',
      updatedAt: '2026-10-02T00:00:00.000Z',
      tasks: [{ id: 't-2', name: 'Task 2', durationSeconds: 120, order: 0, enabled: true }],
    };

    beforeEach(() => {
      localStorage.clear();
    });

    it('defaults to "updated" sort when no prop or localStorage is set', () => {
      render(
        <RaceDashboard
          {...defaultProps}
          templates={[templateA, templateB]}
        />
      );

      const sortSelect = screen.getByLabelText('Sort races by');
      expect(sortSelect).toHaveValue('updated');

      // Most recently updated (templateB, Oct 2) appears before templateA (Oct 1)
      const cards = screen.getAllByRole('heading', { level: 3 });
      const cardTitles = cards.map((c) => c.textContent);
      expect(cardTitles[0]).toBe('Beta Routine');
      expect(cardTitles[1]).toBe('Alpha Routine');
    });

    it('initializes from sortBy prop when provided', () => {
      render(
        <RaceDashboard
          {...defaultProps}
          templates={[templateA, templateB]}
          sortBy="name"
        />
      );

      expect(screen.getByDisplayValue('Name (A-Z)')).toHaveValue('name');

      // Sorted alphabetically: Alpha Routine before Beta Routine
      const cards = screen.getAllByRole('heading', { level: 3 });
      const cardTitles = cards.map((c) => c.textContent);
      expect(cardTitles[0]).toBe('Alpha Routine');
      expect(cardTitles[1]).toBe('Beta Routine');
    });

    it('initializes from localStorage when sortBy prop is omitted', () => {
      localStorage.setItem(DASHBOARD_SORT_STORAGE_KEY, 'duration-desc');

      render(
        <RaceDashboard
          {...defaultProps}
          templates={[templateA, templateB]}
        />
      );

      expect(screen.getByDisplayValue('Duration (Longest)')).toHaveValue('duration-desc');

      // Alpha (600s) has longer duration than Beta (120s)
      const cards = screen.getAllByRole('heading', { level: 3 });
      const cardTitles = cards.map((c) => c.textContent);
      expect(cardTitles[0]).toBe('Alpha Routine');
      expect(cardTitles[1]).toBe('Beta Routine');
    });

    it('saves to localStorage and calls onSortByChange when user changes sort option', () => {
      const onSortByChange = vi.fn();

      render(
        <RaceDashboard
          {...defaultProps}
          templates={[templateA, templateB]}
          onSortByChange={onSortByChange}
        />
      );

      const sortSelect = screen.getByDisplayValue('Recently Updated');
      fireEvent.change(sortSelect, { target: { value: 'duration-asc' } });

      // Calls callback with new sort
      expect(onSortByChange).toHaveBeenCalledWith('duration-asc');

      // Persists in localStorage
      expect(localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY)).toBe('duration-asc');

      // UI updates sort: Beta (120s) before Alpha (600s)
      const cards = screen.getAllByRole('heading', { level: 3 });
      const cardTitles = cards.map((c) => c.textContent);
      expect(cardTitles[0]).toBe('Beta Routine');
      expect(cardTitles[1]).toBe('Alpha Routine');
    });

    it('synchronizes when sortBy prop changes from external settings', () => {
      const { rerender } = render(
        <RaceDashboard
          {...defaultProps}
          templates={[templateA, templateB]}
          sortBy="updated"
        />
      );

      expect(screen.getByDisplayValue('Recently Updated')).toHaveValue('updated');

      rerender(
        <RaceDashboard
          {...defaultProps}
          templates={[templateA, templateB]}
          sortBy="name"
        />
      );

      expect(screen.getByDisplayValue('Name (A-Z)')).toHaveValue('name');
    });
  });
});
