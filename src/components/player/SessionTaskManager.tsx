import React, { useState, useRef } from 'react';
import { SessionTaskItem } from '../../types/race';
import {
  ListTodo,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface SessionTaskManagerProps {
  sessionTasks?: SessionTaskItem[];
  onAddTask: (title: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, title: string) => void;
  onClearCompleted: () => void;
}

export const SessionTaskManager: React.FC<SessionTaskManagerProps> = ({
  sessionTasks = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onClearCompleted,
}) => {
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const completedCount = sessionTasks.filter((t) => t.completed).length;
  const totalCount = sessionTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = sessionTasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setInputText('');
    inputRef.current?.focus();
  };

  const handleStartEdit = (task: SessionTaskItem) => {
    setEditingId(task.id);
    setEditText(task.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveEdit = (taskId: string) => {
    const trimmed = editText.trim();
    if (trimmed) {
      onUpdateTask(taskId, trimmed);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-3">
      <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg transition-all space-y-4">
        {/* Header & Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">Task Manager</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                  {completedCount} / {totalCount} done{totalCount > 0 && ` (${progressPercent}%)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                To-do checklist specific to this active race session.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
            title={isExpanded ? 'Collapse Task Manager' : 'Expand Task Manager'}
            aria-label={isExpanded ? 'Collapse Task Manager' : 'Expand Task Manager'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress Bar (when tasks exist) */}
        {totalCount > 0 && (
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Expandable Body */}
        {isExpanded && (
          <div className="space-y-3.5 pt-1">
            {/* Input Form */}
            <form onSubmit={handleAdd} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Add a task for this session (e.g. 20 push-ups, 10 squats)..."
                className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/50 text-slate-100 rounded-xl px-3.5 py-2 text-xs sm:text-sm placeholder:text-slate-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer shrink-0 min-h-[36px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Filter Tabs & Clear Action */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                      filter === 'all'
                        ? 'bg-slate-800 text-slate-100 shadow-xs'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('active')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                      filter === 'active'
                        ? 'bg-slate-800 text-slate-100 shadow-xs'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Active ({totalCount - completedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('completed')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                      filter === 'completed'
                        ? 'bg-slate-800 text-slate-100 shadow-xs'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>

                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearCompleted}
                    className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    Clear completed ({completedCount})
                  </button>
                )}
              </div>
            )}

            {/* Task Items List */}
            {filteredTasks.length > 0 ? (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {filteredTasks.map((task) => {
                  const isEditing = editingId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all group ${
                        task.completed
                          ? 'bg-slate-950/40 border-slate-800/50 text-slate-400'
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700/80 text-slate-200'
                      }`}
                    >
                      {/* Checkbox & Title */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          className="text-slate-400 hover:text-orange-400 transition cursor-pointer shrink-0"
                          title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                          aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                          )}
                        </button>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(task.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="flex-1 bg-slate-900 border border-orange-500/60 text-slate-100 rounded-lg px-2.5 py-1 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(task.id)}
                              className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded transition cursor-pointer"
                              title="Save"
                              aria-label="Save edit"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
                              title="Cancel"
                              aria-label="Cancel edit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onDoubleClick={() => handleStartEdit(task)}
                            className={`text-xs sm:text-sm font-medium truncate cursor-pointer ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                            title="Double click to edit"
                          >
                            {task.title}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(task)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit task title"
                            aria-label={`Edit "${task.title}"`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                            title="Delete task"
                            aria-label={`Delete "${task.title}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : totalCount === 0 ? (
              <div className="text-center py-5 px-3 bg-slate-950/40 border border-dashed border-slate-800/80 rounded-xl text-xs text-slate-400">
                No tasks added for this race session yet. Add tasks above to track specific to-dos as you race.
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                No {filter} tasks found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
