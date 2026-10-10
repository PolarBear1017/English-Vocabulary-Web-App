import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatClozeSentence, renderClozeWithCollocation } from '../../../utils/text';

const ClozeFront = ({
    clozeExampleMain,
    clozeTranslation,
    clozeCollocation,
    currentReviewWord,
    userAnswer,
    answerHint,
    handleAnswerChange,
    checkAnswer,
    giveHint,
    feedback
}) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6 w-full">
            {clozeCollocation && (
                <div className="flex justify-center -mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200/90 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {t('card.collocation', '搭配')}: {formatClozeSentence(clozeCollocation, currentReviewWord.word)}
                    </span>
                </div>
            )}
            <div className="text-xl text-gray-700 leading-relaxed">
                {renderClozeWithCollocation(clozeExampleMain, currentReviewWord.word, clozeCollocation)}
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
                    title={t('review.showHint')}
                >
                    <Lightbulb className="w-5 h-5" />
                </button>
            </div>
            {feedback === 'incorrect' && (
                <p className="text-sm text-red-500">{t('review.spellingRetryHint')}</p>
            )}
        </div>
    );
};

export default ClozeFront;
