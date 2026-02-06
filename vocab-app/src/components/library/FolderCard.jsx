import React, { useRef } from 'react';
import { Folder, Trash2, Sparkles, Pencil, Check } from 'lucide-react';
import { useLongPress } from 'use-long-press';
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

const FolderCard = ({
  folder,
  folderWords,
  folderStats,
  isSelectionMode,
  isSelected,
  dragHandleProps,
  onToggleSelect,
  onEnterSelectionMode,
  onOpen,
  onDelete,
  onEdit,
  onStartReview,
  onGenerateStory,
  searchQuery
}) => {
  const words = folderWords || [];

  const matchingWords = searchQuery
    ? words.filter(word => isWordMatch(word, searchQuery))
    : [];

  const totalCount = folderStats?.count ?? words.length;
  const dueCount = folderStats?.dueCount ?? words.filter(word => new Date(word.nextReview) <= new Date()).length;
  const completionPercent = totalCount > 0
    ? Math.round(((totalCount - dueCount) / totalCount) * 100)
    : 0;
  const totalProficiency = words.reduce((sum, word) => sum + (word.proficiencyScore || 0), 0);
  const comprehensionPercent = totalCount > 0
    ? Math.round((totalProficiency / (totalCount * 5)) * 100)
    : 0;

  const disableSelect = folder.id === 'default';
  const longPressTriggeredRef = useRef(false);
  const bindLongPress = useLongPress(() => {
    if (disableSelect) return;
    longPressTriggeredRef.current = true;
    onEnterSelectionMode?.(folder.id);
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
      if (!disableSelect) onToggleSelect?.(folder.id, event);
      return;
    }
    onOpen?.();
  };

  return (
    <div
      className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      {...bindLongPress()}
      onClick={handleClick}
      onContextMenu={(event) => event.preventDefault()}
      data-select-id={folder.id}
      data-select-type="folder"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg hover:text-blue-600 transition">
                <HighlightedText text={folder.name} query={searchQuery} />
              </h3>

              {searchQuery && matchingWords.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {matchingWords.slice(0, 3).map(word => {
                    const previewText = (word.translation || word.definition || '').split('\n')[0];
                    return (
                      <div key={word.id} className="text-sm border-l-2 border-blue-200 pl-2 py-0.5">
                        <div className="font-medium text-gray-900">
                          <HighlightedText text={word.word} query={searchQuery} />
                        </div>
                        {previewText && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            <HighlightedText text={previewText} query={searchQuery} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {matchingWords.length > 3 && (
                    <p className="text-xs text-blue-600 font-medium mt-1 pl-2">
                      還有 {matchingWords.length - 3} 個相關單字...
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">{totalCount} 個單字</p>
                  {folder.description ? (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{folder.description}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {isSelectionMode ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (!disableSelect) onToggleSelect?.(folder.id, event);
              }}
              {...dragHandleProps}
              className={`h-7 w-7 rounded-full border flex items-center justify-center transition ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'
                } ${disableSelect ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400'}`}
              title={disableSelect ? '預設資料夾無法刪除' : '選取資料夾'}
              disabled={disableSelect}
            >
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <>
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="text-gray-400 hover:text-blue-500 p-2 opacity-0 group-hover:opacity-100 transition"
                  title="編輯資料夾"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {folder.id !== 'default' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition"
                  title="刪除資料夾"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>複習完成度</span>
          <span className="font-semibold text-gray-700">{completionPercent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${completionPercent}%` }}
            aria-label={`複習完成度 ${completionPercent}%`}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
          <span>理解程度</span>
          <span className="font-semibold text-gray-700">{comprehensionPercent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all"
            style={{ width: `${comprehensionPercent}%` }}
            aria-label={`理解程度 ${comprehensionPercent}%`}
          />
        </div>
      </div>

      {words.length === 0 && (
        <div className="text-center text-xs text-gray-400 py-2">
          尚無單字，點擊查看詳情
        </div>
      )}

      {!isSelectionMode && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={onStartReview}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            複習
          </button>
          <button
            onClick={onGenerateStory}
            className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> 生成故事
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderCard;
