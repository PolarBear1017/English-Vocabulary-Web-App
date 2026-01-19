import { Rating, createEmptyCard } from 'ts-fsrs';

const normalizeEntries = (data) => {
  if (Array.isArray(data.entries) && data.entries.length > 0) {
    return data.entries.map((entry) => ({
      ...entry,
      examples: Array.isArray(entry.examples) ? entry.examples : (entry.example ? [entry.example] : [])
    }));
  }

  if (data.definition || data.translation || data.example) {
    const example = data.example || '';
    return [{
      definition: data.definition || '',
      translation: data.translation || '',
      example,
      examples: example ? [example] : []
    }];
  }

  return [];
};

const buildFsrsCard = (data = {}) => {
  const card = createEmptyCard();
  if (data.due) card.due = new Date(data.due);
  if (!data.due && data.nextReview) card.due = new Date(data.nextReview);
  if (data.stability !== undefined && data.stability !== null) card.stability = data.stability;
  if (data.difficulty !== undefined && data.difficulty !== null) card.difficulty = data.difficulty;
  if (data.elapsed_days !== undefined && data.elapsed_days !== null) card.elapsed_days = data.elapsed_days;
  if (data.scheduled_days !== undefined && data.scheduled_days !== null) card.scheduled_days = data.scheduled_days;
  if (data.reps !== undefined && data.reps !== null) card.reps = data.reps;
  if (data.lapses !== undefined && data.lapses !== null) card.lapses = data.lapses;
  if (data.state !== undefined && data.state !== null) card.state = data.state;
  if (data.last_review) card.last_review = new Date(data.last_review);
  return card;
};

const serializeFsrsCard = (card) => ({
  due: card.due ? new Date(card.due).toISOString() : new Date().toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: card.elapsed_days,
  scheduled_days: card.scheduled_days,
  reps: card.reps,
  lapses: card.lapses,
  state: card.state,
  last_review: card.last_review ? new Date(card.last_review).toISOString() : null
});

const mapGradeToFsrsRating = (grade) => {
  if (grade <= 1) return Rating.Again;
  if (grade === 2) return Rating.Hard;
  if (grade === 3) return Rating.Good;
  return Rating.Easy;
};

const formatDate = (date) => new Date(date).toLocaleDateString('zh-TW');

const splitExampleLines = (example = '') => {
  const trimmed = example.trim();
  if (!trimmed) return [];
  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map(line => line.trim()).filter(Boolean);
  }
  const cjkMatch = trimmed.match(/[\u4e00-\u9fff]/);
  if (cjkMatch && cjkMatch.index > 0) {
    const english = trimmed.slice(0, cjkMatch.index).trim();
    const chinese = trimmed.slice(cjkMatch.index).trim();
    if (english && chinese) return [english, chinese];
  }
  return [trimmed];
};

const parseReviewDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getReviewTimestamp = (value, fallback = 0) => {
  const date = parseReviewDate(value);
  return date ? date.getTime() : fallback;
};

const isReviewDue = (value, referenceDate = new Date()) => {
  const date = parseReviewDate(value);
  if (!date) return true;
  return date.getTime() <= referenceDate.getTime();
};

const getLevenshteinDistance = (a = '', b = '') => {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const dp = Array.from({ length: aLen + 1 }, () => new Array(bLen + 1).fill(0));
  for (let i = 0; i <= aLen; i += 1) dp[i][0] = i;
  for (let j = 0; j <= bLen; j += 1) dp[0][j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[aLen][bLen];
};

const calculateReviewResult = (userAnswer = '', correctAnswer = '') => {
  const normalizedAnswer = userAnswer.toLowerCase().trim();
  const normalizedCorrect = correctAnswer.toLowerCase().trim();

  if (normalizedAnswer === normalizedCorrect) {
    return { grade: 3, feedbackType: 'correct', allowRetry: false };
  }

  const wordLen = normalizedCorrect.length;
  const distance = getLevenshteinDistance(normalizedAnswer, normalizedCorrect);
  const isTypo = wordLen > 3 && distance <= 1;

  if (isTypo) {
    return { grade: 2, feedbackType: 'typo', allowRetry: false };
  }

  return { grade: 1, feedbackType: 'incorrect', allowRetry: true };
};

export {
  normalizeEntries,
  buildFsrsCard,
  serializeFsrsCard,
  mapGradeToFsrsRating,
  formatDate,
  splitExampleLines,
  parseReviewDate,
  getReviewTimestamp,
  isReviewDue,
  calculateReviewResult
};
