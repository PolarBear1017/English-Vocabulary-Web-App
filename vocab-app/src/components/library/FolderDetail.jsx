import React, { useRef, useState, useMemo } from 'react';
import { ArrowLeft, ArrowUpDown, Folder, Volume2, Trash2, Book, Pencil, Check, Search, X } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';
import { formatDate } from '../../utils/data';
import { speak } from '../../services/speechService';
import { useLongPress } from 'use-long-press';
import LibraryWordDetail from './LibraryWordDetail';
import { isWordMatch } from '../../utils/data';

const HighlightedText = ({ text, query }) => {
  if (!query || !text) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className="font-bold text-blue-600 bg-blue-50/50 rounded-sm px-0.5">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
};

const FolderDetail = ({
  activeFolder,
  wordSortBy,
  setWordSortBy,
  sortedActiveFolderWords,
  activeFolderStats,
  onBack,
  isSelectionMode,
  onToggleSelectionMode,
  onEditFolder,
  onDeleteFolder,
  selectedWordIds,
  onToggleWord,
  onEnterSelectionMode,
  dragHandleProps,
  onRemoveWordFromFolder,
  onGoSearch,
  onSearchWord
}) => {
  const [viewingWord, setViewingWord] = useState(null); // Keep this state for word detail view
  const [searchQuery, setSearchQuery] = useState('');

  // Filter words based on search query
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return sortedActiveFolderWords;
    return sortedActiveFolderWords.filter(word => isWordMatch(word, searchQuery));
  }, [sortedActiveFolderWords, searchQuery]);

  const viewingIndex = viewingWord
    ? filteredWords.findIndex((word) => word.id === viewingWord.id)
    : -1;
  const previousWord = viewingIndex > 0 ? filteredWords[viewingIndex - 1] : null;
  const nextWord = viewingIndex >= 0 && viewingIndex < filteredWords.length - 1
    ? filteredWords[viewingIndex + 1]
    : null;

  return (
    <div className="animate-in fade-in slide-in-from-right duration-300">
      {viewingWord ? (
        <div className="mb-4">
          <button
            onClick={() => setViewingWord(null)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition"
            title="返回單字列表"
          >
            <ArrowLeft className="w-4 h-4" />
            返回單字列表
          </button>
        </div>
      ) : (
        <header className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition group"
                title="返回資料夾"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Folder className="w-6 h-6 text-blue-500" />
                  {activeFolder.name}
                </h1>
                <p className="text-gray-500 text-sm">
                  {searchQuery ? `搜尋到 ${filteredWords.length} 個單字` : `${activeFolderStats?.count ?? sortedActiveFolderWords.length} 個單字`}
                </p>
                {activeFolder.description ? (
                  <p className="text-xs text-gray-400 mt-1">{activeFolder.description}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSelectionMode}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${isSelectionMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {isSelectionMode ? '取消選取' : '選取'}
              </button>
              {onEditFolder && !isSelectionMode && (
                <button
                  onClick={onEditFolder}
                  className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
                  title="編輯資料夾"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDeleteFolder && !isSelectionMode && activeFolder.id !== 'default' && (
                <button
                  onClick={onDeleteFolder}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition"
                  title="刪除資料夾"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋此資料夾內的單字..."
                autoCapitalize="off"
                className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
              <ArrowUpDown className="w-4 h-4" />
              <select
                className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white w-full sm:w-auto"
                value={wordSortBy}
                onChange={(e) => setWordSortBy(e.target.value)}
              >
                <option value="added_desc">最新加入</option>
                <option value="alphabetical_asc">A-Z</option>
                <option value="proficiency_asc">最不熟</option>
                <option value="next_review_asc">最先到期</option>
              </select>
            </div>
          </div>
        </header>
      )}

      {viewingWord ? (
        <LibraryWordDetail
          entry={viewingWord}
          onSpeak={speak}
          onNavigateToSearch={onSearchWord}
          onPrevWord={previousWord ? () => setViewingWord(previousWord) : null}
          onNextWord={nextWord ? () => setViewingWord(nextWord) : null}
          hasPrevWord={Boolean(previousWord)}
          hasNextWord={Boolean(nextWord)}
          onDeleteWord={() => {
            if (confirm(`確定要將 "${viewingWord.word}" 從「${activeFolder.name}」移除嗎？`)) {
              onRemoveWordFromFolder(viewingWord, activeFolder.id);
              setViewingWord(null);
            }
          }}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredWords.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredWords.map(word => (
                <WordRow
                  key={word.id}
                  word={word}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedWordIds.includes(word.id)}
                  dragHandleProps={dragHandleProps}
                  onToggleSelect={onToggleWord}
                  onEnterSelectionMode={onEnterSelectionMode}
                  onOpenDetail={setViewingWord}
                  onRemoveWordFromFolder={onRemoveWordFromFolder}
                  activeFolder={activeFolder}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 mb-3 opacity-20" />
                  <p>找不到符合「{searchQuery}」的單字</p>
                  <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-600 hover:underline text-sm">
                    清除搜尋
                  </button>
                </>
              ) : (
                <>
                  <Book className="w-12 h-12 mb-3 opacity-20" />
                  <p>這個資料夾還是空的</p>
                  <button onClick={onGoSearch} className="mt-4 text-blue-600 hover:underline text-sm">
                    去查詢並新增單字
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WordRow = ({
  word,
  isSelectionMode,
  isSelected,
  dragHandleProps,
  onToggleSelect,
  onEnterSelectionMode,
  onOpenDetail,
  onRemoveWordFromFolder,
  activeFolder,
  searchQuery
}) => {
  const longPressTriggeredRef = useRef(false);
  const bindLongPress = useLongPress(() => {
    longPressTriggeredRef.current = true;
    onEnterSelectionMode?.(word.id);
  }, {
    onCancel: () => {
      longPressTriggeredRef.current = false;
    },
    threshold: 500,
    captureEvent: true,
    cancelOnMovement: 25,
    detect: 'pointer',
    filterEvents: () => true
  });

  const handleClick = (event) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isSelectionMode) {
      event.preventDefault();
      event.stopPropagation();
      onToggleSelect?.(word.id, event);
      return;
    }
    onOpenDetail?.(word);
  };

  const selectedPreview = Array.isArray(word.selectedDefinitions) && word.selectedDefinitions.length > 0
    ? word.selectedDefinitions[0]
    : null;
  const previewText = selectedPreview?.translation
    || selectedPreview?.definition
    || word.translation
    || word.definition;

  return (
    <div
      onClick={handleClick}
      className={`p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group ${isSelected ? 'bg-blue-50' : ''}`}
      {...bindLongPress()}
      onContextMenu={(event) => event.preventDefault()}
      data-select-id={word.id}
      data-select-type="word"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition">
            <HighlightedText text={word.word} query={searchQuery} />
          </span>
          <button onClick={(e) => { e.stopPropagation(); speak(word.word); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition">
            <Volume2 className="w-4 h-4" />
          </button>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{word.pos}</span>
        </div>
        <p className="text-gray-600 text-sm">
          <HighlightedText text={previewText} query={searchQuery} />
        </p>
      </div>
      <div className="flex items-center gap-4">
        {isSelectionMode ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect?.(word.id, event);
            }}
            {...dragHandleProps}
            className={`h-7 w-7 rounded-full border flex items-center justify-center transition ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'
              } hover:border-blue-400`}
            title="選取單字"
          >
            <Check className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">理解程度</span>
              <ProficiencyDots score={word.proficiencyScore} />
            </div>
            <div className="text-right min-w-[80px]">
              <div className="text-xs text-gray-400">下次複習</div>
              <div className={`text-sm font-medium ${new Date(word.nextReview) <= new Date() ? 'text-red-500' : 'text-green-600'}`}>
                {formatDate(word.nextReview)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`確定要將 "${word.word}" 從「${activeFolder.name}」移除嗎？`)) {
                  onRemoveWordFromFolder(word, activeFolder.id);
                }
              }}
              className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
              title="移除單字"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FolderDetail;
