import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';

const SearchResultHeader = ({
  searchResult,
  preferredAccent,
  onAccentChange,
  preferredSearchAudio,
  onSpeak,
  savedWordInSearch,
  saveButtonFeedback,
  saveButtonLabel,
  saveStep,
  onStartSave,
  onCancelSave,
  onNextSave,
  onBackSave
}) => (
  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex flex-wrap items-center gap-3">
          {searchResult.word}
          <button onClick={() => onSpeak(searchResult.word, preferredSearchAudio)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 active:scale-95 transition">
            <Volume2 className="w-5 h-5 text-blue-600" />
          </button>
          {(searchResult.usAudioUrl || searchResult.ukAudioUrl) && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => onAccentChange('us')}
                className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'us' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
              >
                US
              </button>
              <button
                type="button"
                onClick={() => onAccentChange('uk')}
                className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'uk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
              >
                UK
              </button>
            </div>
          )}
          {savedWordInSearch && (
            <div className="ml-4 flex flex-col items-start">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mastery</span>
              <ProficiencyDots score={savedWordInSearch.proficiencyScore} />
            </div>
          )}
        </h2>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          <span className="italic font-serif bg-white px-2 py-0.5 rounded border border-gray-200">{searchResult.pos}</span>
          <span>{searchResult.phonetic}</span>
          {searchResult.source === 'Cambridge' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">🛡️ Cambridge</span>}
          {searchResult.source === 'Gemini AI' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gemini AI</span>}
          {searchResult.source === 'Groq AI' && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> Groq AI</span>}
        </div>
      </div>
      {saveStep === 'idle' && (
        <button
          onClick={onStartSave}
          className="flex w-auto sm:w-auto items-center justify-center gap-2 bg-green-600 text-white px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-lg hover:bg-green-700 transition shadow-sm"
        >
          {saveButtonFeedback ? '已加入' : (saveButtonLabel || '儲存')}
        </button>
      )}
      {saveStep === 'selecting' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onCancelSave}
            className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            onClick={onNextSave}
            className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            下一步
          </button>
        </div>
      )}
      {saveStep === 'folder' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onBackSave}
            className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            上一步
          </button>
          <button
            onClick={onCancelSave}
            className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            取消
          </button>
        </div>
      )}
    </div>
  </div>
);

export default SearchResultHeader;
