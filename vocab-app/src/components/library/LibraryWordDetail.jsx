import React, { useMemo, useState } from 'react';
import { Pencil, Search, Sparkles, Trash2, Volume2 } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';
import SearchResultEntries from '../search/SearchResultEntries';
import { normalizeEntries } from '../../utils/data';

const LibraryWordDetail = ({
  entry,
  onSpeak,
  onNavigateToSearch,
  onEditWord,
  onDeleteWord
}) => {
  const [preferredAccent, setPreferredAccent] = useState('us');
  const selectedDefs = Array.isArray(entry?.selectedDefinitions)
    ? entry.selectedDefinitions
    : (Array.isArray(entry?.selected_definitions)
      ? entry.selected_definitions
      : []);

  const entries = useMemo(() => {
    if (selectedDefs.length > 0) {
      return normalizeEntries({ entries: selectedDefs });
    }
    return normalizeEntries(entry || {});
  }, [entry, selectedDefs]);

  const masteryLevel = Number.isFinite(entry?.proficiencyScore) ? entry.proficiencyScore : 0;
  const hasAccentToggle = true;
  const generalSource = entry?.audioUrl || entry?.audio_url || null;
  const usSource = entry?.usAudioUrl || entry?.us_audio_url || null;
  const ukSource = entry?.ukAudioUrl || entry?.uk_audio_url || null;
  const hasUsAudio = Boolean(usSource || generalSource);
  const hasUkAudio = Boolean(ukSource || generalSource);
  const preferredAudio = preferredAccent === 'uk'
    ? (ukSource || generalSource || usSource)
    : (usSource || generalSource || ukSource);
  const resolvedSource = entry?.source || (entry?.isAiGenerated ? 'AI' : 'Cambridge');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex flex-wrap items-center gap-3">
              {entry.word}
              <button
                type="button"
                onClick={() => onSpeak?.(entry.word, preferredAudio)}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 active:scale-95 transition"
                aria-label="播放發音"
              >
                <Volume2 className="w-5 h-5 text-blue-600" />
              </button>
              {hasAccentToggle && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => hasUsAudio && setPreferredAccent('us')}
                    className={`px-2 py-0.5 rounded-full border transition ${
                      preferredAccent === 'us' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                    } ${hasUsAudio ? 'hover:border-blue-300' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    US
                  </button>
                  <button
                    type="button"
                    onClick={() => hasUkAudio && setPreferredAccent('uk')}
                    className={`px-2 py-0.5 rounded-full border transition ${
                      preferredAccent === 'uk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                    } ${hasUkAudio ? 'hover:border-blue-300' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    UK
                  </button>
                </div>
              )}
              <div className="ml-1 flex flex-col items-start">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mastery</span>
                <ProficiencyDots score={masteryLevel} />
              </div>
            </h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="italic font-serif bg-white px-2 py-0.5 rounded border border-gray-200">{entry.pos}</span>
              <span>{entry.phonetic}</span>
              {resolvedSource === 'Cambridge' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">🛡️ Cambridge</span>
              )}
              {resolvedSource === 'Gemini AI' && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini AI
                </span>
              )}
              {resolvedSource === 'Groq AI' && (
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Groq AI
                </span>
              )}
              {resolvedSource === 'AI' && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateToSearch?.(entry.word)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
            >
              <Search className="w-3.5 h-3.5" />
              查看完整解釋
            </button>
          </div>
          {(onEditWord || onDeleteWord) && (
            <div className="flex items-center gap-2">
              {onEditWord && (
                <button
                  type="button"
                  onClick={onEditWord}
                  className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
                  title="編輯單字"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDeleteWord && (
                <button
                  type="button"
                  onClick={onDeleteWord}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition"
                  title="刪除單字"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <SearchResultEntries normalizedEntries={entries} searchWord={entry.word} readOnly />

        {(entry.mnemonics || entry.notes) && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            {entry.mnemonics && (
              <div>
                <div className="text-xs font-bold text-amber-700 uppercase mb-1">助記</div>
                <p>{entry.mnemonics}</p>
              </div>
            )}
            {entry.notes && (
              <div>
                <div className="text-xs font-bold text-amber-700 uppercase mb-1">筆記</div>
                <p>{entry.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryWordDetail;
