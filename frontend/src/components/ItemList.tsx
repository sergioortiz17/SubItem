import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allItemIds = flattenItems(items).map(item => item.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item, index) => {
            // Create a unique key that includes subitems count and IDs to force re-render when subitems change
            const subitemsCount = item.subitems?.length || 0;
            // Use sorted IDs to create a stable key based on subitems
            const subitemsKey = item.subitems?.map(s => s.id).sort().join(',') || '';
            return (
              <ItemComponent
                key={`${item.id}-${index}-${subitemsCount}-${subitemsKey}`}
                item={item}
                level={0}
                onAddSubitem={onAddSubitem}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
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

