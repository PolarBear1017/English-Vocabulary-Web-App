import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { splitExampleLines } from '../../utils/data';
import { highlightWord } from '../../utils/text';


const ReviewCardBack = ({
    currentReviewWord,
    currentReviewEntries,
    lastResult,
    feedback,
    reviewMode,
    preferredReviewAudio,
    preferredAccent,
    setPreferredAccent,
    audioSpeed,
    chineseAudioSpeed,
    speak
}) => {
    return (
        <div className="space-y-4 animate-in fade-in duration-300 w-full">
            <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl font-bold text-gray-800">{currentReviewWord.word}</h2>
                <button onClick={() => speak(currentReviewWord.word, preferredReviewAudio, { rate: audioSpeed || 1.0 })}>
                    <Volume2 className="w-6 h-6 text-blue-600" />
                </button>
                {(currentReviewWord.usAudioUrl || currentReviewWord.ukAudioUrl) && (
                    <div className="flex items-center gap-1 text-xs">
                        <button
                            type="button"
                            onClick={() => setPreferredAccent('us')}
                            disabled={!currentReviewWord.usAudioUrl}
                            className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'us' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
                        >
                            US
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreferredAccent('uk')}
                            disabled={!currentReviewWord.ukAudioUrl}
                            className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'uk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
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
                        {entry.translation && (
                            <p className="font-bold text-gray-800 flex items-center gap-2">
                                {entry.translation}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        speak(entry.translation, null, { lang: 'zh-TW', rate: chineseAudioSpeed || 1.0 });
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>
                            </p>
                        )}
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
                <div className={`p-3 rounded-lg font-bold ${lastResult?.feedbackType === 'root_match'
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
    );
};

export default ReviewCardBack;
