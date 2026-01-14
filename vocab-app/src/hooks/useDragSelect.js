import { useCallback, useEffect, useRef } from 'react';

const useDragSelect = ({ enabled, onSelect, onToggle }) => {
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const lastIdRef = useRef(null);
  const startIdRef = useRef(null);
  const suppressClickRef = useRef(false);
  const pointerIdRef = useRef(null);
  const prevTouchActionRef = useRef('');
  const prevUserSelectRef = useRef('');

  const restorePageState = useCallback(() => {
    document.body.style.touchAction = prevTouchActionRef.current || '';
    document.body.style.userSelect = prevUserSelectRef.current || '';
  }, []);

  const stopDragging = useCallback((event) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const hasMoved = hasMovedRef.current;
    const startId = startIdRef.current;
    hasMovedRef.current = false;
    lastIdRef.current = null;
    startIdRef.current = null;
    if (event?.currentTarget?.releasePointerCapture && pointerIdRef.current !== null) {
      try {
        event.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore pointer capture release failures
      }
    }
    pointerIdRef.current = null;
    restorePageState();

    if (!hasMoved && startId) {
      suppressClickRef.current = true;
      onToggle?.(startId);
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    } else {
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }, [onToggle, restorePageState]);

  const startDragging = useCallback((event) => {
    if (!enabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const root = event.currentTarget.closest('[data-select-id]');
    const id = root?.dataset?.selectId;
    if (!id) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startIdRef.current = id;
    pointerIdRef.current = event.pointerId;
    prevTouchActionRef.current = document.body.style.touchAction;
    prevUserSelectRef.current = document.body.style.userSelect;
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';
    event.currentTarget.setPointerCapture?.(event.pointerId);
    suppressClickRef.current = true;
    event.preventDefault();
  }, [enabled]);

  const moveDragging = useCallback((event) => {
    if (!isDraggingRef.current) return;
    if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;

    if (!hasMovedRef.current) {
      hasMovedRef.current = true;
      if (startIdRef.current) {
        onSelect?.(startIdRef.current);
        lastIdRef.current = startIdRef.current;
        startIdRef.current = null;
      }
    }

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const root = element?.closest?.('[data-select-id]');
    const id = root?.dataset?.selectId;
    if (id && id !== lastIdRef.current) {
      onSelect?.(id);
      lastIdRef.current = id;
    }
    event.preventDefault();
  }, [onSelect]);

  useEffect(() => () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      restorePageState();
    }
  }, [restorePageState]);

  if (!enabled) {
    return { dragHandleProps: {} };
  }

  return {
    dragHandleProps: {
      onPointerDown: startDragging,
      onPointerMove: moveDragging,
      onPointerUp: stopDragging,
      onPointerCancel: stopDragging,
      onClickCapture: (event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
};

export default useDragSelect;
