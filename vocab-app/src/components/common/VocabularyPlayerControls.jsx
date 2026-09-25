import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VocabularyPlayerControls = ({
    isPlaying,
    currentWord,
    onTogglePlay,
    onNext,
    onPrev,
    onClose,
    playbackState
}) => {
    const { t } = useTranslation();

    if (!currentWord && !isPlaying) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-50 flex items-center justify-between animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPlaying ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-gray-100 text-gray-400'
                    }`}>
                    <Volume2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-gray-800 truncate">
                        {currentWord?.word || t('player.preparing')}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                        {playbackState === 'playing_def' ? t('player.playingDef') : t('player.playingWord')}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={onPrev}
                    className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition"
                    title={t('player.prev')}
                >
                    <SkipBack className="w-5 h-5" />
                </button>

                <button
                    onClick={onTogglePlay}
                    className={`p-3 rounded-full text-white shadow-md transition transform active:scale-95 ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    title={isPlaying ? t('player.pause') : t('player.play')}
                >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                </button>

                <button
                    onClick={onNext}
                    className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition"
                    title={t('player.next')}
                >
                    <SkipForward className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-gray-200 mx-1"></div>

                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                    title={t('player.close')}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default VocabularyPlayerControls;
