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
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allItemIds = flattenItems(items).map(item => item.id);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingItemId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setOverItemId(over.id as string);
    } else {
      setOverItemId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset drag state
    setDraggingItemId(null);
    setOverItemId(null);

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

    // Check if both items have the same parent (same level)
    const activeParentId = findParentItemId(activeItem.id);
    const overParentId = findParentItemId(overItem.id);

    // If they have the same parent, just reorder (don't change parent)
    if (activeParentId === overParentId) {
      // Same level - just reorder by moving after the overItem
      // The backend will recalculate the order
      updateItem.mutate({
        id: activeItem.id,
        data: {
          order: overItem.order + 1, // Place after the overItem
        },
      });
    } else {
      // Different levels - make it a subitem of the over item
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
  
  // Determine if it's a reorder (same level) or move to different level
  const isReorder = draggingItem && overItem && draggingItem.id !== overItem.id
    ? findParentItemId(draggingItem.id) === findParentItemId(overItem.id)
    : false;

  return (
    <>
      {/* Drag overlay message */}
      {draggingItem && overItem && overItem.id !== draggingItem.id && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
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
              return (
                <ItemComponent
                  key={`${item.id}-${index}-${subitemsCount}-${subitemsKey}`}
                  item={item}
                  level={0}
                  numbering={numbering}
                  onAddSubitem={onAddSubitem}
                  isDragOver={isOver && !isDragging}
                  overItemId={overItemId}
                  draggingItemId={draggingItemId}
                  onDoubleClick={onItemDoubleClick}
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

