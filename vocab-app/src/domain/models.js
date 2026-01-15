/**
 * @typedef {Object} SearchEntry
 * @property {string} definition
 * @property {string} translation
 * @property {string} example
 * @property {string[]} examples
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} word
 * @property {string} pos
 * @property {string} phonetic
 * @property {string} definition
 * @property {string} translation
 * @property {string} example
 * @property {SearchEntry[]} entries
 * @property {string[]} similar
 * @property {string|null} mnemonics
 * @property {string|null} audioUrl
 * @property {string|null} usAudioUrl
 * @property {string|null} ukAudioUrl
 * @property {string} source
 * @property {boolean} isAiGenerated
 */

/**
 * @typedef {Object} VocabularyWord
 * @property {string} id
 * @property {string} word
 * @property {string} pos
 * @property {string} phonetic
 * @property {string} definition
 * @property {string} translation
 * @property {string} example
 * @property {string[]} similar
 * @property {string|null} mnemonics
 * @property {string[]} folderIds
 * @property {string|number|null} libraryId
 * @property {string|null} addedAt
 * @property {string|null} nextReview
 * @property {string|null} due
 * @property {number|null} stability
 * @property {number|null} difficulty
 * @property {number|null} elapsed_days
 * @property {number|null} scheduled_days
 * @property {number|null} reps
 * @property {number|null} lapses
 * @property {number|null} state
 * @property {string|null} last_review
 * @property {number} proficiencyScore
 * @property {Array|undefined|null} selectedDefinitions
 */

const createSearchResult = (data = {}) => ({
  word: data.word || '',
  pos: data.pos || '',
  phonetic: data.phonetic || '',
  definition: data.definition || '',
  translation: data.translation || '',
  example: data.example || '',
  entries: Array.isArray(data.entries) ? data.entries : [],
  similar: Array.isArray(data.similar) ? data.similar : [],
  mnemonics: data.mnemonics ?? null,
  audioUrl: data.audioUrl ?? null,
  usAudioUrl: data.usAudioUrl ?? null,
  ukAudioUrl: data.ukAudioUrl ?? null,
  source: data.source || '',
  isAiGenerated: Boolean(data.isAiGenerated)
});

const createVocabularyWord = (data = {}) => ({
  id: data.id || '',
  word: data.word || '',
  pos: data.pos || '',
  phonetic: data.phonetic || '',
  definition: data.definition || '',
  translation: data.translation || '',
  example: data.example || '',
  similar: Array.isArray(data.similar) ? data.similar : [],
  mnemonics: data.mnemonics ?? null,
  folderIds: Array.isArray(data.folderIds) ? data.folderIds : [],
  libraryId: data.libraryId ?? null,
  addedAt: data.addedAt ?? null,
  nextReview: data.nextReview ?? null,
  due: data.due ?? null,
  stability: data.stability ?? null,
  difficulty: data.difficulty ?? null,
  elapsed_days: data.elapsed_days ?? null,
  scheduled_days: data.scheduled_days ?? null,
  reps: data.reps ?? null,
  lapses: data.lapses ?? null,
  state: data.state ?? null,
  last_review: data.last_review ?? null,
  proficiencyScore: Number.isFinite(data.proficiencyScore) ? data.proficiencyScore : 0,
  selectedDefinitions: Array.isArray(data.selectedDefinitions) ? data.selectedDefinitions : data.selectedDefinitions ?? null
});

export { createSearchResult, createVocabularyWord };
