import { describe, it, expect, vi } from 'vitest';
import { storage } from './indexedDb';
import { RaceTemplate } from '../../types/race';

describe('StorageService - duplicateTemplate', () => {
  const originalTemplate: RaceTemplate = {
    id: 'race-orig-1',
    name: 'Morning Routine',
    category: 'Productivity',
    tags: ['Routine'],
    order: 0,
    isSample: true,
    manualDoneDate: '2026-11-20',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    tasks: [
      { id: 'task-orig-1', name: 'Stretch', durationSeconds: 300, order: 0, enabled: true },
      { id: 'task-orig-2', name: 'Hydrate', durationSeconds: 120, order: 1, enabled: true },
    ],
  };

  const otherTemplate: RaceTemplate = {
    id: 'race-other-2',
    name: 'Evening Routine',
    category: 'Wind Down',
    tags: ['Night'],
    order: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    tasks: [],
  };

  it('persists duplicate with saveTemplate and positions it directly after original', async () => {
    vi.spyOn(storage, 'getTemplateById').mockResolvedValue(originalTemplate);
    vi.spyOn(storage, 'getAllTemplates').mockResolvedValue([originalTemplate, otherTemplate]);

    const saveTemplateSpy = vi.spyOn(storage, 'saveTemplate').mockImplementation(async (tpl) => tpl);
    const reorderSpy = vi.spyOn(storage, 'reorderTemplates').mockImplementation(async (ids) => {
      return ids.map((id, idx) => ({
        id,
        name: id === 'race-orig-1' ? originalTemplate.name : 'Copy',
        category: 'Test',
        tags: [],
        order: idx,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
      }));
    });

    const result = await storage.duplicateTemplate('race-orig-1');

    // 1. Must call saveTemplate with duplicate so it is written to storage
    expect(saveTemplateSpy).toHaveBeenCalledTimes(1);
    const savedArg = saveTemplateSpy.mock.calls[0][0];
    expect(savedArg.name).toBe('Morning Routine (Copy)');
    expect(savedArg.id).not.toBe('race-orig-1');
    expect(savedArg.isSample).toBe(false);
    expect(savedArg.manualDoneDate).toBeUndefined();
    expect(savedArg.manualActiveDate).toBeUndefined();
    expect(savedArg.tasks).toHaveLength(2);
    expect(savedArg.tasks[0].id).not.toBe('task-orig-1');
    expect(savedArg.tasks[1].id).not.toBe('task-orig-2');

    // 2. Must reorder with duplicate placed right after original
    expect(reorderSpy).toHaveBeenCalledTimes(1);
    const reorderedIds = reorderSpy.mock.calls[0][0];
    expect(reorderedIds).toEqual(['race-orig-1', savedArg.id, 'race-other-2']);

    // 3. Result returned has duplicate details
    expect(result.id).toBe(savedArg.id);
  });

  it('throws an error if the original template does not exist', async () => {
    vi.spyOn(storage, 'getTemplateById').mockResolvedValue(null);

    await expect(storage.duplicateTemplate('non-existent-id')).rejects.toThrow(
      'Race template with id "non-existent-id" not found.'
    );
  });
});
