import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HabitTrackerDashboard } from './HabitTrackerDashboard';
import { RaceTemplate, RaceRun, AppSettings } from '../../types/race';

describe('HabitTrackerDashboard', () => {
  const mockTemplates: RaceTemplate[] = [
    {
      id: 'race-algo',
      name: 'Google L5 Coding Practice',
      category: 'Interview Prep',
      tags: ['Algorithms'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      tasks: [
        { id: 't1', name: 'Solve problem', durationSeconds: 1800, order: 0, enabled: true },
      ],
    },
    {
      id: 'race-hiit',
      name: 'HIIT Morning Routine',
      category: 'Fitness',
      tags: ['Health'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      tasks: [
        { id: 't2', name: 'Workout', durationSeconds: 900, order: 0, enabled: true },
      ],
    },
  ];

  const mockRuns: RaceRun[] = [
    {
      id: 'run-1',
      templateId: 'race-algo',
      templateSnapshot: mockTemplates[0],
      startedAt: '2026-10-22T08:00:00.000Z',
      completedAt: '2026-10-22T08:30:00.000Z',
      status: 'completed',
      totalAllocatedSeconds: 1800,
      totalActualSeconds: 1800,
      totalOvertimeSeconds: 0,
      totalPausedSeconds: 0,
      taskRuns: [],
    },
  ];

  const mockSettings: AppSettings = {
    defaultTaskDuration: 300,
    autoAdvance: true,
    allowOvertime: true,
    autoStartNext: true,
    countdownMode: 'down',
    timerUpdateFrequencyMs: 200,
    soundEnabled: true,
    soundVolume: 0.8,
    warningSoundEnabled: true,
    completionSoundEnabled: true,
    ttsTaskNameEnabled: true,
    browserNotificationsEnabled: false,
    warningThresholds: [60],
    countdownWarningThreshold: 10,
    theme: 'system',
    largeTimerMode: true,
    compactMode: false,
    keyboardShortcutsEnabled: true,
    wakeLockEnabled: true,
    tabTitleTimerEnabled: true,
    dashboardSortBy: 'updated',
    skipConfirmations: {},
    lastBackupAt: null,
    accountabilityEnabled: true,
    accountabilityCutoffTime: '21:00',
    accountabilityPledgeMessage: 'Test pledge',
    apologyLog: [],
    habitTrackerStartDate: '2026-10-01',
  };

  it('renders habit dashboard header and KPI summary cards', () => {
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={vi.fn()}
        onToggleDoneToday={vi.fn()}
      />
    );

    expect(screen.getByText('Habit Tracker & Analytics')).toBeInTheDocument();
    expect(screen.getByText(/Tracking from/)).toBeInTheDocument();
    expect(screen.getByText('Overall Consistency')).toBeInTheDocument();
    expect(screen.getByText('Longest Active Streak')).toBeInTheDocument();
    expect(screen.getByText('Races Done Today')).toBeInTheDocument();
  });

  it('displays race habit cards with done/daysPassed ratio and streak counters', () => {
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={vi.fn()}
        onToggleDoneToday={vi.fn()}
      />
    );

    expect(screen.getByText('Google L5 Coding Practice')).toBeInTheDocument();
    expect(screen.getByText('HIIT Morning Routine')).toBeInTheDocument();
    expect(screen.getAllByText(/Consistency Ratio/i).length).toBe(2);
    expect(screen.getAllByText(/streak/i).length).toBeGreaterThan(0);
  });

  it('triggers onToggleDoneToday when mark done button is clicked', () => {
    const handleToggleDone = vi.fn();
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={vi.fn()}
        onToggleDoneToday={handleToggleDone}
      />
    );

    const markDoneButtons = screen.getAllByRole('button', { name: /Mark Done Today/i });
    fireEvent.click(markDoneButtons[0]);

    expect(handleToggleDone).toHaveBeenCalledWith('race-algo', false);
  });

  it('triggers onStartRace when start button is clicked', () => {
    const handleStartRace = vi.fn();
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={handleStartRace}
        onToggleDoneToday={vi.fn()}
      />
    );

    const startButtons = screen.getAllByRole('button', { name: /Start/i });
    fireEvent.click(startButtons[0]);

    expect(handleStartRace).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('filters races by category and search query', () => {
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={vi.fn()}
        onToggleDoneToday={vi.fn()}
      />
    );

    // Search for HIIT
    const searchInput = screen.getByPlaceholderText('Search races...');
    fireEvent.change(searchInput, { target: { value: 'HIIT' } });

    expect(screen.getByText('HIIT Morning Routine')).toBeInTheDocument();
    expect(screen.queryByText('Google L5 Coding Practice')).not.toBeInTheDocument();
  });

  it('renders persistent inspection guidance prompt in idle state', () => {
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={vi.fn()}
        onToggleDoneToday={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Hover over any trend bar or activity heatmap square to inspect stats/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Interactive Preview')).toBeInTheDocument();
  });

  it('shows day details when hovering over a day and restores prompt on mouse leave', () => {
    render(
      <HabitTrackerDashboard
        templates={mockTemplates}
        runs={mockRuns}
        settings={mockSettings}
        onStartRace={vi.fn()}
        onToggleDoneToday={vi.fn()}
      />
    );

    // Initial idle state
    expect(
      screen.getByText(/Hover over any trend bar or activity heatmap square to inspect stats/i)
    ).toBeInTheDocument();

    // Heatmap button for run date (2026-10-22)
    const dayButton = screen.getByTitle(/2026-10-22: 1 race\(s\) completed/i);
    expect(dayButton).toBeInTheDocument();

    // Mouse enter on heatmap day button
    fireEvent.mouseEnter(dayButton);

    // Idle message should be replaced by day stats
    expect(
      screen.queryByText(/Hover over any trend bar or activity heatmap square to inspect stats/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText('2026-10-22')).toBeInTheDocument();
    expect(screen.getByText(/Completed: Google L5 Coding Practice/i)).toBeInTheDocument();
    expect(screen.getByText(/• Click for details/i)).toBeInTheDocument();

    // Clicking the preview card opens the detailed modal
    const previewCard = screen.getByRole('button', { name: /2026-10-22/i });
    fireEvent.click(previewCard);
    expect(screen.getByText('Activity on 2026-10-22')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('Activity on 2026-10-22')).not.toBeInTheDocument();

    // Mouse leave restores idle state
    fireEvent.mouseLeave(dayButton);
    expect(
      screen.getByText(/Hover over any trend bar or activity heatmap square to inspect stats/i)
    ).toBeInTheDocument();
  });
});
