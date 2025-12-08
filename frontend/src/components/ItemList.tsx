import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ItemResponse } from '../types/item';
import { useUpdateItem } from '../infrastructure/di/container';
import { useDragAndDrop } from '../presentation/hooks/useDragAndDrop';
import { ItemTreeService } from '../domain/services/ItemTreeService';
import ItemComponent from './ItemComponent';

interface ItemListProps {
  items: ItemResponse[];
  onAddSubitem: (parentId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  reorderMode?: boolean; // Whether reorder mode is active
}

export default function ItemList({ items, onAddSubitem, onItemDoubleClick, reorderMode = false }: ItemListProps) {
  const updateItem = useUpdateItem();
  
  // Use drag and drop hook
  const { dragState, handleDragStart, handleDragOver, handleDragEnd } = useDragAndDrop({
    items,
    reorderMode,
    onReorder: (activeItemId, targetItemId, position) => {
      const targetItem = ItemTreeService.findById<ItemResponse>(items, targetItemId);
      if (!targetItem) return;
      
      const newOrder = position === 'before' ? targetItem.order : targetItem.order + 1;
      updateItem.mutate({
        id: activeItemId,
        data: { order: newOrder },
      });
    },
    onMove: (activeItemId, targetItemId) => {
      updateItem.mutate({
        id: activeItemId,
        data: { itemId: targetItemId },
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allItemIds = ItemTreeService.flatten<ItemResponse>(items).map(item => item.id);

  const overItem = dragState.overItemId ? ItemTreeService.findById<ItemResponse>(items, dragState.overItemId) : null;
  const draggingItem = dragState.draggingItemId ? ItemTreeService.findById<ItemResponse>(items, dragState.draggingItemId) : null;
  
  // Determine if it's a reorder based on reorder mode
  const isReorder = reorderMode && draggingItem && overItem && draggingItem.id !== overItem.id;
  
  // Helper function for finding parent ID
  const findParentItemId = (itemId: string) => ItemTreeService.findParentId<ItemResponse>(items, itemId);

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
              const isOver = dragState.overItemId === item.id;
              const isDragging = dragState.draggingItemId === item.id;
              const isReorderOperation = reorderMode && draggingItem && isOver && !isDragging ? true : false;
              
              return (
                <ItemComponent
                  key={`${item.id}-${index}-${subitemsCount}-${subitemsKey}`}
                  item={item}
                  level={0}
                  numbering={numbering}
                  onAddSubitem={onAddSubitem}
                  isDragOver={isOver && !isDragging}
                  isReorder={isReorderOperation}
                  overItemId={dragState.overItemId}
                  draggingItemId={dragState.draggingItemId}
                  onDoubleClick={onItemDoubleClick}
                  dragPosition={dragState.dragPosition}
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


