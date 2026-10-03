import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StickyTimerHeader } from './StickyTimerHeader';
import { TimerTickData } from '../../services/timer/timerEngine';

function createMockTickData(overrides?: Partial<TimerTickData>): TimerTickData {
  return {
    timerState: 'RUNNING',
    currentTaskIndex: 0,
    currentTaskRun: {
      taskId: 'task-1',
      taskSnapshot: {
        id: 'task-1',
        name: 'Algorithm Design',
        durationSeconds: 300,
        order: 0,
        enabled: true,
      },
      allocatedSeconds: 300,
      actualSeconds: 120,
      overtimeSeconds: 0,
      status: 'active',
      events: [],
    },
    taskAllocatedSeconds: 300,
    taskElapsedSeconds: 120,
    taskRemainingSeconds: 180,
    taskOvertimeSeconds: 0,
    taskProgressPercent: 40,
    raceAllocatedSeconds: 1800,
    raceElapsedSeconds: 120,
    raceRemainingSeconds: 1680,
    raceOvertimeSeconds: 0,
    raceProgressPercent: 7,
    completedTaskCount: 0,
    totalTaskCount: 5,
    totalPausedSeconds: 0,
    pausedAt: null,
    estimatedFinishTime: new Date(Date.now() + 1680 * 1000),
    isOvertime: false,
    isWarning: false,
    isCountdownWarning: false,
    countdownSecondsRemaining: 0,
    paceDeltaSeconds: 0,
    ...overrides,
  };
}

describe('StickyTimerHeader - Leading/Trailing Pace Display', () => {
  const defaultProps = {
    raceName: 'Google Interview Race',
    isFocusMode: false,
    isFullscreen: false,
    onToggleFocusMode: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    onRestartTask: vi.fn(),
    onFinishRace: vi.fn(),
  };

  it('renders "leading by XX:XX" in green text when paceDeltaSeconds is positive', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      paceDeltaSeconds: 125, // 2m 5s lead
      raceRemainingSeconds: 900,
      raceProgressPercent: 50,
    });

    render(<StickyTimerHeader {...defaultProps} tickData={tickData} />);

    // Verify race remaining and progress percent
    expect(screen.getByText(/15:00 race remaining/)).toBeInTheDocument();
    expect(screen.getByText(/50% total race completed/)).toBeInTheDocument();

    // Verify leading by with green text
    const leadingElement = screen.getByText('leading by 02:05');
    expect(leadingElement).toBeInTheDocument();
    expect(leadingElement.className).toContain('text-emerald-400');
  });

  it('renders "leading by 00:00" in green text when paceDeltaSeconds is zero (on pace)', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      paceDeltaSeconds: 0,
      raceRemainingSeconds: 1200,
      raceProgressPercent: 20,
    });

    render(<StickyTimerHeader {...defaultProps} tickData={tickData} />);

    const leadingElement = screen.getByText('leading by 00:00');
    expect(leadingElement).toBeInTheDocument();
    expect(leadingElement.className).toContain('text-emerald-400');
  });

  it('renders "trailing by XX:XX" in red text when paceDeltaSeconds is negative', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      paceDeltaSeconds: -75, // 1m 15s behind schedule
      raceRemainingSeconds: 600,
      raceProgressPercent: 65,
    });

    render(<StickyTimerHeader {...defaultProps} tickData={tickData} />);

    // Verify trailing by with red text
    const trailingElement = screen.getByText('trailing by 01:15');
    expect(trailingElement).toBeInTheDocument();
    expect(trailingElement.className).toContain('text-rose-400');
  });

  it('does not display pace indicator before race starts (IDLE state)', () => {
    const tickData = createMockTickData({
      timerState: 'IDLE',
      paceDeltaSeconds: 0,
    });

    render(<StickyTimerHeader {...defaultProps} tickData={tickData} />);

    expect(screen.queryByText(/leading by/)).not.toBeInTheDocument();
    expect(screen.queryByText(/trailing by/)).not.toBeInTheDocument();
  });

  it('continues displaying leading/trailing pace when the race is paused', () => {
    const tickData = createMockTickData({
      timerState: 'PAUSED',
      paceDeltaSeconds: 180, // 3m lead
    });

    render(<StickyTimerHeader {...defaultProps} tickData={tickData} />);

    const leadingElement = screen.getByText('leading by 03:00');
    expect(leadingElement).toBeInTheDocument();
    expect(leadingElement.className).toContain('text-emerald-400');
  });
});
