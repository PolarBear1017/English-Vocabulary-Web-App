import { createVocabularyWord } from '../models';

const mapLibraryRowToWord = (item) => {
  const rawFolderIds = Array.isArray(item.folder_ids) ? item.folder_ids : ['default'];
  const normalizedFolderIds = rawFolderIds.map(id => id?.toString());

  return createVocabularyWord({
    ...item.dictionary,
    audioUrl: item.dictionary?.audioUrl ?? item.dictionary?.audio_url ?? null,
    usAudioUrl: item.dictionary?.usAudioUrl ?? item.dictionary?.us_audio_url ?? null,
    ukAudioUrl: item.dictionary?.ukAudioUrl ?? item.dictionary?.uk_audio_url ?? null,
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
    last_review: item.last_review ?? null,
    source: item.source ?? item.dictionary?.source ?? null,
    isAiGenerated: item.is_ai_generated ?? item.dictionary?.is_ai_generated ?? item.dictionary?.isAiGenerated ?? false
  });
};

export { mapLibraryRowToWord };
