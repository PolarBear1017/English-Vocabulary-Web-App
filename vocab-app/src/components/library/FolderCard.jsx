import React, { useRef, useState, useEffect } from 'react';
import { Folder, Trash2, Sparkles, Pencil, Check, MoreVertical, PlayCircle } from 'lucide-react';
import { useLongPress } from 'use-long-press';
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
  searchQuery,
  onOpenWordDetail
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
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

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

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
                <div className="mt-2 -mx-5 border-t border-gray-100">
                  {matchingWords.map(word => (
                    <div key={word.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <WordRow
                        word={word}
                        activeFolder={folder}
                        searchQuery={searchQuery}
                        onOpenDetail={onOpenWordDetail}
                        isSelectionMode={false}
                        isSelected={false}
                        hideMetadata={true}
                      />
                    </div>
                  ))}
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onStartReview?.();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    複習
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onGenerateStory?.();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    生成故事
                  </button>

                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onEdit();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      編輯
                    </button>
                  )}

                  {folder.id !== 'default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onDelete();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      刪除
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!searchQuery && (
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
      )}

      {words.length === 0 && (
        <div className="text-center text-xs text-gray-400 py-2">
          尚無單字，點擊查看詳情
        </div>
      )}
    </div>
  );
};

export default FolderCard;
