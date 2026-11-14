import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangeRaceIndexModal } from './ChangeRaceIndexModal';
import { RaceTemplate } from '../../types/race';

const mockTemplate: RaceTemplate = {
  id: 'race-algo',
  name: 'Google L5 Coding Practice',
  category: 'Interview Prep',
  tags: ['Algorithms'],
  order: 2, // 0-based -> #3
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  tasks: [],
};

describe('ChangeRaceIndexModal', () => {
  it('renders race name, current position, and default target index', () => {
    render(
      <ChangeRaceIndexModal
        isOpen={true}
        template={mockTemplate}
        totalTemplates={5}
        onClose={vi.fn()}
        onSaveIndex={vi.fn()}
      />
    );

    expect(screen.getByText('Change Race Index')).toBeInTheDocument();
    expect(screen.getByText('Google L5 Coding Practice')).toBeInTheDocument();
    expect(screen.getByText('#3 of 5')).toBeInTheDocument();

    const input = screen.getByLabelText(/Set New Index Position/i);
    expect(input).toHaveValue(3);
  });

  it('updates target index using stepper buttons and shortcuts', () => {
    render(
      <ChangeRaceIndexModal
        isOpen={true}
        template={mockTemplate}
        totalTemplates={5}
        onClose={vi.fn()}
        onSaveIndex={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/Set New Index Position/i);

    // Click Top (#1) shortcut
    fireEvent.click(screen.getByRole('button', { name: /Top \(#1\)/i }));
    expect(input).toHaveValue(1);

    // Click Bottom (#5) shortcut
    fireEvent.click(screen.getByRole('button', { name: /Bottom \(#5\)/i }));
    expect(input).toHaveValue(5);

    // Click - stepper
    fireEvent.click(screen.getByRole('button', { name: /Decrease position/i }));
    expect(input).toHaveValue(4);

    // Click + stepper
    fireEvent.click(screen.getByRole('button', { name: /Increase position/i }));
    expect(input).toHaveValue(5);
  });

  it('submits clamped target index on save', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <ChangeRaceIndexModal
        isOpen={true}
        template={mockTemplate}
        totalTemplates={5}
        onClose={handleClose}
        onSaveIndex={handleSave}
      />
    );

    const input = screen.getByLabelText(/Set New Index Position/i);
    fireEvent.change(input, { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Index/i }));

    expect(handleSave).toHaveBeenCalledWith('race-algo', 1);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking cancel or close button', () => {
    const handleClose = vi.fn();

    render(
      <ChangeRaceIndexModal
        isOpen={true}
        template={mockTemplate}
        totalTemplates={5}
        onClose={handleClose}
        onSaveIndex={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
