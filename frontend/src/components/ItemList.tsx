import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ItemResponse } from '../types/item';
import { useUpdateItem } from '../hooks/useItems';
import ItemComponent from './ItemComponent';
import { flattenItems } from '../utils/itemUtils';

interface ItemListProps {
  items: ItemResponse[];
  onAddSubitem: (parentId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
}

export default function ItemList({ items, onAddSubitem, onItemDoubleClick }: ItemListProps) {
  const updateItem = useUpdateItem();
  const [overItemId, setOverItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ itemId: string; isLeftSide: boolean } | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allItemIds = flattenItems(items).map(item => item.id);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingItemId(event.active.id as string);
    // Prevent body scroll during drag
    document.body.style.overflow = 'hidden';
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, activatorEvent } = event;
    if (over && activatorEvent && 'clientX' in activatorEvent) {
      setOverItemId(over.id as string);
      
      // Get the element that's being dragged over - try multiple selectors
      let overElement = document.querySelector(`[data-id="${over.id}"]`) as HTMLElement;
      
      // If not found, try to find it by traversing the DOM from the event target
      if (!overElement && activatorEvent.target) {
        const target = (activatorEvent.target as HTMLElement).closest('[data-id]') as HTMLElement;
        if (target && target.getAttribute('data-id') === over.id) {
          overElement = target;
        }
      }
      
      if (overElement) {
        const rect = overElement.getBoundingClientRect();
        const mouseX = (activatorEvent as MouseEvent).clientX;
        const relativeX = mouseX - rect.left;
        const width = rect.width;
        const isLeftSide = relativeX < width * 0.3; // Left 30% of the element
        
        setDragPosition({
          itemId: over.id as string,
          isLeftSide,
        });
      } else {
        // If element not found, default to not left side (move operation)
        setDragPosition({
          itemId: over.id as string,
          isLeftSide: false,
        });
      }
    } else {
      setOverItemId(null);
      setDragPosition(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset drag state
    setDraggingItemId(null);
    setOverItemId(null);
    setDragPosition(null);
    
    // Re-enable body scroll
    document.body.style.overflow = '';

    if (!over || active.id === over.id) {
      return;
    }

    const activeItem = findItemById(items, active.id as string);
    const overItem = findItemById(items, over.id as string);

    if (!activeItem || !overItem) {
      return;
    }

    // Prevent moving an item into its own descendant (would create a cycle)
    if (isDescendant(overItem, activeItem.id)) {
      return;
    }
    
    // Prevent moving an item to itself
    if (activeItem.id === overItem.id) {
      return;
    }

    // Determine action based on drag position
    const isLeftSide = dragPosition?.itemId === overItem.id && dragPosition.isLeftSide;
    const activeParentId = findParentItemId(activeItem.id);
    const overParentId = findParentItemId(overItem.id);
    const sameLevel = activeParentId === overParentId;

    // If dragging to left side AND same level, reorder
    // Otherwise, move to the over item (make it a subitem)
    if (isLeftSide && sameLevel) {
      // Same level and left side - just reorder
      updateItem.mutate({
        id: activeItem.id,
        data: {
          order: overItem.order + 1, // Place after the overItem
        },
      });
    } else {
      // Right side OR different level - make it a subitem of the over item
      updateItem.mutate({
        id: activeItem.id,
        data: {
          itemId: overItem.id, // Moves to level 0 of the target item
        },
      });
    }
  };

  // Check if item is a descendant of potentialAncestor
  const isDescendant = (potentialAncestor: ItemResponse, itemId: string): boolean => {
    if (potentialAncestor.id === itemId) {
      return true;
    }
    if (potentialAncestor.subitems) {
      for (const subitem of potentialAncestor.subitems) {
        if (isDescendant(subitem, itemId)) {
          return true;
        }
      }
    }
    return false;
  };

  // Find the parent item ID for a given item
  const findParentItemId = (itemId: string): string | null => {
    const findParent = (itemList: ItemResponse[], parentId: string | null = null): string | null => {
      for (const item of itemList) {
        if (item.id === itemId) {
          return parentId; // Found the item, return its parent
        }
        if (item.subitems && item.subitems.length > 0) {
          const found = findParent(item.subitems, item.id);
          if (found !== null) {
            return found;
          }
        }
      }
      return null;
    };
    return findParent(items);
  };

  const overItem = overItemId ? findItemById(items, overItemId) : null;
  const draggingItem = draggingItemId ? findItemById(items, draggingItemId) : null;
  
  // Determine if it's a reorder based on position and level
  const isReorder = draggingItem && overItem && draggingItem.id !== overItem.id && dragPosition
    ? dragPosition.itemId === overItem.id 
      && dragPosition.isLeftSide 
      && findParentItemId(draggingItem.id) === findParentItemId(overItem.id)
    : false;

  return (
    <>
      {/* Drag overlay message */}
      {draggingItem && overItem && overItem.id !== draggingItem.id && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
          isReorder ? 'bg-purple-600' : 'bg-blue-600'
        }`}>
          {isReorder ? (
            <>
              <span className="font-medium">Reordenar</span>
              <span className="font-bold">"{draggingItem.title}"</span>
              <span>después de</span>
              <span className="font-bold">"{overItem.title}"</span>
            </>
          ) : (
            <>
              <span className="font-medium">Mover</span>
              <span className="font-bold">"{draggingItem.title}"</span>
              <span>a</span>
              <span className="font-bold">"{overItem.title}"</span>
            </>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => {
              // Create a unique key that includes subitems count and IDs to force re-render when subitems change
              const subitemsCount = item.subitems?.length || 0;
              // Use sorted IDs to create a stable key based on subitems
              const subitemsKey = item.subitems?.map(s => s.id).sort().join(',') || '';
              // Generate numbering for root items (1, 2, 3, etc.)
              const numbering = `${index + 1}`;
              const isOver = overItemId === item.id;
              const isDragging = draggingItemId === item.id;
              // Check if this is a reorder operation (left side + same level)
              const isReorderOperation = draggingItem && isOver && !isDragging && dragPosition
                ? dragPosition.itemId === item.id
                  && dragPosition.isLeftSide
                  && findParentItemId(draggingItem.id) === findParentItemId(item.id)
                : false;
              return (
                <ItemComponent
                  key={`${item.id}-${index}-${subitemsCount}-${subitemsKey}`}
                  item={item}
                  level={0}
                  numbering={numbering}
                  onAddSubitem={onAddSubitem}
                  isDragOver={isOver && !isDragging}
                  isReorder={isReorderOperation}
                  overItemId={overItemId}
                  draggingItemId={draggingItemId}
                  onDoubleClick={onItemDoubleClick}
                  dragPosition={dragPosition}
                  findParentItemId={findParentItemId}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

function findItemById(items: ItemResponse[], id: string): ItemResponse | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.subitems) {
      const found = findItemById(item.subitems, id);
      if (found) return found;
    }
  }
  return null;
}

