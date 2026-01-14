import { useCallback, useMemo, useState } from 'react';

const useSelection = () => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const enterSelectionMode = useCallback((initialId) => {
    setIsSelectionMode(true);
    if (initialId) {
      setSelectedIds(prev => (prev.includes(initialId) ? prev : [...prev, initialId]));
    }
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedIds([]);
        return false;
      }
      return true;
    });
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => (
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    ));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const setSelection = useCallback((ids) => {
    setSelectedIds(ids);
    if (ids.length > 0) setIsSelectionMode(true);
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
