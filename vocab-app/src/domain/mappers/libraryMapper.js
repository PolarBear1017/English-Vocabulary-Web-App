import { createVocabularyWord } from '../models';

const mapLibraryRowToWord = (item) => {
  const rawFolderIds = Array.isArray(item.folder_ids) ? item.folder_ids : ['default'];
  const normalizedFolderIds = rawFolderIds.map(id => id?.toString());

  return createVocabularyWord({
    ...item.dictionary,
    id: item.word_id?.toString() || '',
    libraryId: item.id,
    folderIds: normalizedFolderIds,
    selectedDefinitions: Array.isArray(item.selected_definitions) ? item.selected_definitions : null,
    addedAt: item.created_at || null,
    nextReview: item.next_review || item.due || new Date().toISOString(),
    proficiencyScore: item.proficiency_score,
    due: item.due || item.next_review || new Date().toISOString(),
    stability: item.stability ?? null,
    difficulty: item.difficulty ?? null,
    elapsed_days: item.elapsed_days ?? null,
    scheduled_days: item.scheduled_days ?? null,
    reps: item.reps ?? null,
    lapses: item.lapses ?? null,
    state: item.state ?? null,
    last_review: item.last_review ?? null
  });
};

export { mapLibraryRowToWord };
