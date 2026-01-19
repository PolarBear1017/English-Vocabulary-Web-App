import { describe, expect, it } from 'vitest';
import { entryToWord } from './mapper';

describe('entryToWord', () => {
  it('maps snake_case entry fields to camelCase vocabulary word', () => {
    const nowIso = '2024-01-03T00:00:00.000Z';
    const entry = {
      id: 10,
      word_id: 20,
      folder_ids: [1, '2'],
      selected_definitions: [{ definition: 'd', translation: 't', example: 'ex', pos: 'n' }],
      next_review: '2024-01-01T00:00:00.000Z',
      due: '2024-01-02T00:00:00.000Z',
      stability: 3,
      difficulty: 4,
      elapsed_days: 1,
      scheduled_days: 2,
      reps: 5,
      lapses: 1,
      state: 2,
      last_review: '2023-12-31T00:00:00.000Z',
      proficiency_score: 3,
      created_at: '2023-12-30T00:00:00.000Z'
    };
    const baseWord = { word: 'hello', addedAt: nowIso };

    const result = entryToWord({ entry, baseWord, nowIso });

    expect(result.id).toBe('20');
    expect(result.libraryId).toBe(10);
    expect(result.folderIds).toEqual(['1', '2']);
    expect(result.selectedDefinitions).toEqual(entry.selected_definitions);
    expect(result.nextReview).toBe(entry.next_review);
    expect(result.due).toBe(entry.due);
    expect(result.proficiencyScore).toBe(3);
    expect(result.addedAt).toBe(entry.created_at);
  });

  it('falls back to nowIso when next_review is null or invalid', () => {
    const nowIso = '2024-02-01T00:00:00.000Z';
    const entry = { next_review: null, due: 'invalid-date' };

    const result = entryToWord({ entry, baseWord: {}, nowIso });

    expect(result.nextReview).toBe(nowIso);
    expect(result.due).toBe(nowIso);
  });

  it('defaults folderIds to empty array when folder_ids is missing', () => {
    const result = entryToWord({ entry: {}, baseWord: {} });
    expect(result.folderIds).toEqual([]);
  });

  it('uses legacy baseWord fields when entry data is missing', () => {
    const nowIso = '2024-02-10T00:00:00.000Z';
    const entry = {};
    const baseWord = {
      id: 'legacy',
      folderIds: ['default'],
      selectedDefinitions: [{ definition: 'legacy' }],
      nextReview: '2024-02-09T00:00:00.000Z',
      due: '2024-02-08T00:00:00.000Z'
    };

    const result = entryToWord({ entry, baseWord, nowIso });

    expect(result.id).toBe('legacy');
    expect(result.folderIds).toEqual(['default']);
    expect(result.selectedDefinitions).toEqual(baseWord.selectedDefinitions);
    expect(result.nextReview).toBe(baseWord.nextReview);
    expect(result.due).toBe(baseWord.due);
  });
});
