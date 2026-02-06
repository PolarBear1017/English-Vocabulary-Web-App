import React, { useRef, useState, useMemo } from 'react';
import { ArrowLeft, ArrowUpDown, Folder, Volume2, Trash2, Book, Pencil, Check, Search, X } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';
import { formatDate } from '../../utils/data';
import { speak } from '../../services/speechService';
import { useLongPress } from 'use-long-press';
import LibraryWordDetail from './LibraryWordDetail';
import { isWordMatch } from '../../utils/data';
import WordRow from './WordRow';

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

export default FolderDetail;
