import { useState, useEffect, useRef, useCallback } from 'react';
import { speak, stopAudio, getAudioUrl } from '../services/speechService';
import { normalizeEntries } from '../utils/data';

export const useVocabularyPlayer = (words = [], options = {}) => {
    const { audioPriority } = options;
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [playbackState, setPlaybackState] = useState('idle'); // 'idle', 'playing_word', 'playing_def', 'waiting'

    const timeoutRef = useRef(null);
    const currentWordRef = useRef(null);
    const isPlayingRef = useRef(false);

    // Keep refs synced
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    const currentWord = currentWordIndex >= 0 && currentWordIndex < words.length
        ? words[currentWordIndex]
        : null;

    useEffect(() => {
        currentWordRef.current = currentWord;
    }, [currentWord]);

    const playNext = useCallback(() => {
        if (!isPlayingRef.current) return;

        setCurrentWordIndex(prev => {
            const nextIndex = prev + 1;
            if (nextIndex >= words.length) {
                setIsPlaying(false);
                setPlaybackState('idle');
                return -1; // Reset or stop
            }
            return nextIndex;
        });
    }, [words.length]);

    const speakDefinition = useCallback((word) => {
        if (!isPlayingRef.current) return;
        setPlaybackState('playing_def');

        // Get the first definition or translation
        const entries = normalizeEntries(word);
        let textToSpeak = "";

        // Prefer selected definition if available
        const selectedDef = Array.isArray(word.selectedDefinitions) && word.selectedDefinitions.length > 0
            ? word.selectedDefinitions[0]
            : null;

        if (selectedDef?.translation) {
            textToSpeak = selectedDef.translation;
        } else if (word.translation) {
            textToSpeak = word.translation;
        } else if (entries.length > 0) {
            textToSpeak = entries[0].translation || entries[0].definition;
        }

        if (!textToSpeak) {
            // Skip if no definition found
            timeoutRef.current = setTimeout(playNext, 1000);
            return;
        }

        // Speak Chinese/Definition
        speak(textToSpeak, null, {
            lang: 'zh-TW',
            rate: 1.0,
            onEnd: () => {
                setPlaybackState('waiting');
                timeoutRef.current = setTimeout(playNext, 1500); // Pause between words
            }
        });
    }, [playNext]);

    const speakWord = useCallback((word) => {
        if (!isPlayingRef.current) return;
        setPlaybackState('playing_word');

        // Determine audio source
        const audioUrl = getAudioUrl(word, audioPriority);

        // Speak English Word
        speak(word.word, audioUrl, {
            lang: 'en-US',
            onEnd: () => {
                // Add a small delay between word and definition
                timeoutRef.current = setTimeout(() => speakDefinition(word), 500);
            }
        });
    }, [speakDefinition, audioPriority]);

    // Effect to trigger playback when index changes
    useEffect(() => {
        if (isPlaying && currentWord) {
            // Clear any pending timeouts
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            // Start sequence for this word
            speakWord(currentWord);
        }
    }, [currentWordIndex, isPlaying]); // Removed currentWord from deps to avoid double triggers if object reference changes but index doesn't, though index changes should drive it.

    const startPlayback = (startIndex = 0) => {
        setIsPlaying(true);
        setCurrentWordIndex(startIndex);
    };

    const stopPlayback = () => {
        setIsPlaying(false);
        setPlaybackState('idle');
        stopAudio();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const togglePlayback = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback(currentWordIndex >= 0 ? currentWordIndex : 0);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAudio();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return {
        isPlaying,
        currentWord,
        currentWordIndex,
        playbackState,
        startPlayback,
        stopPlayback,
        togglePlayback
    };
};
