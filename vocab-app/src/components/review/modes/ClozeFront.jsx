import React from 'react';
import { Lightbulb } from 'lucide-react';
import { formatClozeSentence } from '../../../utils/text';

const ClozeFront = ({
    clozeExampleMain,
    clozeTranslation,
    currentReviewWord,
    userAnswer,
    answerHint,
    handleAnswerChange,
    checkAnswer,
    giveHint,
    feedback
}) => {
    return (
        <div className="space-y-6 w-full">
            <div className="text-xl text-gray-700 leading-relaxed">
                {formatClozeSentence(clozeExampleMain, currentReviewWord.word)}
            </div>
            <div className="text-sm text-gray-500">{clozeTranslation}</div>
            {currentReviewWord.pos && (
                <div className="text-base text-gray-500 font-serif italic lowercase">{currentReviewWord.pos}</div>
            )}
            <div className="relative w-full">
                <input
                    type="text"
                    className="w-full border p-3 rounded-lg text-center placeholder:text-gray-400"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors p-2"
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

export default ClozeFront;
