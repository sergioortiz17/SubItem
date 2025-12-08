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
  const [dragPosition, setDragPosition] = useState<{ itemId: string; isEdge: boolean; isAbove: boolean } | null>(null);
  
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
      
      // Get the container element with data-id
      const containerElement = document.querySelector(`[data-id="${over.id}"]`) as HTMLElement;
      
      // Find the actual card element (the div with bg-slate-800) inside the container
      let cardElement: HTMLElement | null = null;
      
      if (containerElement) {
        // Look for the card element (the one with the border and background)
        cardElement = containerElement.querySelector('.bg-slate-800.border-2') as HTMLElement;
        
        // If not found, try to find it by traversing from the event target
        if (!cardElement && activatorEvent.target) {
          const target = (activatorEvent.target as HTMLElement).closest('.bg-slate-800.border-2') as HTMLElement;
          if (target && containerElement.contains(target)) {
            cardElement = target;
          }
        }
      }
      
      // Fallback: try to find by closest data-id from event target
      if (!cardElement && activatorEvent.target) {
        const closestContainer = (activatorEvent.target as HTMLElement).closest('[data-id]') as HTMLElement;
        if (closestContainer && closestContainer.getAttribute('data-id') === over.id) {
          cardElement = closestContainer.querySelector('.bg-slate-800.border-2') as HTMLElement;
        }
      }
      
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const mouseX = (activatorEvent as MouseEvent).clientX;
        const mouseY = (activatorEvent as MouseEvent).clientY;
        const relativeX = mouseX - rect.left;
        const relativeY = mouseY - rect.top;
        const width = rect.width;
        const height = rect.height;
        const percentageX = (relativeX / width) * 100;
        const percentageY = (relativeY / height) * 100;
        
        // Borde izquierdo (primeros 25%) o borde derecho (últimos 25%) → reordenar
        // Medio (25% - 75%) → mover
        const isEdge = percentageX < 25 || percentageX > 75;
        
        // Determine if mouse is above or below the center of the item
        const isAbove = percentageY < 50;
        
        setDragPosition({
          itemId: over.id as string,
          isEdge,
          isAbove,
        });
      } else {
        // If element not found, default to middle (move operation)
        setDragPosition({
          itemId: over.id as string,
          isEdge: false,
          isAbove: false,
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
    const isEdge = dragPosition?.itemId === overItem.id && dragPosition.isEdge;
    const isAbove = dragPosition?.itemId === overItem.id && dragPosition.isAbove;
    const activeParentId = findParentItemId(activeItem.id);
    const overParentId = findParentItemId(overItem.id);
    const sameLevel = activeParentId === overParentId;

    // If dragging to edge (left or right border) AND same level, reorder
    // If dragging to middle/center, move to the over item (make it a subitem)
    // This works regardless of whether they're at the same level or not
    if (isEdge && sameLevel) {
      // Same level and edge (left or right border) - reorder
      // Determine the correct order based on direction
      let newOrder: number;
      if (isAbove) {
        // Dragging above center - place before overItem
        newOrder = overItem.order;
      } else {
        // Dragging below center - place after overItem
        newOrder = overItem.order + 1;
      }
      
      updateItem.mutate({
        id: activeItem.id,
        data: {
          order: newOrder,
        },
      });
    } else {
      // Middle/center - make it a subitem of the over item
      // The backend will automatically create level 0 if it doesn't exist
      // This works for same level or different levels
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
      && dragPosition.isEdge 
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
              // Check if this is a reorder operation (edge + same level)
              const isReorderOperation = draggingItem && isOver && !isDragging && dragPosition
                ? dragPosition.itemId === item.id
                  && dragPosition.isEdge
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
                  allItems={items}
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

