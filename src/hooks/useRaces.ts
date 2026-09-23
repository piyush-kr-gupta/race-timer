import { useState, useEffect, useCallback } from 'react';
import { RaceTemplate, RaceRun } from '../types/race';
import { storage } from '../services/storage/indexedDb';

export function useRaces() {
  const [templates, setTemplates] = useState<RaceTemplate[]>([]);
  const [runs, setRuns] = useState<RaceRun[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [tList, rList] = await Promise.all([
        storage.getAllTemplates(),
        storage.getAllRuns(),
      ]);
      setTemplates(tList);
      setRuns(rList);
    } catch (e) {
      console.error('Failed to load races:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveTemplate = async (template: RaceTemplate) => {
    const saved = await storage.saveTemplate(template);
    await refresh();
    return saved;
  };

  const deleteTemplate = async (id: string) => {
    await storage.deleteTemplate(id);
    await refresh();
  };

  const duplicateTemplate = async (id: string) => {
    const dup = await storage.duplicateTemplate(id);
    await refresh();
    return dup;
  };

  const toggleArchive = async (id: string) => {
    const t = templates.find((item) => item.id === id);
    if (t) {
      await storage.saveTemplate({
        ...t,
        isArchived: !t.isArchived,
      });
      await refresh();
    }
  };

  const deleteRun = async (id: string) => {
    await storage.deleteRun(id);
    await refresh();
  };

  const clearAllRuns = async () => {
    await storage.clearAllRuns();
    await refresh();
  };

  const resetSeedData = async () => {
    const result = await storage.resetSeedData();
    await refresh();
    return result;
  };

  return {
    templates,
    runs,
    loading,
    refresh,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleArchive,
    deleteRun,
    clearAllRuns,
    resetSeedData,
  };
}
