import { useRef, useState } from 'react';
import { useImportTasks } from '../hooks/useTasks';
import { taskService } from '../services/api';
import { TaskResponse } from '../types/task';

export default function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const importTasks = useImportTasks();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await taskService.export();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roadmap-subitem-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting tasks:', error);
      alert('Error al exportar las tareas');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as { tasks: TaskResponse[] };
      
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('Formato de archivo inválido');
      }

      if (window.confirm('¿Importar estas tareas? Esto reemplazará todas las tareas existentes.')) {
        importTasks.mutate(data, {
          onSuccess: () => {
            alert('Tareas importadas exitosamente');
          },
          onError: (error) => {
            console.error('Error importing tasks:', error);
            alert('Error al importar las tareas');
          },
        });
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error al leer el archivo');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? 'Exportando...' : 'Exportar JSON'}
      </button>
      
      <button
        onClick={handleImport}
        disabled={importTasks.isPending}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {importTasks.isPending ? 'Importando...' : 'Importar JSON'}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

