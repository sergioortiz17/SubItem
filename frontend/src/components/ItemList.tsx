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
}

export default function ItemList({ items, onAddSubitem }: ItemListProps) {
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

    // When dragging over an item, make it a subitem of that item (in level 0)
    const newItemId = overItem.id; // Make it a subitem of the over item

    // Update the item - don't send order, let backend calculate it
    updateItem.mutate({
      id: activeItem.id,
      data: {
        itemId: newItemId, // Moves to level 0 of the target item
      },
    });
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

  const overItem = overItemId ? findItemById(items, overItemId) : null;
  const draggingItem = draggingItemId ? findItemById(items, draggingItemId) : null;

  return (
    <>
      {/* Drag overlay message */}
      {draggingItem && overItem && overItem.id !== draggingItem.id && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="font-medium">Mover</span>
          <span className="font-bold">"{draggingItem.title}"</span>
          <span>a</span>
          <span className="font-bold">"{overItem.title}"</span>
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

