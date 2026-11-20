import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaceCard } from './RaceCard';
import { RaceTemplate } from '../../types/race';

const mockTemplate: RaceTemplate = {
  id: 'template-1',
  name: 'Morning Preparation Routine',
  category: 'Productivity',
  tags: ['Routine'],
  order: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  tasks: [
    {
      id: 'task-1',
      name: 'Plan Day',
      durationSeconds: 300,
      order: 0,
      enabled: true,
    },
  ],
};

describe('RaceCard - Indexing & Reordering', () => {
  const defaultProps = {
    template: mockTemplate,
    displayIndex: 1,
    totalTemplates: 3,
    onStart: vi.fn(),
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onToggleArchive: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders prominent index badge #1 on card', () => {
    render(<RaceCard {...defaultProps} />);

    const badge = screen.getByLabelText(/Race index 1, click to change/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('#1');
  });

  it('disables Move Up on the first card and enables Move Down', () => {
    const handleMoveUp = vi.fn();
    const handleMoveDown = vi.fn();

    render(
      <RaceCard
        {...defaultProps}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />
    );

    const moveUpBtn = screen.getByLabelText('Move race up');
    const moveDownBtn = screen.getByLabelText('Move race down');

    expect(moveUpBtn).toBeDisabled();
    expect(moveDownBtn).not.toBeDisabled();

    fireEvent.click(moveDownBtn);
    expect(handleMoveDown).toHaveBeenCalledWith('template-1');
  });

  it('disables Move Down on the last card and enables Move Up', () => {
    const lastTemplate = { ...mockTemplate, id: 'template-3', order: 2 };
    const handleMoveUp = vi.fn();
    const handleMoveDown = vi.fn();

    render(
      <RaceCard
        {...defaultProps}
        template={lastTemplate}
        displayIndex={3}
        totalTemplates={3}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />
    );

    const moveUpBtn = screen.getByLabelText('Move race up');
    const moveDownBtn = screen.getByLabelText('Move race down');

    expect(moveUpBtn).not.toBeDisabled();
    expect(moveDownBtn).toBeDisabled();

    fireEvent.click(moveUpBtn);
    expect(handleMoveUp).toHaveBeenCalledWith('template-3');
  });

  it('calls onOpenChangeIndex when index badge is clicked and does not render sorting button at bottom', () => {
    const handleOpenIndex = vi.fn();

    render(
      <RaceCard
        {...defaultProps}
        onOpenChangeIndex={handleOpenIndex}
      />
    );

    const badge = screen.getByLabelText(/Race index 1, click to change/i);
    fireEvent.click(badge);
    expect(handleOpenIndex).toHaveBeenCalledWith(mockTemplate);

    // Verify sorting button is removed from bottom of card
    expect(screen.queryByLabelText('Change race index')).toBeNull();
  });

  it('calls onDuplicate when duplicate button is clicked', () => {
    const handleDuplicate = vi.fn();

    render(
      <RaceCard
        {...defaultProps}
        onDuplicate={handleDuplicate}
      />
    );

    const duplicateBtn = screen.getByLabelText('Duplicate race');
    fireEvent.click(duplicateBtn);
    expect(handleDuplicate).toHaveBeenCalledWith('template-1');
  });
});
