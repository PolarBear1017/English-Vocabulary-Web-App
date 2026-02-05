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
  const mergedFolderIds = Array.isArray(entry?.folder_ids)
    ? entry.folder_ids.map(id => id?.toString()).filter(Boolean)
    : (Array.isArray(baseWord.folderIds)
      ? baseWord.folderIds.map(id => id?.toString()).filter(Boolean)
      : (normalizedFolderId ? [normalizedFolderId] : []));

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
