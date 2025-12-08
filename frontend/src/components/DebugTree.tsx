import { useState, useEffect } from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemResponse } from '../types/item';
import { useUpdateItem } from '../hooks/useItems';
import { moveItem, findItemPath } from '../utils/nestedUpdate';

interface DebugTreeProps {
  items: ItemResponse[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}

interface SortableItemProps {
  item: ItemResponse;
  level: number;
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}

function SortableItem({ item, level, selectedItemId, onSelectItem }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'item',
      item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = item.id === selectedItemId;
  const indent = level * 20;

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        {...attributes}
        {...listeners}
        className={`px-2 py-1 rounded cursor-grab active:cursor-grabbing text-xs ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        style={{ marginLeft: `${indent}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectItem(isSelected ? null : item.id);
        }}
      >
        <span className="font-medium">{item.title}</span>
        <span className="ml-2 text-slate-400">
          ({item.subitems?.length || 0} subitems)
        </span>
      </div>
      {item.subitems && item.subitems.length > 0 && (
        <div className="ml-2">
          {item.subitems.map((subitem) => (
            <SortableItem
              key={subitem.id}
              item={subitem}
              level={level + 1}
              selectedItemId={selectedItemId}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DebugTree({ items, selectedItemId, onSelectItem }: DebugTreeProps) {
  const updateItem = useUpdateItem();
  const [localItems, setLocalItems] = useState(items);

  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const flattenItemIds = (itemList: ItemResponse[]): string[] => {
    const ids: string[] = [];
    const traverse = (is: ItemResponse[]) => {
      is.forEach(i => {
        ids.push(i.id);
        if (i.subitems && i.subitems.length > 0) {
          traverse(i.subitems);
        }
      });
    };
    traverse(itemList);
    return ids;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the items
    const activePath = findItemPath(localItems, activeId);
    const overPath = findItemPath(localItems, overId);

    if (!activePath || !overPath) {
      return;
    }

    const activeItem = activePath[activePath.length - 1];
    const overItem = overPath[overPath.length - 1];

    // Prevent moving into itself or descendants
    if (activeItem.id === overItem.id) {
      return;
    }

    // Check if overItem is a descendant of activeItem
    const overItemIds = overPath.map(i => i.id);
    if (overItemIds.includes(activeItem.id)) {
      return; // Can't move into own descendant
    }

    // Determine new parent: if dragging over an item, make it a child of that item
    const newParentId = overItem.id;

    // Optimistically update local state
    const updatedItems = moveItem(localItems, activeId, newParentId);
    setLocalItems(updatedItems);

        // Update in backend
        updateItem.mutate({
          id: activeId,
          data: {
            itemId: newParentId, // Moves to level 0 of the target item
          },
        });
  };
  const allItemIds = flattenItemIds(localItems);

  const renderJSON = (item: ItemResponse): JSX.Element => {
    return (
      <div key={item.id} className="mb-2">
        <div className="text-xs font-mono bg-slate-800 p-2 rounded border border-slate-700">
          <div className="text-blue-400">"{item.title}"</div>
          <div className="text-slate-400 ml-4">
            id: {item.id}
          </div>
          <div className="text-slate-400 ml-4">
            levelId: {item.levelId || 'null'}
          </div>
          {item.levelNum !== null && item.levelNum !== undefined && (
            <div className="text-slate-400 ml-4">
              levelNum: {item.levelNum}
            </div>
          )}
          <div className="text-slate-400 ml-4">
            subitems: [{item.subitems?.length || 0}]
          </div>
          {item.subitems && item.subitems.length > 0 && (
            <div className="ml-4 mt-1">
              {item.subitems.map((subitem) => renderJSON(subitem))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedItem = selectedItemId
    ? (() => {
        const path = findItemPath(localItems, selectedItemId);
        return path ? path[path.length - 1] : null;
      })()
    : null;

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 p-4 overflow-y-auto h-full">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white mb-2">Debug Tree</h2>
        <button
          onClick={() => onSelectItem(null)}
          className="text-xs text-slate-400 hover:text-white mb-2"
        >
          Clear Selection
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Tree View (Drag & Drop)</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
            <div className="max-h-64 overflow-y-auto">
              {localItems.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  level={0}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {selectedItem && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Selected: {selectedItem.title}
          </h3>
          <div className="max-h-96 overflow-y-auto">
            {renderJSON(selectedItem)}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Raw JSON (from API)</h3>
        <pre className="text-xs bg-slate-800 p-2 rounded border border-slate-700 overflow-x-auto max-h-64 overflow-y-auto">
          {JSON.stringify(items, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Local State (optimistic)</h3>
        <pre className="text-xs bg-slate-800 p-2 rounded border border-slate-700 overflow-x-auto max-h-64 overflow-y-auto">
          {JSON.stringify(localItems, null, 2)}
        </pre>
      </div>
    </div>
  );
}


