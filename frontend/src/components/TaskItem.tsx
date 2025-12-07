import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskResponse } from '../types/task';
import { countSubitems, calculateProgress } from '../utils/taskUtils';
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks';

interface TaskItemProps {
  task: TaskResponse;
  level?: number;
  onAddSubitem: (parentId: string) => void;
}

// Global state to track expanded tasks (shared across all TaskItem instances)
const expandedTasks = new Set<string>();

export default function TaskItem({ task, level = 0, onAddSubitem }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  
  // Initialize expanded state from global set, default to true for new tasks
  const [isExpanded, setIsExpandedState] = useState(() => {
    // If task is already in the set, use that state, otherwise default to true
    if (expandedTasks.has(task.id)) {
      return true;
    }
    // Default to true for new tasks
    expandedTasks.add(task.id);
    return true;
  });
  
  // Update expanded state and persist it globally
  const setIsExpanded = (value: boolean) => {
    if (value) {
      expandedTasks.add(task.id);
    } else {
      expandedTasks.delete(task.id);
    }
    setIsExpandedState(value);
  };
  
  // Ensure expanded state is synced with global state when task updates
  useEffect(() => {
    if (expandedTasks.has(task.id) && !isExpanded) {
      setIsExpandedState(true);
    }
  }, [task.id]);
  
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  
  // Update edit title when task title changes
  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { direct, total } = countSubitems(task);
  const { completed, total: totalItems, percentage } = calculateProgress(task);
  const hasSubitems = task.subitems && task.subitems.length > 0;

  const handleStatusChange = (newStatus: 'todo' | 'doing' | 'done') => {
    updateTask.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      updateTask.mutate(
        { id: task.id, data: { title: editTitle.trim() } },
        { onSuccess: () => setIsEditing(false) }
      );
    }
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar esta tarea y todos sus subitems?')) {
      deleteTask.mutate(task.id);
    }
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
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
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
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      setEditTitle(task.title);
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
                  <h3
                    className="text-white font-medium cursor-pointer hover:text-blue-400"
                    onDoubleClick={() => setIsEditing(true)}
                  >
                    {task.title}
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
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as 'todo' | 'doing' | 'done')}
                  className={`${getStatusColor(task.status)} text-white text-xs px-2 py-1 rounded border-0 cursor-pointer flex-shrink-0`}
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
                onClick={() => onAddSubitem(task.id)}
                className="text-xs text-slate-400 hover:text-blue-400"
              >
                + Subitem
              </button>
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

      {/* Subitems */}
      {hasSubitems && isExpanded && (
        <div className="mt-2 ml-4 border-l-2 border-slate-700 pl-4 space-y-2">
          {task.subitems!.map((subitem) => (
            <TaskItem
              key={subitem.id}
              task={subitem}
              level={level + 1}
              onAddSubitem={onAddSubitem}
            />
          ))}
        </div>
      )}
    </div>
  );
}


