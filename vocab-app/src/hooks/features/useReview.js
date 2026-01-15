import { useCallback, useEffect, useMemo, useState } from 'react';
import { FSRS, Rating, generatorParameters } from 'ts-fsrs';
import {
  buildFsrsCard,
  serializeFsrsCard,
  calculateReviewResult,
  normalizeEntries,
  splitExampleLines
} from '../../utils/data';
import { getClozeValidAnswers } from '../../utils/text.jsx';
import { updateUserLibraryProgress } from '../../services/libraryService';
import { speak } from '../../services/speechService';

const useReview = ({
  vocabData,
  updateWord,
  session,
  requestRetention,
  folders,
  allFolderIds,
  setActiveTab,
  activeTab,
  preferredAccent
}) => {
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [isAwaitingNext, setIsAwaitingNext] = useState(false);
  const [pendingAutoGrade, setPendingAutoGrade] = useState(null);
  const [answerHint, setAnswerHint] = useState('');
  const [hasMistake, setHasMistake] = useState(false);
  const [selectedReviewFolders, setSelectedReviewFolders] = useState(['all']);
  const [reviewSetupView, setReviewSetupView] = useState('main');

  const fsrsParams = useMemo(() => generatorParameters({
    enable_fuzzing: true,
    request_retention: requestRetention
  }), [requestRetention]);
  const fsrs = useMemo(() => new FSRS(fsrsParams), [fsrsParams]);

  const currentReviewWord = reviewQueue[currentCardIndex] || {};
  const currentReviewEntries = useMemo(() => {
    if (reviewQueue.length === 0) return [];
    const selectedDefs = Array.isArray(currentReviewWord.selectedDefinitions)
      ? currentReviewWord.selectedDefinitions
      : (Array.isArray(currentReviewWord.selected_definitions)
        ? currentReviewWord.selected_definitions
        : []);
    if (selectedDefs.length === 0) return normalizeEntries(currentReviewWord);
    const normalizedSelected = normalizeEntries({ entries: selectedDefs });
    if (normalizedSelected.length === 0) return normalizeEntries(currentReviewWord);
    const randomIndex = Math.floor(Math.random() * normalizedSelected.length);
    return [normalizedSelected[randomIndex]];
  }, [currentReviewWord, reviewQueue.length]);
  const primaryReviewEntry = currentReviewEntries[0] || {};
  const clozeExample = primaryReviewEntry.example || currentReviewWord.example || '';
  const clozeExampleLines = splitExampleLines(clozeExample);
  const clozeExampleMain = clozeExampleLines[0] || clozeExample;
  const clozeTranslation = (() => {
    if (clozeExampleLines.length > 1) return clozeExampleLines[1];
    return primaryReviewEntry.translation || currentReviewWord.translation || '';
  })();

  const preferredReviewAudio = currentReviewWord
    ? (preferredAccent === 'uk'
      ? (currentReviewWord.ukAudioUrl || currentReviewWord.audioUrl || currentReviewWord.usAudioUrl)
      : (currentReviewWord.usAudioUrl || currentReviewWord.audioUrl || currentReviewWord.ukAudioUrl))
    : null;

  const allFoldersSelected = selectedReviewFolders.includes('all')
    || (allFolderIds.length > 0 && allFolderIds.every(id => selectedReviewFolders.includes(id)));

  const selectedFolderLabel = allFoldersSelected
    ? '全部資料夾'
    : folders
      .filter(folder => selectedReviewFolders.includes(folder.id))
      .map(folder => folder.name)
      .join('、') || '尚未選擇';

  const toggleReviewFolder = useCallback((folderId) => {
    setSelectedReviewFolders(prev => {
      const base = prev.includes('all') ? allFolderIds : prev;
      if (base.includes(folderId)) {
        const next = base.filter(id => id !== folderId);
        return next.length > 0 ? next : [];
      }
      return [...base, folderId];
    });
  }, [allFolderIds]);

  const buildReviewBatch = useCallback((words, batchSize) => {
    if (words.length <= batchSize) return words;
    const now = new Date();
    const rolloverCutoff = new Date(now);
    rolloverCutoff.setHours(24, 0, 0, 0);
    const dueWords = words
      .filter(word => new Date(word.nextReview) < rolloverCutoff)
      .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));

    if (dueWords.length >= batchSize) {
      return dueWords.slice(0, batchSize);
    }

    const slotsNeeded = batchSize - dueWords.length;
    const dueIds = new Set(dueWords.map(word => word.id));
    const newWords = words.filter(word => (word.proficiencyScore || 0) === 0 && !dueIds.has(word.id));
    const fillNewWords = newWords.slice(0, slotsNeeded);
    const selectedIds = new Set([...dueWords, ...fillNewWords].map(word => word.id));
    const remainingSlots = slotsNeeded - fillNewWords.length;

    let fillNotDue = [];
    if (remainingSlots > 0) {
      fillNotDue = words
        .filter(word => new Date(word.nextReview) >= rolloverCutoff && !selectedIds.has(word.id))
        .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
        .slice(0, remainingSlots);
    }

    const combined = [...dueWords, ...fillNewWords, ...fillNotDue].slice(0, batchSize);
    for (let i = combined.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined;
  }, []);

  const startReview = useCallback((folderSelection, mode) => {
    const selectedIds = Array.isArray(folderSelection) ? folderSelection : [folderSelection];
    const isAllSelected = selectedIds.includes('all')
      || (allFolderIds.length > 0 && allFolderIds.every(id => selectedIds.includes(id)));
    const filteredWords = vocabData.filter(word => {
      if (isAllSelected) return true;
      return word.folderIds && word.folderIds.some(id => selectedIds.includes(id));
    });
    if (filteredWords.length === 0) {
      alert("目前沒有可複習的單字！");
      return;
    }

    const reviewBatch = buildReviewBatch(filteredWords, 10);
    setReviewQueue(reviewBatch);
    setCurrentCardIndex(0);
    setReviewMode(mode);
    setIsFlipped(false);
    setUserAnswer('');
    setFeedback(null);
    setIsAwaitingNext(false);
    setPendingAutoGrade(null);
    setAnswerHint('');
    setHasMistake(false);
    setActiveTab('review_session');
  }, [allFolderIds, buildReviewBatch, setActiveTab, vocabData]);

  function advanceToNextCard() {
    if (pendingAutoGrade !== null) {
      processRating(pendingAutoGrade, { advance: false });
      setPendingAutoGrade(null);
    }

    if (currentCardIndex < reviewQueue.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setUserAnswer('');
      setFeedback(null);
      setIsAwaitingNext(false);
      setAnswerHint('');
      setHasMistake(false);
    } else {
      alert("複習完成！");
      setActiveTab('review');
    }
  }

  useEffect(() => {
    if (!(activeTab === 'review_session' && reviewMode !== 'flashcard' && isFlipped && isAwaitingNext)) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        advanceToNextCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, advanceToNextCard, isAwaitingNext, isFlipped, reviewMode]);

  useEffect(() => {
    if (activeTab !== 'review_session' || reviewQueue.length === 0) return;

    const handleKeyDown = (event) => {
      if (event.repeat) return;
      const key = event.key;

      if (['1', '2', '3', '4'].includes(key) && isFlipped && reviewMode === 'flashcard') {
        event.preventDefault();
        processRating(Number(key));
        return;
      }

      if ((key === 'Enter' || key === ' ') && !isAwaitingNext) {
        if (!isFlipped) {
          event.preventDefault();
          if (reviewMode === 'flashcard') {
            setIsFlipped(true);
          } else {
            checkAnswer();
          }
          return;
        }

        if (reviewMode === 'flashcard') {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, checkAnswer, isAwaitingNext, isFlipped, processRating, reviewMode, reviewQueue.length]);

  useEffect(() => {
    if (activeTab !== 'review_session' || !isFlipped) return;
    if (!currentReviewWord?.word) return;
    speak(currentReviewWord.word, preferredReviewAudio);
  }, [activeTab, currentReviewWord?.word, isFlipped, preferredReviewAudio]);

  useEffect(() => {
    if (activeTab !== 'review_session' || isFlipped) return;
    if (reviewMode !== 'dictation') return;
    if (!currentReviewWord?.word) return;
    speak(currentReviewWord.word, preferredReviewAudio);
  }, [activeTab, currentReviewWord?.word, isFlipped, preferredReviewAudio, reviewMode]);

  function processRating(grade, options = {}) {
    const currentWord = reviewQueue[currentCardIndex];
    if (!currentWord) {
      setActiveTab('review');
      return;
    }

    const prevScore = currentWord.proficiencyScore || 0;
    const now = new Date();
    const rating = grade <= 1 ? Rating.Again : grade === 2 ? Rating.Hard : grade === 3 ? Rating.Good : Rating.Easy;
    const currentCard = buildFsrsCard(currentWord);
    const schedulingCards = fsrs.repeat(currentCard, now);
    const nextCardRecord = schedulingCards[rating];
    const nextCard = nextCardRecord.card;
    const fsrsState = serializeFsrsCard(nextCard);
    let nextReviewIso = fsrsState.due;
    if (fsrsState.scheduled_days > 2) {
      const nowMs = now.getTime();
      const dueMs = new Date(fsrsState.due).getTime();
      const fuzzFactor = 0.95 + Math.random() * 0.1;
      const fuzzedMs = nowMs + (dueMs - nowMs) * fuzzFactor;
      nextReviewIso = new Date(fuzzedMs).toISOString();
      fsrsState.due = nextReviewIso;
    }

    let scoreChange = grade - 3;
    let newScore = prevScore + scoreChange;

    if (prevScore === 0 && grade >= 3) newScore = Math.max(1, newScore);
    newScore = Math.max(0, Math.min(5, newScore));

    updateWord(currentWord.id, { ...fsrsState, nextReview: nextReviewIso, proficiencyScore: newScore });

    if (session) {
      const updatePayload = {
        ...fsrsState,
        next_review: nextReviewIso,
        proficiency_score: newScore
      };

      updateUserLibraryProgress({ libraryId: currentWord.libraryId, payload: updatePayload }).then(({ error }) => {
        if (error && error.code === '42703') {
          updateUserLibraryProgress({
            libraryId: currentWord.libraryId,
            payload: {
              next_review: nextReviewIso,
              proficiency_score: newScore
            }
          }).then(({ error: retryError }) => {
            if (retryError) console.error("更新複習進度失敗:", retryError);
          });
        } else if (error) {
          console.error("更新複習進度失敗:", error);
        }
      });
    }

    const shouldAdvance = options.advance !== false;
    if (shouldAdvance) {
      advanceToNextCard();
    }
  }

  function checkAnswer() {
    const currentWord = reviewQueue[currentCardIndex];
    if (!currentWord) {
      setActiveTab('review');
      return;
    }
    const isStrictMode = reviewMode === 'spelling' || reviewMode === 'cloze' || reviewMode === 'dictation';
    let result = { grade: 3, feedbackType: 'correct', allowRetry: false };

    if (isStrictMode) {
      if (reviewMode === 'cloze') {
        const { validAnswers, contextMatches } = getClozeValidAnswers(clozeExampleMain, currentWord.word);
        result = validAnswers.reduce((bestResult, answer) => {
          const candidate = calculateReviewResult(userAnswer, answer);
          if (candidate.grade > bestResult.grade) return candidate;
          if (candidate.grade === bestResult.grade && candidate.allowRetry === false) return candidate;
          return bestResult;
        }, { grade: 1, feedbackType: 'incorrect', allowRetry: true });

        const normalizedAnswer = userAnswer.toLowerCase().trim();
        const targetLower = (currentWord.word || '').toLowerCase().trim();
        const contextLower = contextMatches.map((contextWord) => contextWord.toLowerCase());
        const hasContextMatch = contextLower.includes(normalizedAnswer);
        const hasDifferentContext = contextLower.some((contextWord) => contextWord && contextWord !== targetLower);
        const contextWord = contextMatches.find((contextWord) => contextWord && contextWord.toLowerCase() !== targetLower)
          || contextMatches[0]
          || '';

        if (result.grade >= 3) {
          if (normalizedAnswer === targetLower && hasDifferentContext && !hasContextMatch) {
            result = { ...result, feedbackType: 'root_match', correctContextWord: contextWord };
          } else if (hasContextMatch || normalizedAnswer === targetLower) {
            result = { ...result, feedbackType: 'exact', correctContextWord: contextWord };
          }
        }
      } else {
        result = calculateReviewResult(userAnswer, currentWord.word);
      }
    }

    if (reviewMode !== 'flashcard' && result.allowRetry) {
      setFeedback('incorrect');
      setLastResult(result);
      setIsFlipped(false);
      setPendingAutoGrade(null);
      setIsAwaitingNext(false);
      setUserAnswer('');
      setAnswerHint(currentWord.word);
      setHasMistake(true);
      return result;
    }

    const finalIncorrect = isStrictMode && hasMistake;
    const normalizedResult = finalIncorrect ? { ...result, feedbackType: 'incorrect', allowRetry: false } : result;
    const uiFeedback = ['exact', 'root_match'].includes(normalizedResult.feedbackType)
      ? 'correct'
      : normalizedResult.feedbackType;
    setFeedback(uiFeedback);
    setLastResult(normalizedResult);
    setIsFlipped(true);
    setAnswerHint('');

    if (reviewMode !== 'flashcard') {
      if (isAwaitingNext) return;
      const autoGrade = finalIncorrect ? 1 : result.grade;
      setPendingAutoGrade(autoGrade);
      setIsAwaitingNext(true);
    }
    return normalizedResult;
  }

  function handleAnswerChange(value) {
    setUserAnswer(value);
    if (feedback === 'incorrect') {
      setFeedback(null);
      setIsAwaitingNext(false);
    }
    if (answerHint) setAnswerHint('');
  }

  return {
    state: {
      reviewQueue,
      currentCardIndex,
      reviewMode,
      isFlipped,
      userAnswer,
      feedback,
      isAwaitingNext,
      pendingAutoGrade,
      answerHint,
      hasMistake,
      lastResult,
      selectedReviewFolders,
      reviewSetupView
    },
    derived: {
      currentReviewWord,
      currentReviewEntries,
      primaryReviewEntry,
      clozeExampleMain,
      clozeTranslation,
      preferredReviewAudio,
      allFoldersSelected,
      selectedFolderLabel
    },
    actions: {
      setReviewSetupView,
      setSelectedReviewFolders,
      setReviewMode,
      setIsFlipped,
      startReview,
      advanceToNextCard,
      processRating,
      checkAnswer,
      handleAnswerChange,
      toggleReviewFolder
    }
  };
};

export default useReview;
