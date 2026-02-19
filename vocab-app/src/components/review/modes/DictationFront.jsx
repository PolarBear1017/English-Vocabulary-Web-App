import React from 'react';
import { Lightbulb, Volume2 } from 'lucide-react';

const DictationFront = ({
    currentReviewWord,
    userAnswer,
    answerHint,
    handleAnswerChange,
    checkAnswer,
    giveHint,
    feedback,
    preferredReviewAudio,
    audioSpeed,
    speak
}) => {
    return (
        <div className="space-y-6 w-full flex flex-col items-center">
            <button
                onClick={() => speak(currentReviewWord.word, preferredReviewAudio, { rate: audioSpeed || 1.0 })}
                className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition animate-pulse"
            >
                <Volume2 className="w-8 h-8" />
            </button>
            <div className="relative w-full">
                <input
                    type="text"
                    className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none text-2xl text-center py-2 placeholder:text-gray-400"
                    value={userAnswer}
                    placeholder={answerHint}
                    onChange={e => handleAnswerChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                />
                <button
                    onClick={giveHint}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors p-2"
                    title="顯示提示 (首字母)"
                >
                    <Lightbulb className="w-5 h-5" />
                </button>
            </div>
            {feedback === 'incorrect' && (
                <p className="text-sm text-red-500">拼錯了，提示答案已顯示，請再輸入一次。</p>
            )}
        </div>
    );
};

export default DictationFront;
