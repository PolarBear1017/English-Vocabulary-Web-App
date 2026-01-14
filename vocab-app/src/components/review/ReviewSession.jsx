import React from 'react';
import { X, Volume2, Sparkles } from 'lucide-react';
import { splitExampleLines } from '../../utils/data';
import { formatClozeSentence, highlightWord } from '../../utils/text.jsx';
import { speak } from '../../services/speechService';

const ReviewSession = ({
  reviewQueue,
  currentCardIndex,
  reviewMode,
  isFlipped,
  userAnswer,
  feedback,
  lastResult,
  isAwaitingNext,
  answerHint,
  currentReviewWord,
  currentReviewEntries,
  primaryReviewEntry,
  clozeExampleMain,
  clozeTranslation,
  preferredReviewAudio,
  preferredAccent,
  setPreferredAccent,
  setActiveTab,
  setIsFlipped,
  handleAnswerChange,
  checkAnswer,
  processRating,
  advanceToNextCard
}) => (
  <div className="max-w-2xl mx-auto h-[calc(100vh-140px)] flex flex-col">
    <div className="flex justify-between items-center mb-4">
      <button onClick={() => setActiveTab('review')} className="text-gray-500 hover:text-gray-800"><X className="w-6 h-6" /></button>
      <div className="text-sm font-medium text-gray-500">{currentCardIndex + 1} / {reviewQueue.length}</div>
      <div className="w-6"></div>
    </div>

    <div className="flex-1 bg-white rounded-3xl shadow-lg border border-gray-200 relative overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
        {!isFlipped ? (
          <>
            {reviewMode === 'flashcard' && <h2 className="text-4xl font-bold text-gray-800">{currentReviewWord.word}</h2>}
            {reviewMode === 'spelling' && (
              <div className="space-y-4 w-full">
                <div className="text-xl text-gray-600">{primaryReviewEntry.translation || currentReviewWord.translation}</div>
                {currentReviewWord.pos && (
                  <div className="text-base text-gray-500 font-serif italic lowercase">{currentReviewWord.pos}</div>
                )}
                <input type="text" className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none text-2xl text-center py-2 bg-transparent placeholder:text-gray-400" value={userAnswer} placeholder={answerHint} onChange={e => handleAnswerChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }} autoFocus />
                {feedback === 'incorrect' && (
                  <p className="text-sm text-red-500">拼錯了，提示答案已顯示，請再輸入一次。</p>
                )}
              </div>
            )}
            {reviewMode === 'cloze' && (
              <div className="space-y-6 w-full">
                <div className="text-xl text-gray-700 leading-relaxed">
                  {formatClozeSentence(clozeExampleMain, currentReviewWord.word)}
                </div>
                <div className="text-sm text-gray-500">{clozeTranslation}</div>
                {currentReviewWord.pos && (
                  <div className="text-base text-gray-500 font-serif italic lowercase">{currentReviewWord.pos}</div>
                )}
                <input type="text" className="w-full border p-3 rounded-lg text-center placeholder:text-gray-400" value={userAnswer} placeholder={answerHint} onChange={e => handleAnswerChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }} autoFocus />
                {feedback === 'incorrect' && (
                  <p className="text-sm text-red-500">拼錯了，提示答案已顯示，請再輸入一次。</p>
                )}
              </div>
            )}
            {reviewMode === 'dictation' && (
              <div className="space-y-6 w-full flex flex-col items-center">
                <button onClick={() => speak(currentReviewWord.word, preferredReviewAudio)} className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition animate-pulse"><Volume2 className="w-8 h-8" /></button>
                <input type="text" className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none text-2xl text-center py-2 placeholder:text-gray-400" value={userAnswer} placeholder={answerHint} onChange={e => handleAnswerChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }} autoFocus />
                {feedback === 'incorrect' && (
                  <p className="text-sm text-red-500">拼錯了，提示答案已顯示，請再輸入一次。</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300 w-full">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold text-gray-800">{currentReviewWord.word}</h2>
              <button onClick={() => speak(currentReviewWord.word, preferredReviewAudio)}><Volume2 className="w-6 h-6 text-blue-600" /></button>
              {(currentReviewWord.usAudioUrl || currentReviewWord.ukAudioUrl) && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreferredAccent('us')}
                    className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'us' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                  >
                    US
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredAccent('uk')}
                    className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'uk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                  >
                    UK
                  </button>
                </div>
              )}
            </div>
            <div className="text-gray-500 font-serif italic">{currentReviewWord.pos} {currentReviewWord.phonetic}</div>
            <div className="space-y-4 text-left w-full">
              {currentReviewEntries.map((entry, index) => (
                <div key={`${entry.definition}-${index}`} className="bg-gray-50 p-4 rounded-lg">
                  {entry.translation && <p className="font-bold text-gray-800">{entry.translation}</p>}
                  {entry.definition && <p className="text-gray-600 text-sm mt-1">{entry.definition}</p>}
                  {entry.examples && entry.examples.length > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
                      {entry.examples.map((example, exampleIndex) => {
                        const lines = splitExampleLines(example);
                        return (
                          <p key={`${index}-review-ex-${exampleIndex}`} className="text-gray-700">
                            {lines.map((line, lineIndex) => {
                              const isCjkLine = /[\u4e00-\u9fff]/.test(line);
                              const highlightTarget = isCjkLine
                                ? (entry.translation || currentReviewWord.translation || '')
                                : (currentReviewWord.word || '');
                              return (
                                <React.Fragment key={`${index}-review-ex-${exampleIndex}-line-${lineIndex}`}>
                                  {highlightWord(line, highlightTarget)}
                                  {lineIndex < lines.length - 1 && <br />}
                                </React.Fragment>
                              );
                            })}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {currentReviewEntries.length === 0 && (
                <div className="bg-gray-50 p-4 rounded-lg text-gray-500 text-sm">查無解釋</div>
              )}
            </div>
            {currentReviewWord.mnemonics && (
              <div className="bg-purple-50 p-3 rounded text-sm text-purple-700 text-left">
                <span className="font-bold block text-xs uppercase mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Memory Aid</span>
                {currentReviewWord.mnemonics}
              </div>
            )}
            {reviewMode !== 'flashcard' && (
              <div className={`p-3 rounded-lg font-bold ${
                lastResult?.feedbackType === 'root_match'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : feedback === 'correct' || feedback === 'exact'
                  ? 'bg-green-500 text-white'
                  : feedback === 'typo'
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {lastResult?.feedbackType === 'root_match' ? (
                  <div className="space-y-1">
                    <div>意思正確！(接受原形)</div>
                    {lastResult.correctContextWord && (
                      <div className="text-sm font-semibold">
                        本句實際用法：{lastResult.correctContextWord}
                      </div>
                    )}
                  </div>
                ) : feedback === 'correct' || feedback === 'exact' ? (
                  '答對了！'
                ) : feedback === 'typo' ? (
                  '小錯字！判定為困難 (Hard)。'
                ) : (
                  '答錯了，請再接再厲！'
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        {!isFlipped ? (
          <button onClick={() => reviewMode === 'flashcard' ? setIsFlipped(true) : checkAnswer()} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-sm">{reviewMode === 'flashcard' ? '顯示答案' : '檢查'}</button>
        ) : (
          reviewMode === 'flashcard' ? (
            <div>
              <p className="text-center text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">自評理解程度</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => processRating(1)}
                  className="px-4 py-3 rounded-lg font-bold bg-red-100 text-red-700 hover:bg-red-200 transition"
                >
                  1 - Again (忘記)
                </button>
                <button
                  onClick={() => processRating(2)}
                  className="px-4 py-3 rounded-lg font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
                >
                  2 - Hard (困難)
                </button>
                <button
                  onClick={() => processRating(3)}
                  className="px-5 py-3 rounded-lg font-extrabold bg-green-100 text-green-700 hover:bg-green-200 transition"
                >
                  3 - Good (良好)
                </button>
                <button
                  onClick={() => processRating(4)}
                  className="px-4 py-3 rounded-lg font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                >
                  4 - Easy (簡單)
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={advanceToNextCard}
              disabled={!isAwaitingNext}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
            >
              下一題
            </button>
          )
        )}
      </div>
    </div>
  </div>
);

export default ReviewSession;
