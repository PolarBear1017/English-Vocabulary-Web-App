const STORAGE_VERSION = 1;
const STORAGE_KEYS = {
  version: 'vocab_storage_version',
  folders: 'vocab_folders',
  vocabData: 'vocab_data',
  lastUsedFolders: 'last_used_folders',
  groqKey: 'groq_api_key',
  requestRetention: 'request_retention',
  folderSortBy: 'folder_sort_by',
  wordSortBy: 'word_sort_by',
  dictionaryPriority: 'dictionary_priority'
};

const ensureStorageVersion = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.version);
  const current = raw ? Number(raw) : 0;
  if (!Number.isFinite(current) || current < STORAGE_VERSION) {
    localStorage.setItem(STORAGE_KEYS.version, String(STORAGE_VERSION));
  }
};

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to parse storage key: ${key}`, error);
    return fallback;
  }
};

const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const readString = (key, fallback = '') => {
  const value = localStorage.getItem(key);
  return value ?? fallback;
};

const writeString = (key, value) => {
  localStorage.setItem(key, value);
};

const loadCachedFolders = () => readJSON(STORAGE_KEYS.folders, [{ id: 'default', name: '預設資料夾', words: [] }]);
const saveCachedFolders = (folders) => writeJSON(STORAGE_KEYS.folders, folders);

const loadCachedVocab = () => readJSON(STORAGE_KEYS.vocabData, []);
const saveCachedVocab = (vocabData) => writeJSON(STORAGE_KEYS.vocabData, vocabData);

const loadLastUsedFolders = () => readJSON(STORAGE_KEYS.lastUsedFolders, []);
const saveLastUsedFolders = (folderIds) => writeJSON(STORAGE_KEYS.lastUsedFolders, folderIds);

const loadGroqKey = () => readString(STORAGE_KEYS.groqKey, '');
const saveGroqKey = (value) => writeString(STORAGE_KEYS.groqKey, value);

const loadRequestRetention = () => {
  const raw = readString(STORAGE_KEYS.requestRetention, '0.9');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0.9;
};
const saveRequestRetention = (value) => writeString(STORAGE_KEYS.requestRetention, String(value));

const loadFolderSortBy = () => readString(STORAGE_KEYS.folderSortBy, 'created_desc');
const saveFolderSortBy = (value) => writeString(STORAGE_KEYS.folderSortBy, value);

const loadWordSortBy = () => readString(STORAGE_KEYS.wordSortBy, 'added_desc');
const saveWordSortBy = (value) => writeString(STORAGE_KEYS.wordSortBy, value);

const loadDictionaryPriority = () => readJSON(STORAGE_KEYS.dictionaryPriority, ['Cambridge', 'Yahoo', 'Google Translate', 'Groq AI']);
const saveDictionaryPriority = (value) => writeJSON(STORAGE_KEYS.dictionaryPriority, value);

export {
  STORAGE_VERSION,
  STORAGE_KEYS,
  ensureStorageVersion,
  readJSON,
  writeJSON,
  readString,
  writeString,
  loadCachedFolders,
  saveCachedFolders,
  loadCachedVocab,
  saveCachedVocab,
  loadLastUsedFolders,
  saveLastUsedFolders,
  loadGroqKey,
  saveGroqKey,
  loadRequestRetention,
  saveRequestRetention,
  loadFolderSortBy,
  saveFolderSortBy,
  loadWordSortBy,
  saveWordSortBy,
  loadDictionaryPriority,
  saveDictionaryPriority
};
