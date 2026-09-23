import React, { useState } from 'react';
import { Task } from '../../types/race';
import { DurationInput } from './DurationInput';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  FileText,
  Palette,
  Check,
} from 'lucide-react';

interface TaskItemProps {
  task: Task;
  index: number;
  totalTasks: number;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragTarget?: boolean;
}

const COLOR_PALETTE = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#eab308', // amber
  '#64748b', // slate
];

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  totalTasks,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
}) => {
  const [showNotes, setShowNotes] = useState(Boolean(task.notes));
  const [showColors, setShowColors] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`bg-slate-900 border rounded-2xl p-4 transition-all space-y-3 ${
        isDragTarget ? 'border-orange-500 bg-slate-800/80 scale-[1.01]' : 'border-slate-800 hover:border-slate-700/80'
      } ${!task.enabled ? 'opacity-60 bg-slate-950/40' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Drag Handle, Order Index & Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Desktop Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1 rounded-md hidden sm:block"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Mobile Up/Down controls */}
          <div className="flex flex-col sm:hidden gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveUp(index)}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded bg-slate-800"
              aria-label="Move task up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalTasks - 1}
              onClick={() => onMoveDown(index)}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded bg-slate-800"
              aria-label="Move task down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Task color indicator badge */}
          <button
            type="button"
            onClick={() => setShowColors(!showColors)}
            style={{ backgroundColor: task.color || '#f97316' }}
            className="w-3 h-8 rounded-full shrink-0 transition-transform hover:scale-110 cursor-pointer shadow-xs"
            title="Change task color"
            aria-label="Change task color"
          />

          {/* Task Name Input */}
          <input
            id={`task-name-input-${task.id}`}
            type="text"
            value={task.name}
            onChange={(e) => onUpdate({ ...task, name: e.target.value })}
            placeholder="Task name..."
            className="flex-1 bg-slate-950/70 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
          />
        </div>

        {/* Right: Duration Input, Enable Checkbox & Quick Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
          <DurationInput
            seconds={task.durationSeconds}
            onChange={(newSec) => onUpdate({ ...task, durationSeconds: newSec })}
          />

          <div className="flex items-center gap-1">
            {/* Notes Toggle */}
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`p-2 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                showNotes || task.notes
                  ? 'text-orange-400 bg-orange-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Add / Edit notes"
              aria-label="Task notes"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => onDuplicate(task.id)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Duplicate task"
              aria-label="Duplicate task"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Enable/Disable Toggle */}
            <label
              className="p-2 cursor-pointer flex items-center justify-center"
              title={task.enabled ? 'Enabled' : 'Disabled'}
            >
              <input
                type="checkbox"
                checked={task.enabled}
                onChange={(e) => onUpdate({ ...task, enabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
            </label>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Delete task"
              aria-label="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Color Palette Popover */}
      {showColors && (
        <div className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
          <Palette className="w-4 h-4 text-slate-400 ml-1" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onUpdate({ ...task, color: c });
                  setShowColors(false);
                }}
                style={{ backgroundColor: c }}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
              >
                {task.color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional Notes Section */}
      {showNotes && (
        <div className="pt-1">
          <textarea
            value={task.notes || ''}
            onChange={(e) => onUpdate({ ...task, notes: e.target.value })}
            placeholder="Add task notes, tips, reminders, or criteria..."
            rows={2}
            className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      )}
    </div>
  );
};
