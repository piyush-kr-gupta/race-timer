import React, { useState, useRef } from 'react';
import { RaceTemplate, Task } from '../../types/race';
import { TaskItem } from './TaskItem';
import { formatDurationHuman } from '../../utils/duration';
import { Plus, Clock, Save, ArrowLeft, Layers, Tag } from 'lucide-react';

interface RaceEditorProps {
  initialTemplate?: RaceTemplate;
  onSave: (template: RaceTemplate) => void;
  onCancel: () => void;
  defaultTaskDuration?: number;
  onShowToast?: (msg: string, undoCallback?: () => void) => void;
}

export const RaceEditor: React.FC<RaceEditorProps> = ({
  initialTemplate,
  onSave,
  onCancel,
  defaultTaskDuration = 300,
  onShowToast,
}) => {
  const [name, setName] = useState(initialTemplate?.name || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [category, setCategory] = useState(initialTemplate?.category || 'General');
  const [tagsStr, setTagsStr] = useState((initialTemplate?.tags || []).join(', '));
  const [tasks, setTasks] = useState<Task[]>(
    initialTemplate?.tasks
      ? JSON.parse(JSON.stringify(initialTemplate.tasks))
      : [
          {
            id: `task-${Date.now()}-0`,
            name: 'Problem Understanding',
            durationSeconds: 300,
            order: 0,
            enabled: true,
            color: '#3b82f6',
          },
          {
            id: `task-${Date.now()}-1`,
            name: 'Solution Design',
            durationSeconds: 900,
            order: 1,
            enabled: true,
            color: '#f97316',
          },
          {
            id: `task-${Date.now()}-2`,
            name: 'Implementation',
            durationSeconds: 1500,
            order: 2,
            enabled: true,
            color: '#10b981',
          },
        ]
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const deletedTaskHistoryRef = useRef<{ task: Task; index: number } | null>(null);

  // Live total calculation
  const totalDurationSeconds = tasks
    .filter((t) => t.enabled)
    .reduce((sum, t) => sum + t.durationSeconds, 0);

  // Add Task at End
  const handleAddTaskAtEnd = () => {
    const newId = `task-${Date.now()}-${tasks.length}`;
    const newTask: Task = {
      id: newId,
      name: '',
      durationSeconds: defaultTaskDuration,
      order: tasks.length,
      enabled: true,
      color: '#f97316',
    };

    setTasks((prev) => [...prev, newTask]);

    // Focus its name input on next tick
    setTimeout(() => {
      const inputEl = document.getElementById(`task-name-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTask = (id: string) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    const taskToDelete = tasks[index];

    deletedTaskHistoryRef.current = { task: taskToDelete, index };

    setTasks((prev) => prev.filter((t) => t.id !== id));

    // Show undo toast
    if (onShowToast) {
      onShowToast(`Deleted "${taskToDelete.name || 'Task'}"`, () => {
        if (deletedTaskHistoryRef.current) {
          const { task: restoredTask, index: restoredIndex } = deletedTaskHistoryRef.current;
          setTasks((curr) => {
            const next = [...curr];
            next.splice(restoredIndex, 0, restoredTask);
            return next;
          });
          deletedTaskHistoryRef.current = null;
        }
      });
    }
  };

  const handleDuplicateTask = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const index = tasks.findIndex((t) => t.id === id);

    const dup: Task = {
      ...target,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${target.name} (Copy)`,
    };

    setTasks((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, dup);
      return next;
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setTasks((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= tasks.length - 1) return;
    setTasks((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Drag and drop
  const handleDragStart = (_e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragTargetIndex !== index) {
      setDragTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragTargetIndex(null);
      return;
    }

    setTasks((prev) => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(dropIndex, 0, draggedItem);
      return next;
    });

    setDraggedIndex(null);
    setDragTargetIndex(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a race name.');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const reorderedTasks = tasks.map((t, idx) => ({
      ...t,
      name: t.name.trim() || `Task ${idx + 1}`,
      order: idx,
    }));

    const finalTemplate: RaceTemplate = {
      id: initialTemplate?.id || `race-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      tags,
      tasks: reorderedTasks,
      createdAt: initialTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: initialTemplate?.isArchived || false,
      isSample: false,
    };

    onSave(finalTemplate);
  };

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-900 transition cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/20 transition cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Save Race</span>
          </button>
        </div>
      </div>

      {/* Race Metadata Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Race Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google L5 Mock Interview"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
            />
          </div>

          {/* Total duration & task summary pills */}
          <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-2xl px-5 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Duration</span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  {formatDurationHuman(totalDurationSeconds)}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Tasks</span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  {tasks.filter((t) => t.enabled).length} of {tasks.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metadata: Description, Category & Tags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Interview Prep"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[40px]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. Algorithms, System Design, Focus"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[40px]"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the goal, constraints, or rules for this race session..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Task Sequence Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span>Task Sequence</span>
          <span className="text-xs font-normal text-slate-400 lowercase">
            (drag handle or use arrows to reorder)
          </span>
        </h3>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            totalTasks={tasks.length}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onDuplicate={handleDuplicateTask}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragTarget={dragTargetIndex === index}
          />
        ))}
      </div>

      {/* Obvious + Add Task Button at End */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleAddTaskAtEnd}
          className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-orange-500/60 hover:bg-orange-500/5 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-300 hover:text-orange-400 transition cursor-pointer min-h-[52px]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Add Task</span>
        </button>
      </div>
    </form>
  );
};
