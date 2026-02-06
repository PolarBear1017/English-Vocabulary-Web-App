import { createVocabularyWord } from '../domain/models';
import { parseReviewDate } from './data';

const normalizeIsoDate = (value, fallbackIso) => {
  const parsed = parseReviewDate(value);
  return parsed ? parsed.toISOString() : fallbackIso;
};

const entryToWord = ({
  entry,
  baseWord = {},
  normalizedFolderId = null,
  normalizedSelectedDefinitions = null,
  nowIso = new Date().toISOString()
}) => {
  // 1. Try to read from entry's joined table (if available)
  const entryIds = (() => {
    if (entry?.library_folder_map && Array.isArray(entry.library_folder_map)) {
      return entry.library_folder_map
        .map(ref => ref.folder_id?.toString())
        .filter(Boolean);
    }
    // Legacy check (if ever needed during transition)
    if (Array.isArray(entry?.folder_ids) && entry.folder_ids.length > 0) {
      return entry.folder_ids.map(id => id?.toString()).filter(Boolean);
    }
    return [];
  })();

  // 2. Determine final Folder IDs
  // If DB returned updated folders (via map), use them.
  // Otherwise, if we have a specific target folder (normalizedFolderId), assume we successfully saved to it.
  // Fallback to baseWord (optimistic) state.
  const mergedFolderIds = (entryIds.length > 0)
    ? entryIds
    : (normalizedFolderId
      ? Array.from(new Set([...(baseWord.folderIds || []), normalizedFolderId]))
      : (baseWord.folderIds || []));

  const mergedSelectedDefinitions = Array.isArray(entry?.selected_definitions)
    ? entry.selected_definitions
    : (Array.isArray(baseWord.selectedDefinitions)
      ? baseWord.selectedDefinitions
      : normalizedSelectedDefinitions);

  const nextReviewIso = normalizeIsoDate(
    entry?.next_review || entry?.due || baseWord?.nextReview,
    nowIso
  );
  const dueIso = normalizeIsoDate(
    entry?.due || entry?.next_review || baseWord?.due || baseWord?.nextReview,
    nowIso
  );

  return createVocabularyWord({
    ...baseWord,
    source: entry?.source ?? entry?.ai_source ?? baseWord.source ?? null,
    isAiGenerated: entry?.is_ai_generated ?? entry?.isAiGenerated ?? baseWord.isAiGenerated ?? false,
    id: entry?.word_id?.toString() || baseWord.id,
    libraryId: entry?.id ?? baseWord.libraryId ?? null,
    folderIds: mergedFolderIds,
    selectedDefinitions: mergedSelectedDefinitions,
    addedAt: entry?.created_at || baseWord.addedAt || nowIso,
    nextReview: nextReviewIso,
    due: dueIso,
    stability: entry?.stability ?? baseWord.stability ?? null,
    difficulty: entry?.difficulty ?? baseWord.difficulty ?? null,
    elapsed_days: entry?.elapsed_days ?? baseWord.elapsed_days ?? null,
    scheduled_days: entry?.scheduled_days ?? baseWord.scheduled_days ?? null,
    reps: entry?.reps ?? baseWord.reps ?? null,
    lapses: entry?.lapses ?? baseWord.lapses ?? null,
    state: entry?.state ?? baseWord.state ?? null,
    last_review: entry?.last_review ?? baseWord.last_review ?? null,
    proficiencyScore: entry?.proficiency_score ?? baseWord.proficiencyScore ?? 0
  });
};

export { entryToWord };
