import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountabilityModal } from './AccountabilityModal';
import { RaceTemplate } from '../../types/race';

const mockTemplates: RaceTemplate[] = [
  {
    id: 'race-1',
    name: 'Google L5 Coding & Algorithms Practice',
    description: 'Practice',
    category: 'Interview Prep',
    tags: ['Interview'],
    tasks: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'race-2',
    name: 'HIIT Workout',
    description: 'Workout',
    category: 'Fitness',
    tags: ['Fitness'],
    tasks: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
];

const TARGET_PLEDGE =
  'My end Goal is to prepare for Google. I have failed today but I will NEVER GIVE UP. I have to dig deep and PUSH PAST MY LIMITS.';

describe('AccountabilityModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <AccountabilityModal
        isOpen={false}
        targetMessage={TARGET_PLEDGE}
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal with title, pending templates, and interactive character display when isOpen is true', () => {
    render(
      <AccountabilityModal
        isOpen={true}
        targetMessage={TARGET_PLEDGE}
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Accountability Check')).toBeInTheDocument();
    expect(screen.getByText(/9:00 PM cutoff has passed/i)).toBeInTheDocument();
    expect(screen.getByText('Google L5 Coding & Algorithms Practice')).toBeInTheDocument();
    expect(screen.getByText('HIIT Workout')).toBeInTheDocument();
    expect(screen.getByText(/Spaces are ignored/i)).toBeInTheDocument();
    expect(screen.getByTestId('interactive-text-display')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /apology to self/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('colors matching characters green and mismatched characters red', () => {
    render(
      <AccountabilityModal
        isOpen={true}
        targetMessage="Go Hard"
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/type the exact pledge here/i);

    // Type "G" (matches), "x" (mismatches 'o'), "H" (matches 'H')
    fireEvent.change(textarea, { target: { value: 'GxH' } });

    const display = screen.getByTestId('interactive-text-display');
    const matches = display.querySelectorAll('[data-status="match"]');
    const mismatches = display.querySelectorAll('[data-status="mismatch"]');

    // 'G' and 'H' match -> 2 green matches
    expect(matches.length).toBe(2);
    expect(matches[0].textContent).toBe('G');
    expect(matches[1].textContent).toBe('H');

    // 'o' mismatched by 'x' -> 1 red mismatch
    expect(mismatches.length).toBe(1);
    expect(mismatches[0].textContent).toBe('o');

    // Mismatch warning is displayed
    expect(screen.getByTestId('mismatch-warning')).toBeInTheDocument();
    expect(screen.getByText(/mismatched character/i)).toBeInTheDocument();
  });

  it('completely ignores spaces when matching characters', () => {
    const handleSubmit = vi.fn();
    render(
      <AccountabilityModal
        isOpen={true}
        targetMessage="Go Hard"
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={handleSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/type the exact pledge here/i);
    const button = screen.getByRole('button', { name: /apology to self/i });

    // Type with NO spaces: "GoHard"
    fireEvent.change(textarea, { target: { value: 'GoHard' } });
    expect(button).not.toBeDisabled();

    // Type with MULTIPLE spaces: "  Go     Hard   "
    fireEvent.change(textarea, { target: { value: '  Go     Hard   ' } });
    expect(button).not.toBeDisabled();

    // Type with standard single space: "Go Hard"
    fireEvent.change(textarea, { target: { value: 'Go Hard' } });
    expect(button).not.toBeDisabled();

    // Click submit
    fireEvent.click(button);
    expect(handleSubmit).toHaveBeenCalledWith('Go Hard');
  });

  it('displays excess characters typed beyond target length in red', () => {
    render(
      <AccountabilityModal
        isOpen={true}
        targetMessage="Go"
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/type the exact pledge here/i);
    fireEvent.change(textarea, { target: { value: 'Go Extra' } });

    expect(screen.getByTestId('excess-chars')).toBeInTheDocument();
    expect(screen.getByTestId('excess-chars').textContent).toBe('Extra');
    expect(screen.getByRole('button', { name: /apology to self/i })).toBeDisabled();
  });

  it('enables "Apology to Self" button on full pledge match and handles submission', () => {
    const handleSubmit = vi.fn();
    render(
      <AccountabilityModal
        isOpen={true}
        targetMessage={TARGET_PLEDGE}
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={handleSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/type the exact pledge here/i);
    const button = screen.getByRole('button', { name: /apology to self/i });

    expect(button).toBeDisabled();

    // Type exact match
    fireEvent.change(textarea, { target: { value: TARGET_PLEDGE } });
    expect(button).not.toBeDisabled();
    expect(screen.getByText(/all \d+ characters matched/i)).toBeInTheDocument();

    // Click submit
    fireEvent.click(button);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(TARGET_PLEDGE);
  });

  it('blocks Escape key from closing the dialog', () => {
    const handleSubmit = vi.fn();
    render(
      <AccountabilityModal
        isOpen={true}
        targetMessage={TARGET_PLEDGE}
        cutoffTime="21:00"
        pendingTemplates={mockTemplates}
        onSubmitApology={handleSubmit}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    // Should remain open and handleSubmit not called
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
