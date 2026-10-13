import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitleTimer, ORIGINAL_DOCUMENT_TITLE } from './useDocumentTitleTimer';
import { TimerTickData } from '../services/timer/timerEngine';

function createMockTickData(overrides?: Partial<TimerTickData>): TimerTickData {
  return {
    timerState: 'RUNNING',
    currentTaskIndex: 0,
    currentTaskRun: null,
    taskAllocatedSeconds: 300,
    taskElapsedSeconds: 60,
    taskRemainingSeconds: 240, // 04:00
    taskOvertimeSeconds: 0,
    taskProgressPercent: 20,
    raceAllocatedSeconds: 1200,
    raceElapsedSeconds: 60,
    raceRemainingSeconds: 1140,
    raceOvertimeSeconds: 0,
    raceProgressPercent: 5,
    completedTaskCount: 0,
    totalTaskCount: 4,
    totalPausedSeconds: 0,
    pausedAt: null,
    estimatedFinishTime: null,
    isOvertime: false,
    isWarning: false,
    isCountdownWarning: false,
    countdownSecondsRemaining: 0,
    paceDeltaSeconds: 0,
    ...overrides,
  };
}

describe('useDocumentTitleTimer', () => {
  const initialTitle = 'Race Timer — Beat the Clock';

  beforeEach(() => {
    document.title = initialTitle;
  });

  afterEach(() => {
    document.title = initialTitle;
    vi.restoreAllMocks();
  });

  it('restores original title when timer is inactive or tickData is null', () => {
    renderHook(() =>
      useDocumentTitleTimer({
        tickData: null,
        enabled: true,
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe(ORIGINAL_DOCUMENT_TITLE);
  });

  it('displays the active timer remaining time in MM:SS format instead of app name', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 300, // 5 min -> 05:00
    });

    const { rerender } = renderHook(
      ({ data, isEnabled }) =>
        useDocumentTitleTimer({
          tickData: data,
          enabled: isEnabled,
          originalTitle: initialTitle,
        }),
      { initialProps: { data: tickData, isEnabled: true } }
    );

    // Dynamic title in MM:SS format
    expect(document.title).toBe('05:00');

    // As time advances to 04:59
    rerender({
      data: createMockTickData({
        timerState: 'RUNNING',
        taskRemainingSeconds: 299,
      }),
      isEnabled: true,
    });
    expect(document.title).toBe('04:59');

    // When under 1 minute: 45 seconds -> 00:45
    rerender({
      data: createMockTickData({
        timerState: 'RUNNING',
        taskRemainingSeconds: 45,
      }),
      isEnabled: true,
    });
    expect(document.title).toBe('00:45');
  });

  it('displays overtime in +MM:SS format when task overruns', () => {
    const tickData = createMockTickData({
      timerState: 'OVERTIME',
      isOvertime: true,
      taskRemainingSeconds: 0,
      taskOvertimeSeconds: 75, // 01:15 overtime
    });

    renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('+01:15');
  });

  it('displays remaining time in MM:SS when paused mid-race', () => {
    const tickData = createMockTickData({
      timerState: 'PAUSED',
      taskRemainingSeconds: 154, // 02:34
    });

    renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('02:34');
  });

  it('restores original title when timer is reset (IDLE) or finished (RACE_COMPLETED)', () => {
    const runningTick = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 180,
    });

    const { rerender } = renderHook(
      ({ data }) =>
        useDocumentTitleTimer({
          tickData: data,
          enabled: true,
          originalTitle: initialTitle,
        }),
      { initialProps: { data: runningTick } }
    );

    expect(document.title).toBe('03:00');

    // Reset timer to IDLE
    rerender({
      data: createMockTickData({
        timerState: 'IDLE',
        taskRemainingSeconds: 300,
      }),
    });
    expect(document.title).toBe(ORIGINAL_DOCUMENT_TITLE);

    // Completed race
    rerender({
      data: createMockTickData({
        timerState: 'RACE_COMPLETED',
        taskRemainingSeconds: 0,
      }),
    });
    expect(document.title).toBe(ORIGINAL_DOCUMENT_TITLE);
  });

  it('restores original title when disabled in settings', () => {
    const runningTick = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 240,
    });

    const { rerender } = renderHook(
      ({ isEnabled }) =>
        useDocumentTitleTimer({
          tickData: runningTick,
          enabled: isEnabled,
          originalTitle: initialTitle,
        }),
      { initialProps: { isEnabled: true } }
    );

    expect(document.title).toBe('04:00');

    // User disables the setting
    rerender({ isEnabled: false });
    expect(document.title).toBe(ORIGINAL_DOCUMENT_TITLE);
  });

  it('keeps accurate title when switching tabs / visibilitychange event fires', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 130, // 02:10
    });

    renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('02:10');

    // Simulate tab switch (document visibilitychange)
    document.dispatchEvent(new Event('visibilitychange'));
    expect(document.title).toBe('02:10');

    // Simulate window focus
    window.dispatchEvent(new Event('focus'));
    expect(document.title).toBe('02:10');
  });

  it('restores original title on unmount', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 200,
    });

    const { unmount } = renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('03:20');

    unmount();
    expect(document.title).toBe(ORIGINAL_DOCUMENT_TITLE);
  });

  it('displays the active timer remaining time with race name as suffix', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 300,
    });

    const { rerender } = renderHook(
      ({ name }) =>
        useDocumentTitleTimer({
          tickData,
          enabled: true,
          raceName: name,
          originalTitle: initialTitle,
        }),
      { initialProps: { name: 'Workout' } }
    );

    expect(document.title).toBe('05:00 - Workout');

    // Dynamically switch race name
    rerender({ name: 'Cooking' });
    expect(document.title).toBe('05:00 - Cooking');
  });

  it('uses raceName from tickData when hook options raceName is not provided', () => {
    const tickData = createMockTickData({
      timerState: 'RUNNING',
      taskRemainingSeconds: 240,
      raceName: 'Technical Interview',
    });

    renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('04:00 - Technical Interview');
  });

  it('displays overtime with race name suffix', () => {
    const tickData = createMockTickData({
      timerState: 'OVERTIME',
      isOvertime: true,
      taskRemainingSeconds: 0,
      taskOvertimeSeconds: 75,
    });

    renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        raceName: 'Workout',
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('+01:15 - Workout');
  });

  it('displays remaining time with race name suffix when paused', () => {
    const tickData = createMockTickData({
      timerState: 'PAUSED',
      taskRemainingSeconds: 154,
    });

    renderHook(() =>
      useDocumentTitleTimer({
        tickData,
        enabled: true,
        raceName: 'Workout',
        originalTitle: initialTitle,
      })
    );

    expect(document.title).toBe('02:34 - Workout');
  });
});
