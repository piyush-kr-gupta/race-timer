import { ActiveRunRuntimeState, RaceTemplate, RaceRun } from '../../types/race';
import { isRunFullyCompleted } from '../../services/storage/indexedDb';
import { formatDurationHuman } from '../../utils/duration';
import { Play, Edit3, Copy, Trash2, Archive, ArchiveRestore, Clock, CheckCircle, RotateCcw } from 'lucide-react';

interface RaceCardProps {
  template: RaceTemplate;
  lastRun?: RaceRun;
  savedRun?: ActiveRunRuntimeState;
  onStart: (template: RaceTemplate) => void;
  onResumeSaved?: (saved: ActiveRunRuntimeState) => void;
  onEdit: (template: RaceTemplate) => void;
  onDuplicate: (templateId: string) => void;
  onToggleArchive: (templateId: string) => void;
  onDelete: (templateId: string, name: string) => void;
}

export const RaceCard: React.FC<RaceCardProps> = ({
  template,
  lastRun,
  savedRun,
  onStart,
  onResumeSaved,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}) => {
  const enabledTasks = template.tasks.filter((t) => t.enabled);
  const totalSeconds = enabledTasks.reduce((sum, t) => sum + t.durationSeconds, 0);

  // Only consider savedRun active if it's not fully completed
  const activeSavedRun = savedRun && !isRunFullyCompleted(savedRun) ? savedRun : undefined;

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition shadow-lg hover:shadow-xl group">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
            {template.category || 'General'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeSavedRun && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                In Progress ({activeSavedRun.currentTaskIndex + 1}/{activeSavedRun.templateSnapshot.tasks.length})
              </span>
            )}
            {template.isSample && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                Sample
              </span>
            )}
            {template.isArchived && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/60">
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-100 group-hover:text-orange-400 transition line-clamp-1">
          {template.name}
        </h3>

        {/* Description */}
        {template.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-300 font-medium">
          <span className="flex items-center gap-1.5 text-slate-200">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            {formatDurationHuman(totalSeconds)}
          </span>
          <span className="text-slate-400">
            {enabledTasks.length} {enabledTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Last Run Summary (if executed) */}
        {lastRun && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle className="w-3 h-3" />
              Last: {formatDurationHuman(lastRun.totalActualSeconds)}
            </span>
            <span>{new Date(lastRun.startedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {activeSavedRun && onResumeSaved ? (
          <div className="flex-1 flex items-center gap-1.5">
            <button
              onClick={() => onResumeSaved(activeSavedRun)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[40px]"
              title={`Resume from Task ${activeSavedRun.currentTaskIndex + 1}`}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume ({activeSavedRun.currentTaskIndex + 1}/{activeSavedRun.templateSnapshot.tasks.length})</span>
            </button>
            <button
              onClick={() => onStart(template)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[40px] flex items-center justify-center"
              title="Start fresh from beginning"
              aria-label="Start fresh from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStart(template)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[40px]"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Start Race
          </button>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(template)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Edit race template"
            aria-label="Edit race"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicate(template.id)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Duplicate race template"
            aria-label="Duplicate race"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleArchive(template.id)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title={template.isArchived ? 'Unarchive' : 'Archive'}
            aria-label={template.isArchived ? 'Unarchive race' : 'Archive race'}
          >
            {template.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(template.id, template.name)}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Delete race template"
            aria-label="Delete race"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
