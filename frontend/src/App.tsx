import { useState } from 'react';
import { useTasks, useCreateTask } from './hooks/useTasks';
import TaskList from './components/TaskList';
import ImportExport from './components/ImportExport';

function App() {
  const { data, isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      createTask.mutate(
        {
          title: newTaskTitle.trim(),
          status: 'todo',
          parentId: null,
        },
        {
          onSuccess: () => {
            setNewTaskTitle('');
          },
        }
      );
    }
  };

  const handleAddSubitem = (parentId: string) => {
    const title = prompt('Título del subitem:');
    if (title && title.trim()) {
      createTask.mutate({
        title: title.trim(),
        status: 'todo',
        parentId: parentId,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400">Error al cargar las tareas</div>
      </div>
    );
  }

  const tasks = data?.tasks || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">RoadMap SubItem</h1>
            <ImportExport />
          </div>

          {/* Add Task Input */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTask();
                }
              }}
              placeholder="Nueva tarea..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim() || createTask.isPending}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTask.isPending ? 'Agregando...' : 'Agregar Tarea'}
            </button>
          </div>
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No hay tareas. Agrega una nueva tarea para comenzar.</p>
          </div>
        ) : (
          <TaskList tasks={tasks} onAddSubitem={handleAddSubitem} />
        )}
      </div>
    </div>
  );
}

export default App;


