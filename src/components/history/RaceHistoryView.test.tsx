import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaceHistoryView } from './RaceHistoryView';
import { RaceRun, ApologyEntry } from '../../types/race';

const mockRuns: RaceRun[] = [
  {
    id: 'run-1',
    templateId: 'temp-1',
    templateSnapshot: {
      id: 'temp-1',
      name: 'Google L5 Coding & Algorithms Practice',
      description: 'Practice',
      category: 'Interview Prep',
      tags: ['Interview'],
      tasks: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    startedAt: '2026-10-14T10:00:00.000Z',
    completedAt: '2026-10-14T10:45:00.000Z',
    status: 'completed',
    totalAllocatedSeconds: 3600,
    totalActualSeconds: 2700,
    totalOvertimeSeconds: 0,
    totalPausedSeconds: 0,
    taskRuns: [],
  },
];

const mockApologies: ApologyEntry[] = [
  {
    id: 'apology-1',
    dateKey: '2026-10-13',
    timestamp: '2026-10-13T21:05:00.000Z',
    message: 'My end Goal is to prepare for Google. I have failed today but I will NEVER GIVE UP. I have to dig deep and PUSH PAST MY LIMITS.',
    pendingRaceNames: ['Google L5 Coding & Algorithms Practice'],
    pendingRaceCount: 1,
  },
];

describe('RaceHistoryView', () => {
  it('renders runs tab by default with runs count and details', () => {
    render(
      <RaceHistoryView
        runs={mockRuns}
        apologyLog={mockApologies}
        onSelectRun={vi.fn()}
        onRunAgain={vi.fn()}
        onDeleteRun={vi.fn()}
        onClearAllRuns={vi.fn()}
      />
    );

    expect(screen.getByText('Race Execution History')).toBeInTheDocument();
    expect(screen.getByText('Google L5 Coding & Algorithms Practice')).toBeInTheDocument();
    expect(screen.getByText(/Race Runs \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Apologies to Self \(1\)/i)).toBeInTheDocument();
  });

  it('switches to Apologies to Self sub-tab and renders apologies log', () => {
    const handleClearApologies = vi.fn();
    const handleDeleteApology = vi.fn();

    render(
      <RaceHistoryView
        runs={mockRuns}
        apologyLog={mockApologies}
        onSelectRun={vi.fn()}
        onRunAgain={vi.fn()}
        onDeleteRun={vi.fn()}
        onClearAllRuns={vi.fn()}
        onDeleteApology={handleDeleteApology}
        onClearApologies={handleClearApologies}
      />
    );

    // Switch to apologies tab
    fireEvent.click(screen.getByRole('button', { name: /apologies to self \(1\)/i }));

    expect(screen.getByRole('heading', { name: 'Apologies to Self' })).toBeInTheDocument();
    expect(screen.getByText('2026-10-13')).toBeInTheDocument();
    expect(screen.getByText('1 Pending Races')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockApologies[0].message))).toBeInTheDocument();

    // Verify clear apologies button appears and opens confirmation
    const clearButton = screen.getByRole('button', { name: /clear apologies/i });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(screen.getByText('Clear All Apology Records?')).toBeInTheDocument();
  });

  it('renders empty state for apologies when log is empty', () => {
    render(
      <RaceHistoryView
        runs={mockRuns}
        apologyLog={[]}
        onSelectRun={vi.fn()}
        onRunAgain={vi.fn()}
        onDeleteRun={vi.fn()}
        onClearAllRuns={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /apologies to self \(0\)/i }));
    expect(screen.getByText('No apologies recorded')).toBeInTheDocument();
  });
});
