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
import { TaskResponse } from '../types/task';
import { useUpdateTask } from '../hooks/useTasks';
import TaskItem from './TaskItem';
import { flattenTasks } from '../utils/taskUtils';

interface TaskListProps {
  tasks: TaskResponse[];
  onAddSubitem: (parentId: string) => void;
}

export default function TaskList({ tasks, onAddSubitem }: TaskListProps) {
  const updateTask = useUpdateTask();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allTaskIds = flattenTasks(tasks).map(task => task.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeTask = findTaskById(tasks, active.id as string);
    const overTask = findTaskById(tasks, over.id as string);

    if (!activeTask || !overTask) {
      return;
    }

    // Prevent moving a task into its own descendant (would create a cycle)
    if (isDescendant(overTask, activeTask.id)) {
      return;
    }
    
    // Prevent moving a task to itself
    if (activeTask.id === overTask.id) {
      return;
    }

    // When dragging over a task, make it a child of that task
    // Otherwise, make it a sibling (same parent as the over task)
    const newParentId = overTask.id; // Make it a child of the over task
    const newOrder = 0; // Will be set by backend

    // Update the task
    updateTask.mutate({
      id: activeTask.id,
      data: {
        parentId: newParentId,
        order: newOrder,
      },
    });
  };

  // Check if task is a descendant of potentialAncestor
  const isDescendant = (potentialAncestor: TaskResponse, taskId: string): boolean => {
    if (potentialAncestor.id === taskId) {
      return true;
    }
    if (potentialAncestor.subitems) {
      for (const subitem of potentialAncestor.subitems) {
        if (isDescendant(subitem, taskId)) {
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
      <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              level={0}
              onAddSubitem={onAddSubitem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function findTaskById(tasks: TaskResponse[], id: string): TaskResponse | null {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    if (task.subitems) {
      const found = findTaskById(task.subitems, id);
      if (found) return found;
    }
  }
  return null;
}

