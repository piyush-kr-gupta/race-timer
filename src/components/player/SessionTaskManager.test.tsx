import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionTaskManager } from './SessionTaskManager';
import { SessionTaskItem } from '../../types/race';

describe('SessionTaskManager Component', () => {
  const sampleTasks: SessionTaskItem[] = [
    {
      id: 'task-1',
      title: '20 Push-ups',
      completed: false,
      createdAt: '2026-10-03T10:00:00.000Z',
    },
    {
      id: 'task-2',
      title: '10 Squats',
      completed: true,
      createdAt: '2026-10-03T10:01:00.000Z',
      completedAt: '2026-10-03T10:05:00.000Z',
    },
  ];

  it('renders default empty state with input form', () => {
    const onAddTask = vi.fn();
    render(
      <SessionTaskManager
        sessionTasks={[]}
        onAddTask={onAddTask}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onClearCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByText('0 / 0 done')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Add a task for this session/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/No tasks added for this race session yet/i)).toBeInTheDocument();
  });

  it('submits a new task when typing and clicking Add', () => {
    const onAddTask = vi.fn();
    render(
      <SessionTaskManager
        sessionTasks={[]}
        onAddTask={onAddTask}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onClearCompleted={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Add a task for this session/i);
    fireEvent.change(input, { target: { value: '30-second plank' } });

    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);

    expect(onAddTask).toHaveBeenCalledWith('30-second plank');
  });

  it('renders tasks and triggers toggle and delete callbacks', () => {
    const onToggleTask = vi.fn();
    const onDeleteTask = vi.fn();

    render(
      <SessionTaskManager
        sessionTasks={sampleTasks}
        onAddTask={vi.fn()}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onUpdateTask={vi.fn()}
        onClearCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('20 Push-ups')).toBeInTheDocument();
    expect(screen.getByText('10 Squats')).toBeInTheDocument();
    expect(screen.getByText('1 / 2 done (50%)')).toBeInTheDocument();

    // Toggle task 1
    const toggleButton = screen.getByRole('button', { name: /Mark "20 Push-ups" as complete/i });
    fireEvent.click(toggleButton);
    expect(onToggleTask).toHaveBeenCalledWith('task-1');

    // Delete task 1
    const deleteButton = screen.getByRole('button', { name: /Delete "20 Push-ups"/i });
    fireEvent.click(deleteButton);
    expect(onDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('allows inline editing of a task title', () => {
    const onUpdateTask = vi.fn();

    render(
      <SessionTaskManager
        sessionTasks={sampleTasks}
        onAddTask={vi.fn()}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={onUpdateTask}
        onClearCompleted={vi.fn()}
      />
    );

    const editButton = screen.getByRole('button', { name: /Edit "20 Push-ups"/i });
    fireEvent.click(editButton);

    const editInput = screen.getByDisplayValue('20 Push-ups');
    fireEvent.change(editInput, { target: { value: '25 Push-ups' } });

    const saveButton = screen.getByRole('button', { name: /Save edit/i });
    fireEvent.click(saveButton);

    expect(onUpdateTask).toHaveBeenCalledWith('task-1', '25 Push-ups');
  });

  it('filters tasks based on filter tabs and clears completed tasks', () => {
    const onClearCompleted = vi.fn();

    render(
      <SessionTaskManager
        sessionTasks={sampleTasks}
        onAddTask={vi.fn()}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onClearCompleted={onClearCompleted}
      />
    );

    // Active filter
    const activeTab = screen.getByRole('button', { name: /Active \(1\)/i });
    fireEvent.click(activeTab);

    expect(screen.getByText('20 Push-ups')).toBeInTheDocument();
    expect(screen.queryByText('10 Squats')).not.toBeInTheDocument();

    // Completed filter
    const completedTab = screen.getByRole('button', { name: /^Completed \(1\)$/i });
    fireEvent.click(completedTab);

    expect(screen.queryByText('20 Push-ups')).not.toBeInTheDocument();
    expect(screen.getByText('10 Squats')).toBeInTheDocument();

    // Clear completed button
    const clearButton = screen.getByRole('button', { name: /Clear completed \(1\)/i });
    fireEvent.click(clearButton);
    expect(onClearCompleted).toHaveBeenCalled();
  });

  it('toggles collapse and expand state', () => {
    render(
      <SessionTaskManager
        sessionTasks={sampleTasks}
        onAddTask={vi.fn()}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onClearCompleted={vi.fn()}
      />
    );

    const collapseButton = screen.getByRole('button', { name: /Collapse Task Manager/i });
    fireEvent.click(collapseButton);

    // Body should be hidden
    expect(screen.queryByPlaceholderText(/Add a task for this session/i)).not.toBeInTheDocument();

    // Expand again
    const expandButton = screen.getByRole('button', { name: /Expand Task Manager/i });
    fireEvent.click(expandButton);

    expect(screen.getByPlaceholderText(/Add a task for this session/i)).toBeInTheDocument();
  });
});
