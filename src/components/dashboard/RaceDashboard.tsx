import React, { useState, useMemo } from 'react';
import { RaceTemplate, RaceRun } from '../../types/race';
import { RaceCard } from './RaceCard';
import { Plus, Search, Play, Sparkles } from 'lucide-react';

interface RaceDashboardProps {
  templates: RaceTemplate[];
  runs: RaceRun[];
  isRaceActive: boolean;
  activeRaceName?: string;
  onResumeActiveRace?: () => void;
  onCreateRace: () => void;
  onStartRace: (template: RaceTemplate) => void;
  onEditRace: (template: RaceTemplate) => void;
  onDuplicateRace: (templateId: string) => void;
  onToggleArchive: (templateId: string) => void;
  onDeleteRace: (templateId: string, name: string) => void;
}

export const RaceDashboard: React.FC<RaceDashboardProps> = ({
  templates,
  runs,
  isRaceActive,
  activeRaceName,
  onResumeActiveRace,
  onCreateRace,
  onStartRace,
  onEditRace,
  onDuplicateRace,
  onToggleArchive,
  onDeleteRace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'duration-desc' | 'duration-asc'>('updated');

  // Collect unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [templates]);

  // Map latest run for each template
  const latestRunsByTemplate = useMemo(() => {
    const map = new Map<string, RaceRun>();
    for (const run of runs) {
      if (!map.has(run.templateId)) {
        map.set(run.templateId, run);
      }
    }
    return map;
  }, [runs]);

  // Filtered & sorted templates
  const filteredTemplates = useMemo(() => {
    return templates
      .filter((t) => {
        // Archive filter
        if (filterMode === 'active' && t.isArchived) return false;
        if (filterMode === 'archived' && !t.isArchived) return false;

        // Category filter
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = t.name.toLowerCase().includes(q);
          const descMatch = (t.description || '').toLowerCase().includes(q);
          const catMatch = (t.category || '').toLowerCase().includes(q);
          const tagMatch = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
          const taskMatch = t.tasks.some((task) => task.name.toLowerCase().includes(q));
          if (!nameMatch && !descMatch && !catMatch && !tagMatch && !taskMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'duration-desc') {
          const durA = a.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          const durB = b.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          return durB - durA;
        }
        if (sortBy === 'duration-asc') {
          const durA = a.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          const durB = b.tasks.reduce((s, t) => s + t.durationSeconds, 0);
          return durA - durB;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [templates, searchQuery, selectedCategory, filterMode, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* Live Active Race Alert Banner */}
      {isRaceActive && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-950/80 via-amber-950/60 to-slate-900 border border-orange-500/40 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <div>
              <h4 className="text-sm font-bold text-orange-200">
                Active Race in Progress
              </h4>
              <p className="text-xs text-slate-300 font-medium">
                {activeRaceName || 'A race'} is running right now.
              </p>
            </div>
          </div>
          <button
            onClick={onResumeActiveRace}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer min-h-[40px]"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Resume Race
          </button>
        </div>
      )}

      {/* Main Bar: Search, Category, Sorting & Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search races, tasks, categories..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px] cursor-pointer"
            >
              <option value="updated">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
              <option value="duration-desc">Duration (Longest)</option>
              <option value="duration-asc">Duration (Shortest)</option>
            </select>
          </div>

          {/* Create Race Button */}
          <button
            onClick={onCreateRace}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Race</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Active vs Archived vs All */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterMode === 'active'
                ? 'bg-slate-800 text-orange-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({templates.filter((t) => !t.isArchived).length})
          </button>
          <button
            onClick={() => setFilterMode('archived')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterMode === 'archived'
                ? 'bg-slate-800 text-orange-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived ({templates.filter((t) => t.isArchived).length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-800 text-orange-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({templates.length})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Showing {filteredTemplates.length} {filteredTemplates.length === 1 ? 'race' : 'races'}
        </span>
      </div>

      {/* Race Cards Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <RaceCard
              key={template.id}
              template={template}
              lastRun={latestRunsByTemplate.get(template.id)}
              onStart={onStartRace}
              onEdit={onEditRace}
              onDuplicate={onDuplicateRace}
              onToggleArchive={onToggleArchive}
              onDelete={onDeleteRace}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200">No races found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No races match your search filters. Try a different query.'
                : 'Create your first race template and start competing against your own clock.'}
            </p>
          </div>
          <button
            onClick={onCreateRace}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Race
          </button>
        </div>
      )}
    </div>
  );
};
