import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useUpdateItem } from '../infrastructure/di/container';
import { moveItem, findItemPath } from '../utils/nestedUpdate';

interface DebugTreeProps {
  items: ItemResponse[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  width: number;
  onWidthChange: (width: number) => void;
  onClose?: () => void;
}

interface SortableItemProps {
  item: ItemResponse;
  level: number;
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}

function TreeItem({ item, level, selectedItemId, onSelectItem, isLast, parentPath }: {
  item: ItemResponse;
  level: number;
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  isLast: boolean;
  parentPath: boolean[];
}) {
  const isSelected = item.id === selectedItemId;
  const hasChildren = item.subitems && item.subitems.length > 0;
  const indent = level * 16;

  return (
    <div className="flex items-start">
      {/* Tree lines */}
      <div className="flex-shrink-0" style={{ width: `${indent}px` }}>
        {level > 0 && (
          <div className="relative h-full">
            {/* Vertical line */}
            {parentPath.slice(0, -1).map((_, idx) => (
              <div
                key={idx}
                className="absolute border-l border-slate-600"
                style={{
                  left: `${idx * 16 + 8}px`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                }}
              />
            ))}
            {/* Horizontal line */}
            <div
              className="absolute border-t border-slate-600"
              style={{
                left: `${(level - 1) * 16 + 8}px`,
                top: '12px',
                width: '8px',
                height: '1px',
              }}
            />
            {/* Vertical line continuation (if not last) */}
            {!isLast && (
              <div
                className="absolute border-l border-slate-600"
                style={{
                  left: `${(level - 1) * 16 + 8}px`,
                  top: '12px',
                  bottom: 0,
                  width: '1px',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Item content */}
      <div className="flex-1 min-w-0">
        <div
          className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem(isSelected ? null : item.id);
          }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <span className="text-slate-400 text-[10px]">▼</span>
            )}
            {!hasChildren && <span className="text-slate-500 text-[10px]">•</span>}
            <span className="font-medium truncate">{item.title}</span>
            <span className="ml-auto text-slate-400 text-[10px]">
              ({item.subitems?.length || 0})
            </span>
          </div>
        </div>
        {hasChildren && (
          <div className="mt-1">
            {item.subitems!.map((subitem, index) => (
              <TreeItem
                key={subitem.id}
                item={subitem}
                level={level + 1}
                selectedItemId={selectedItemId}
                onSelectItem={onSelectItem}
                isLast={index === item.subitems!.length - 1}
                parentPath={[...parentPath, index === item.subitems!.length - 1]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
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

export default function DebugTree({ items, selectedItemId, onSelectItem, width, onWidthChange, onClose }: DebugTreeProps) {
  const updateItem = useUpdateItem();
  const [localItems, setLocalItems] = useState(items);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.8;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onWidthChange]);

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
    <>
      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className={`bg-slate-700 hover:bg-slate-600 cursor-col-resize transition-colors ${
          isResizing ? 'bg-blue-500' : ''
        }`}
        style={{ width: '4px' }}
      />

      {/* Debug Tree Panel */}
      <div
        className="bg-slate-900 border-l border-slate-700 p-4 overflow-y-auto h-full flex flex-col"
        style={{ width: `${width}px`, minWidth: '200px' }}
      >
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">Debug Tree</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
                title="Cerrar panel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => onSelectItem(null)}
            className="text-xs text-slate-400 hover:text-white mb-2"
          >
            Clear Selection
          </button>
        </div>

        <div className="mb-4 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Tree View</h3>
          <div className="max-h-96 overflow-y-auto bg-slate-800 rounded p-2">
            {localItems.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">No items</div>
            ) : (
              localItems.map((item, index) => (
                <TreeItem
                  key={item.id}
                  item={item}
                  level={0}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  isLast={index === localItems.length - 1}
                  parentPath={[index === localItems.length - 1]}
                />
              ))
            )}
          </div>
        </div>

        <div className="mb-4 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Drag & Drop</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
              <div className="max-h-48 overflow-y-auto bg-slate-800 rounded p-2">
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
          <div className="mb-4 flex-shrink-0">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Selected: {selectedItem.title}
            </h3>
            <div className="max-h-64 overflow-y-auto bg-slate-800 rounded p-2">
              {renderJSON(selectedItem)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


