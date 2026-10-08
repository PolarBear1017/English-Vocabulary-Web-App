import React from 'react';
import { Lightbulb, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    speak,
    playAudioShortcut = 'Tab'
}) => {
    const { t } = useTranslation();
    const shortcutLabel = playAudioShortcut || 'Tab';

    return (
        <div className="space-y-6 w-full flex flex-col items-center">
            <button
                type="button"
                onClick={() => speak(currentReviewWord.word, preferredReviewAudio, { rate: audioSpeed || 1.0 })}
                title={`${t('library.playAudio')} (${shortcutLabel})`}
                aria-label={`${t('library.playAudio')} (${shortcutLabel})`}
                className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition animate-pulse shadow-sm"
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
                    onKeyDown={(e) => {
                        if (e.key.toLowerCase() === shortcutLabel.toLowerCase()) {
                            e.preventDefault();
                            speak(currentReviewWord.word, preferredReviewAudio, { rate: audioSpeed || 1.0 });
                            return;
                        }
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            checkAnswer();
                        }
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                />
                <button
                    onClick={giveHint}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors p-2"
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

export default DictationFront;
