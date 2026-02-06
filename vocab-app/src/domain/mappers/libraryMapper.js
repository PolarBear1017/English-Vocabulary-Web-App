import { createVocabularyWord } from '../models';

const normalizeFolderIds = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map(id => id?.toString().trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(id => id?.toString()).filter(Boolean);
      }
    } catch (error) {
      // Fall through to Postgres array parsing.
    }
    const pgArray = trimmed.replace(/^\{|\}$/g, '');
    if (!pgArray) return [];
    return pgArray.split(',')
      .map(value => {
        let v = value.trim();
        if (v.startsWith('"') && v.endsWith('"')) {
          v = v.slice(1, -1);
        }
        return v;
      })
      .filter(Boolean)
      .map(id => id.toString());
  }
  if (raw === null || raw === undefined) return [];
  return [raw.toString()];
};

const normalizeSelectedDefinitions = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }
  return null;
};

const mapLibraryRowToWord = (item) => {
  const normalizedFolderIds = (() => {
    const ids = normalizeFolderIds(item.folder_ids);
    if (ids.length > 0) return ids;
    const legacyFolderId = item.folder_id ?? item.folderId ?? null;
    if (legacyFolderId !== null && legacyFolderId !== undefined && `${legacyFolderId}`) {
      return [legacyFolderId.toString()];
    }
    return ['default'];
  })();

  const normalizedSelectedDefinitions = normalizeSelectedDefinitions(item.selected_definitions);

  return createVocabularyWord({
    ...item.dictionary,
    audioUrl: item.dictionary?.audioUrl ?? item.dictionary?.audio_url ?? null,
    usAudioUrl: item.dictionary?.usAudioUrl ?? item.dictionary?.us_audio_url ?? null,
    ukAudioUrl: item.dictionary?.ukAudioUrl ?? item.dictionary?.uk_audio_url ?? null,
    id: item.word_id?.toString() || '',
    libraryId: item.id,
    folderIds: normalizedFolderIds,
    selectedDefinitions: normalizedSelectedDefinitions,
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
