import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemResponse } from '../types/item';
import { countSubitems, calculateProgress } from '../utils/itemUtils';
import { useUpdateItem, useDeleteItem } from '../hooks/useItems';
import { expandedItems } from '../utils/expandedState';

interface ItemComponentProps {
  item: ItemResponse;
  level?: number;
  numbering?: string; // Hierarchical numbering like "1", "1.1", "1.2", etc.
  onAddSubitem: (parentId: string) => void;
  isDragOver?: boolean; // Whether this item is being dragged over
  isReorder?: boolean; // Whether this is a reorder operation (same level)
  overItemId?: string | null; // ID of item being dragged over (for recursive checking)
  draggingItemId?: string | null; // ID of item being dragged (for recursive checking)
  onDoubleClick?: (itemId: string) => void; // Handler for double click on item card
  dragPosition?: { itemId: string; isAbove: boolean } | null; // Current drag position info
  findParentItemId?: (itemId: string) => string | null; // Function to find parent item ID
  allItems?: ItemResponse[]; // All items for finding parent
}

const MAX_DEPTH = 4; // Maximum depth of subitems

export default function ItemComponent({ item, level = 0, numbering = '', onAddSubitem, isDragOver = false, isReorder: propIsReorder = false, overItemId = null, draggingItemId = null, onDoubleClick, dragPosition = null, findParentItemId, allItems = [] }: ItemComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  
  // Calculate isReorder based on prop (set by parent based on reorder mode)
  const isReorder = propIsReorder;
  
  // Calculate these first so they're available in useEffect
  // Use item.subitems directly to ensure we're using the latest data
  const subitems = item.subitems || [];
  const hasSubitems = subitems.length > 0;
  const { direct, total } = countSubitems(item);
  const { completed, total: totalItems, percentage } = calculateProgress(item);
  
  // Initialize expanded state from global set, default to false (user must manually expand)
  const [isExpanded, setIsExpandedState] = useState(() => {
    // If item is already in the set, use that state, otherwise default to false
    if (expandedItems.has(item.id)) {
      return true;
    }
    // Default to false - user must manually expand
    return false;
  });
  
  // Update expanded state and persist it globally
  const setIsExpanded = (value: boolean) => {
    if (value) {
      expandedItems.add(item.id);
    } else {
      expandedItems.delete(item.id);
    }
    setIsExpandedState(value);
  };
  
  // Listen for collapse-all event
  useEffect(() => {
    const handleCollapseAll = () => {
      expandedItems.delete(item.id);
      setIsExpandedState(false);
    };
    window.addEventListener('collapse-all', handleCollapseAll);
    return () => window.removeEventListener('collapse-all', handleCollapseAll);
  }, [item.id]);

  // No auto-expand - user must manually expand items
  
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  
  // Update edit title when item title changes
  useEffect(() => {
    setEditTitle(item.title);
  }, [item.title]);
  
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

  // When this item is being dragged, let it follow the cursor (use normal transform)
  // When other items are being dragged, keep them in place (no transform)
  const isThisItemDragging = isDragging;
  const isOtherItemDragging = draggingItemId && draggingItemId !== item.id;
  
  const style: React.CSSProperties = {
    // If this item is being dragged, use the transform to follow cursor
    // If another item is being dragged, don't apply transform (stay in place)
    transform: isThisItemDragging 
      ? CSS.Transform.toString(transform) // Follow cursor
      : isOtherItemDragging
        ? undefined // Stay in place when other item is dragged
        : CSS.Transform.toString(transform), // Normal state
    transition: isThisItemDragging || isOtherItemDragging ? 'none' : transition,
    opacity: isThisItemDragging ? 0.7 : 1,
    pointerEvents: isThisItemDragging ? 'none' : 'auto',
    zIndex: isThisItemDragging ? 50 : undefined,
  };

  const handleStatusChange = (newStatus: 'todo' | 'doing' | 'done') => {
    updateItem.mutate({ id: item.id, data: { status: newStatus } });
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      updateItem.mutate(
        { id: item.id, data: { title: editTitle.trim() } },
        { onSuccess: () => setIsEditing(false) }
      );
    }
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar esta tarea y todos sus subitems?')) {
      deleteItem.mutate(item.id);
    }
  };

  // Find parent item by searching recursively in the tree
  const findParentItem = (): ItemResponse | null => {
    if (level === 0 || allItems.length === 0) {
      return null; // Root items have no parent
    }
    
    // Recursively search for the parent item
    const findParent = (items: ItemResponse[], targetId: string): ItemResponse | null => {
      for (const it of items) {
        // Check if this item has the target as a direct subitem
        if (it.subitems) {
          for (const subitem of it.subitems) {
            if (subitem.id === targetId) {
              return it; // Found parent
            }
            // Recursively check nested subitems
            const found = findParent([subitem], targetId);
            if (found) return found;
          }
        }
      }
      return null;
    };
    
    return findParent(allItems, item.id);
  };
  
  const handleLevelUp = () => {
    const parentItem = findParentItem();
    if (!parentItem) {
      // If no parent found, move to root (level 0)
      updateItem.mutate({
        id: item.id,
        data: {
          levelId: null, // Move to root
        },
      });
    } else {
      // Move to parent's level
      // If parent is root, move to root
      // Otherwise, use parent's levelId
      if (parentItem.levelId === null) {
        // Parent is root, move to root
        updateItem.mutate({
          id: item.id,
          data: {
            levelId: null,
          },
        });
      } else {
        // Parent has a level, move to parent's level
        updateItem.mutate({
          id: item.id,
          data: {
            levelId: parentItem.levelId,
          },
        });
      }
    }
  };
  
  const hasParent = level > 0; // Only show level up if not at root level

  const handleAddSubitem = () => {
    if (level >= MAX_DEPTH - 1) {
      alert(`No se pueden agregar más de ${MAX_DEPTH} niveles de profundidad`);
      return;
    }
    onAddSubitem(item.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-600';
      case 'doing':
        return 'bg-orange-600';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 ${isDragging ? 'z-50' : ''}`}
      data-id={item.id}
    >
      {/* Main Task Card */}
      <div
        className={`bg-slate-800 border-2 rounded-lg p-4 transition-all box-border ${
          isDragOver
            ? isReorder
              ? 'border-purple-500 shadow-lg shadow-purple-500/50 bg-purple-900/20'
              : 'border-blue-500 shadow-lg shadow-blue-500/50 bg-blue-900/20'
            : 'border-slate-700 hover:border-slate-600'
        }`}
        onDoubleClick={(e) => {
          // Only trigger if double click is on the card itself, not on interactive elements
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('button, input, select, a, [role="button"]');
          if (!isInteractive && onDoubleClick) {
            e.stopPropagation();
            onDoubleClick(item.id);
          }
        }}
      >
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-300 mt-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="4" r="1.5" />
              <circle cx="12" cy="4" r="1.5" />
              <circle cx="4" cy="8" r="1.5" />
              <circle cx="12" cy="8" r="1.5" />
              <circle cx="4" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
            </svg>
          </div>

          {/* Expand/Collapse Button */}
          {hasSubitems ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-blue-400 mt-1 w-4 h-4 flex items-center justify-center transition-colors"
              title={isExpanded ? 'Colapsar subitems' : 'Expandir subitems'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id={`edit-title-${item.id}`}
                  name={`edit-title-${item.id}`}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      setEditTitle(item.title);
                      setIsEditing(false);
                    }
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {numbering && (
                    <span className="text-slate-500 font-mono text-sm flex-shrink-0">
                      {numbering}.
                    </span>
                  )}
                  <h3
                    className="text-white font-medium cursor-pointer hover:text-blue-400"
                    onDoubleClick={() => setIsEditing(true)}
                  >
                    {item.title}
                  </h3>
                  {hasSubitems && !isExpanded && (
                    <span className="text-xs text-slate-500 italic">
                      ({direct} subitem{direct !== 1 ? 's' : ''} oculto{direct !== 1 ? 's' : ''})
                    </span>
                  )}
                  {total > 0 && (
                    <span className="text-xs text-slate-400">
                      ({direct}{total > direct ? '+' : ''})
                    </span>
                  )}
                </div>
                
                {/* Status - moved to the right */}
                <select
                  id={`status-${item.id}`}
                  name={`status-${item.id}`}
                  value={item.status}
                  onChange={(e) => handleStatusChange(e.target.value as 'todo' | 'doing' | 'done')}
                  className={`${getStatusColor(item.status)} text-white text-xs px-2 py-1 rounded border-0 cursor-pointer flex-shrink-0`}
                >
                  <option value="todo">Pendiente</option>
                  <option value="doing">En curso</option>
                  <option value="done">Completado</option>
                </select>
              </div>
            )}

            {/* Progress Bar */}
            {totalItems > 1 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {Math.round(percentage)}% ({completed}/{totalItems})
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleAddSubitem}
                disabled={level >= MAX_DEPTH - 1}
                className="text-xs text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title={level >= MAX_DEPTH - 1 ? `Máximo ${MAX_DEPTH} niveles permitidos` : 'Agregar subitem'}
              >
                + Subitem
              </button>
              {hasParent && (
                <button
                  onClick={handleLevelUp}
                  className="text-xs text-slate-400 hover:text-green-400"
                  title="Mover al mismo nivel que el padre"
                >
                  Level Up
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-slate-400 hover:text-blue-400"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subitems Container - Always positioned directly below the main task card */}
      {hasSubitems && isExpanded && subitems.length > 0 && level < MAX_DEPTH - 1 && (
        <div className="mt-2" style={{ marginLeft: `${(level + 1) * 16}px` }}>
          <div className="border-l-2 border-slate-700 pl-4 space-y-2">
            {subitems.map((subitem, subIndex) => {
              // Use a stable key based on subitem ID and its subitems count
              const subitemsKey = subitem.subitems?.map(s => s.id).sort().join(',') || '';
              const subitemsCount = subitem.subitems?.length || 0;
              // Generate numbering for this subitem (e.g., "1.1", "1.2", "1.1.1")
              const baseNumbering = numbering ? `${numbering}.` : '';
              const subitemNumbering = `${baseNumbering}${subIndex + 1}`;
              const isSubitemOver = overItemId === subitem.id && draggingItemId !== subitem.id;
              // Calculate isReorder for this subitem (propagate from parent)
              const isSubitemReorder = isReorder && isSubitemOver;
              return (
                <ItemComponent
                  key={`${subitem.id}-${subIndex}-${subitemsCount}-${subitemsKey}`}
                  item={subitem}
                  level={level + 1}
                  numbering={subitemNumbering}
                  onAddSubitem={onAddSubitem}
                  isDragOver={isSubitemOver}
                  isReorder={isSubitemReorder}
                  overItemId={overItemId}
                  draggingItemId={draggingItemId}
                  onDoubleClick={onDoubleClick}
                  dragPosition={dragPosition}
                  findParentItemId={findParentItemId}
                  allItems={allItems}
                />
              );
            })}
          </div>
        </div>
      )}
      {level >= MAX_DEPTH - 1 && hasSubitems && (
        <div className="mt-2 ml-4 text-xs text-slate-500 italic">
          (Máximo {MAX_DEPTH} niveles alcanzado - {subitems.length} subitem{subitems.length !== 1 ? 's' : ''} oculto{subitems.length !== 1 ? 's' : ''})
        </div>
      )}
    </div>
  );
}



