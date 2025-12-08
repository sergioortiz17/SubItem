// Presentation Hook - Drag and Drop logic
import { useState, useCallback } from 'react';
import {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { ItemTreeService, ItemTreeLike } from '../../domain/services/ItemTreeService';
import { ItemValidationService } from '../../domain/services/ItemValidationService';

export interface DragState {
  draggingItemId: string | null;
  overItemId: string | null;
  dragPosition: { itemId: string; isAbove: boolean } | null;
}

export interface UseDragAndDropOptions {
  items: ItemTreeLike[];
  reorderMode: boolean;
  onReorder: (activeItemId: string, targetItemId: string, position: 'before' | 'after') => void;
  onMove: (activeItemId: string, targetItemId: string) => void;
}

export function useDragAndDrop({
  items,
  reorderMode,
  onReorder,
  onMove,
}: UseDragAndDropOptions) {
  const [dragState, setDragState] = useState<DragState>({
    draggingItemId: null,
    overItemId: null,
    dragPosition: null,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragState(prev => ({
      ...prev,
      draggingItemId: event.active.id as string,
    }));
    document.body.style.overflow = 'hidden';
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, activatorEvent } = event;
    if (over && activatorEvent && 'clientY' in activatorEvent) {
      const overId = over.id as string;
      setDragState(prev => ({
        ...prev,
        overItemId: overId,
      }));

      // Calculate position relative to item center
      const containerElement = document.querySelector(`[data-id="${overId}"]`) as HTMLElement;
      let cardElement: HTMLElement | null = null;

      if (containerElement) {
        cardElement = containerElement.querySelector('.bg-slate-800.border-2') as HTMLElement;
        if (!cardElement && activatorEvent.target) {
          const target = (activatorEvent.target as HTMLElement).closest('.bg-slate-800.border-2') as HTMLElement;
          if (target && containerElement.contains(target)) {
            cardElement = target;
          }
        }
      }

      if (!cardElement && activatorEvent.target) {
        const closestContainer = (activatorEvent.target as HTMLElement).closest('[data-id]') as HTMLElement;
        if (closestContainer && closestContainer.getAttribute('data-id') === overId) {
          cardElement = closestContainer.querySelector('.bg-slate-800.border-2') as HTMLElement;
        }
      }

      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const mouseY = (activatorEvent as MouseEvent).clientY;
        const relativeY = mouseY - rect.top;
        const height = rect.height;
        const isAbove = (relativeY / height) * 100 < 50;

        setDragState(prev => ({
          ...prev,
          dragPosition: {
            itemId: overId,
            isAbove,
          },
        }));
      } else {
        setDragState(prev => ({
          ...prev,
          dragPosition: {
            itemId: overId,
            isAbove: false,
          },
        }));
      }
    } else {
      setDragState(prev => ({
        ...prev,
        overItemId: null,
        dragPosition: null,
      }));
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Reset state
    setDragState({
      draggingItemId: null,
      overItemId: null,
      dragPosition: null,
    });
    document.body.style.overflow = '';

    if (!over || active.id === over.id) {
      return;
    }

    const activeItemId = active.id as string;
    const targetItemId = over.id as string;

    const activeItem = ItemTreeService.findById<ItemTreeLike>(items, activeItemId);
    const targetItem = ItemTreeService.findById<ItemTreeLike>(items, targetItemId);

    if (!activeItem || !targetItem) {
      return;
    }

    // Validate move
    const moveValidation = ItemValidationService.canMoveItem<ItemTreeLike>(items, activeItemId, targetItemId);
    if (!moveValidation.valid) {
      return;
    }

    // Determine action
    const activeParentId = ItemTreeService.findParentId<ItemTreeLike>(items, activeItemId);
    const targetParentId = ItemTreeService.findParentId<ItemTreeLike>(items, targetItemId);
    const sameLevel = activeParentId === targetParentId;

    if (reorderMode && sameLevel) {
      // Reorder
      const isAbove = dragState.dragPosition?.itemId === targetItemId && dragState.dragPosition.isAbove;
      onReorder(activeItemId, targetItemId, isAbove ? 'before' : 'after');
    } else {
      // Move
      onMove(activeItemId, targetItemId);
    }
  }, [items, reorderMode, dragState.dragPosition, onReorder, onMove]);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

