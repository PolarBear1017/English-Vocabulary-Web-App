import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Circle, Info, Plus, Search } from 'lucide-react';

const FolderSelectionList = ({
  folders,
  savedFolderIds,
  lastUsedFolderIds,
  searchWord,
  onConfirm,
  onCancel,
  onCreateFolder
}) => {
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  const normalizedQuery = query.trim();
  const normalizedCreateValue = createValue.trim();

  const savedIdSet = useMemo(() => new Set(
    (savedFolderIds || []).map((id) => id?.toString()).filter(Boolean)
  ), [savedFolderIds]);

  const initialSelected = useMemo(() => {
    if (savedIdSet.size > 0) return Array.from(savedIdSet);
    return (lastUsedFolderIds || []).map((id) => id?.toString()).filter(Boolean);
  }, [lastUsedFolderIds, savedIdSet]);

  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSelected));

  useEffect(() => {
    setSelectedIds(new Set(initialSelected));
  }, [initialSelected]);

  useEffect(() => {
    if (!showTooltip) return;
    const handleOutsideClick = (event) => {
      if (!tooltipRef.current) return;
      if (!tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTooltip]);

  const sortedFolders = useMemo(() => {
    const reversed = [...(folders || [])].reverse();
    const saved = [];
    const unsaved = [];
    reversed.forEach((folder) => {
      if (savedIdSet.has(folder.id?.toString())) {
        saved.push(folder);
      } else {
        unsaved.push(folder);
      }
    });
    return [...saved, ...unsaved];
  }, [folders, savedIdSet]);

  const filteredFolders = useMemo(() => {
    if (!normalizedQuery) return sortedFolders;
    const needle = normalizedQuery.toLowerCase();
    return sortedFolders.filter((folder) => (folder.name || '').toLowerCase().includes(needle));
  }, [normalizedQuery, sortedFolders]);

  const hasExactMatch = useMemo(() => {
    if (!normalizedQuery) return false;
    const needle = normalizedQuery.toLowerCase();
    return (folders || []).some((folder) => (folder.name || '').toLowerCase() === needle);
  }, [folders, normalizedQuery]);

  const showCreateFromQuery = normalizedQuery.length > 0 && !hasExactMatch;

  const handleCreate = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed || !onCreateFolder) return;

    setIsSubmitting(true);
    try {
      const created = await onCreateFolder({ name: trimmed });
      const createdId = typeof created === 'string' ? created : created?.id;
      if (!createdId) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(createdId?.toString());
        return next;
      });
      setQuery('');
      setCreateValue('');
      setIsCreating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFolder = (folderId) => {
    const normalizedId = folderId?.toString();
    if (!normalizedId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    const selected = selectedIds;
    if (selected.size !== savedIdSet.size) return true;
    for (const id of selected) {
      if (!savedIdSet.has(id)) return true;
    }
    return false;
  }, [savedIdSet, selectedIds]);

  const handleConfirm = async () => {
    if (!onConfirm || isConfirming) return;
    const selected = Array.from(selectedIds);
    const addIds = selected.filter((id) => !savedIdSet.has(id));
    const removeIds = Array.from(savedIdSet).filter((id) => !selectedIds.has(id));

    setIsConfirming(true);
    try {
      await onConfirm({
        addIds,
        removeIds,
        selectedIds: selected,
        searchWord
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-gray-500">儲存至...</h4>
          <button
            type="button"
            onClick={() => setShowTooltip((prev) => !prev)}
            className="relative group"
            ref={tooltipRef}
          >
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className={`absolute left-0 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg transition-all duration-200 z-50 pointer-events-none ${
              showTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'
            } group-hover:opacity-100 group-hover:visible`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span>綠色勾勾：原本已存的資料夾</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-blue-400" />
                <span>藍色勾勾：本次新增的資料夾</span>
              </div>
              <div className="absolute left-2 top-full w-0 h-0 border-4 border-transparent border-t-gray-800" />
            </div>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating((prev) => !prev)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
            isCreating
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋或建立資料夾..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {isCreating && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={createValue}
            onChange={(event) => setCreateValue(event.target.value)}
            placeholder="輸入資料夾名稱..."
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={() => handleCreate(normalizedCreateValue)}
            disabled={isSubmitting || !normalizedCreateValue}
            className="px-3 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            建立
          </button>
        </div>
      )}

      <div className="max-h-[300px] overflow-y-auto space-y-2">
        {showCreateFromQuery && (
          <button
            type="button"
            onClick={() => handleCreate(normalizedQuery)}
            disabled={isSubmitting}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm hover:bg-blue-100 transition"
          >
            <Plus className="w-4 h-4" />
            建立 "{normalizedQuery}" 資料夾
          </button>
        )}

        {filteredFolders.length === 0 && !showCreateFromQuery && (
          <div className="px-4 py-3 text-sm text-gray-400 text-center">
            沒有符合的資料夾
          </div>
        )}

        {filteredFolders.map((folder) => {
          const normalizedId = folder.id?.toString();
          const isSelected = selectedIds.has(normalizedId);
          const isPreExisting = savedIdSet.has(normalizedId);
          const status = isSelected ? (isPreExisting ? 'preexisting' : 'new') : 'unselected';
          const rowClassName = status === 'preexisting'
            ? 'bg-green-50 border-green-200 hover:bg-green-100'
            : status === 'new'
            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
            : 'bg-white border-gray-200 hover:bg-gray-50';
          const textClassName = status === 'preexisting'
            ? 'text-green-700'
            : status === 'new'
            ? 'text-blue-700'
            : 'text-gray-800';
          const iconClassName = status === 'preexisting'
            ? 'text-green-600'
            : status === 'new'
            ? 'text-blue-600'
            : 'text-gray-300';
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => handleToggleFolder(folder.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition flex items-center justify-between gap-3 ${rowClassName}`}
            >
              <span className={`font-medium ${textClassName}`}>{folder.name}</span>
              {isSelected ? (
                <CheckCircle className={`w-4 h-4 ${iconClassName}`} />
              ) : (
                <Circle className={`w-4 h-4 ${iconClassName}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            取消
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasChanges || isConfirming}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          確認
        </button>
      </div>
    </div>
  );
};

export default FolderSelectionList;
