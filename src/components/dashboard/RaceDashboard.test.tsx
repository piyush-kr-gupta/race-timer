import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RaceDashboard } from './RaceDashboard';
import { RaceTemplate, ActiveRunRuntimeState } from '../../types/race';
import { TimerTickData } from '../../services/timer/timerEngine';

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
});
