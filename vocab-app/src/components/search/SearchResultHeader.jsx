import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Volume2, Sparkles, ChevronDown } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';

const SOURCE_OPTIONS = [
  { value: 'Cambridge', label: 'Cambridge', icon: '🛡️' },
  { value: 'Yahoo', label: 'Yahoo Dictionary', icon: 'Y!' },
  { value: 'Google Translate', label: 'Google Translate', icon: 'G' },
  { value: 'Groq AI', label: 'Groq AI', icon: '✨' }
];

const EXTERNAL_LINKS = [
  { label: 'Oxford Learner\'s', url: (word) => `https://www.oxfordlearnersdictionaries.com/definition/english/${word}` },
  { label: 'Longman', url: (word) => `https://www.ldoceonline.com/dictionary/${word}` },
  { label: 'Merriam-Webster', url: (word) => `https://www.merriam-webster.com/dictionary/${word}` },
];

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
  onBackSave,
  onSearchFullDefinition,
  availableSources,
  onChangeSource,
  isSwitchingSource
}) => {
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const sourceMenuRef = useRef(null);
  const canSwitchSource = Array.isArray(availableSources) && availableSources.length > 1 && onChangeSource;

  useEffect(() => {
    if (!isSourceMenuOpen) return;
    const handleOutsideClick = (event) => {
      if (!sourceMenuRef.current) return;
      if (!sourceMenuRef.current.contains(event.target)) {
        setIsSourceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSourceMenuOpen]);

  const renderSourceBadge = (badgeClassName, content) => (
    <div className="relative inline-flex" ref={sourceMenuRef}>
      <button
        type="button"
        onClick={() => {
          if (!canSwitchSource) return;
          setIsSourceMenuOpen((prev) => !prev);
        }}
        disabled={isSwitchingSource || !canSwitchSource}
        className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${badgeClassName} ${canSwitchSource ? 'hover:opacity-90 cursor-pointer' : ''} disabled:opacity-60`}
        aria-label="切換來源"
      >
        {content}
        {canSwitchSource && (
          <ChevronDown className={`w-3 h-3 transition ${isSourceMenuOpen ? 'rotate-180' : ''}`} />
        )}
      </button>
      {canSwitchSource && (
        <div className={`absolute left-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-30 transition ${isSourceMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          {SOURCE_OPTIONS.filter((option) => availableSources.includes(option.value)).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setIsSourceMenuOpen(false);
                onChangeSource(option.value);
              }}
              disabled={isSwitchingSource || searchResult.source === option.value}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed ${searchResult.source === option.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
            >
              <span className="text-base">{option.icon}</span>
              {option.label}
              {searchResult.source === option.value && <span className="ml-auto text-[10px] text-blue-600">目前</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="w-full">
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
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
            <span className="italic font-serif bg-white px-2 py-0.5 rounded border border-gray-200">{searchResult.pos}</span>
            <span>{searchResult.phonetic}</span>
            {searchResult.source === 'Cambridge' && renderSourceBadge('bg-blue-100 text-blue-700', '🛡️ Cambridge')}
            {searchResult.source === 'Yahoo' && renderSourceBadge('bg-purple-100 text-purple-700', 'Y! Yahoo')}
            {searchResult.source === 'Groq AI' && renderSourceBadge('bg-teal-100 text-teal-700', (
              <>
                <Sparkles className="w-3 h-3" /> Groq AI
              </>
            ))}
            {searchResult.source === 'Google Translate' && renderSourceBadge('bg-green-100 text-green-700', 'G Google Translate')}
            {searchResult.source === 'Library' && renderSourceBadge('bg-gray-100 text-gray-600', '📚 Library')}
            {searchResult.translatedFrom && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                {searchResult.translatedFrom} &rarr; {searchResult.word}
              </span>
            )}
          </div>

          {/* Alternative Translations Suggestions */}
          {searchResult.alternatives && searchResult.alternatives.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400 font-medium">相關:</span>
              {searchResult.alternatives.map((alt) => (
                <button
                  key={alt}
                  onClick={() => onSearchFullDefinition ? onSearchFullDefinition(alt) : window.location.search = `?q=${alt}`}
                  className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-blue-600 rounded-full border border-gray-200 transition-colors"
                >
                  {alt}
                </button>
              ))}
            </div>
          )}

          {searchResult.source === 'Library' && onSearchFullDefinition && (
            <button
              type="button"
              onClick={onSearchFullDefinition}
              className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              查看完整解釋
            </button>
          )}

          {/* External Links */}
          <div className="mt-3 pt-3 border-t border-gray-200/50 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> 外部連結:
            </span>
            {EXTERNAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url(searchResult.word)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline bg-white px-1.5 py-0.5 rounded border border-blue-100 hover:border-blue-300 transition"
              >
                {link.label}
              </a>
            ))}
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
    </div >
  );
};

export default SearchResultHeader;
