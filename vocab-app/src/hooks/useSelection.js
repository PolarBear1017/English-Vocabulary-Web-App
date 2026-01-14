import { useCallback, useMemo, useRef, useState } from 'react';

const useSelection = () => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const lastSelectedIdRef = useRef(null);

  const enterSelectionMode = useCallback((initialId) => {
    setIsSelectionMode(true);
    if (initialId) {
      setSelectedIds(prev => (prev.includes(initialId) ? prev : [...prev, initialId]));
      lastSelectedIdRef.current = initialId;
    }
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds([]);
    lastSelectedIdRef.current = null;
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedIds([]);
        lastSelectedIdRef.current = null;
        return false;
      }
      return true;
    });
  }, []);

  const toggleSelection = useCallback((id, event, allItems) => {
    const list = Array.isArray(allItems) ? allItems : [];
    const isShift = event?.shiftKey && lastSelectedIdRef.current && list.length > 0;

    if (isShift) {
      const ids = list.map(item => (typeof item === 'string' ? item : item?.id));
      const startIndex = ids.indexOf(lastSelectedIdRef.current);
      const endIndex = ids.indexOf(id);
      if (startIndex !== -1 && endIndex !== -1) {
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const rangeIds = ids.slice(from, to + 1).filter(Boolean);
        setSelectedIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(rangeId => next.add(rangeId));
          return Array.from(next);
        });
        lastSelectedIdRef.current = id;
        return;
      }
    }

    setSelectedIds(prev => (
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    ));
    lastSelectedIdRef.current = id;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    lastSelectedIdRef.current = null;
  }, []);

  const setSelection = useCallback((ids) => {
    setSelectedIds(ids);
    if (ids.length > 0) setIsSelectionMode(true);
    lastSelectedIdRef.current = ids.length > 0 ? ids[ids.length - 1] : null;
  }, []);

  const count = useMemo(() => selectedIds.length, [selectedIds]);

  return {
    isSelectionMode,
    selectedIds,
    count,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
    toggleSelection,
    clearSelection,
    setSelection
  };
};

export default useSelection;
