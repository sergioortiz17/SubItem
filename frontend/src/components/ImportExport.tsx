import { useRef, useState, useEffect } from 'react';
import { useImportItems, useItems, useDeleteItem } from '../hooks/useItems';
import { itemService } from '../services/api';
import { Item } from '../types/item';
import { flattenItems } from '../utils/itemUtils';
import { expandedItems } from '../utils/expandedState';

export default function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const importItems = useImportItems();
  const { data: itemsData } = useItems();
  const deleteItem = useDeleteItem();
  const [history, setHistory] = useState<Item[][]>([]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await itemService.export();
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
      console.error('Error exporting items:', error);
      alert('Error al exportar los items');
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
      const data = JSON.parse(text) as { items: Item[] };
      
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Formato de archivo inválido');
      }

      if (window.confirm('¿Importar estos items? Esto reemplazará todos los items existentes.')) {
        // Save current state to history before import
        if (itemsData?.items && itemsData.items.length > 0) {
          // Flatten items for history
          const flatItems = flattenItems(itemsData.items);
          setHistory(prev => [...prev, flatItems]);
        }
        importItems.mutate(data, {
          onSuccess: () => {
            alert('Items importados exitosamente');
          },
          onError: (error) => {
            console.error('Error importing items:', error);
            alert('Error al importar los items');
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

  const handleDeleteAll = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar TODOS los items?')) {
      return;
    }

    const items = itemsData?.items || [];
    
    // Save to history before deleting
    if (items.length > 0) {
      const flatItems = flattenItems(items);
      setHistory(prev => [...prev, flatItems]);
    }

    // Delete all items sequentially to avoid race conditions
    const allItems = flattenItems(items);
    for (const item of allItems) {
      await deleteItem.mutateAsync(item.id);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) {
      alert('No hay acciones para deshacer');
      return;
    }

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    
    // Import the previous state
    try {
      await importItems.mutateAsync({ items: previousState });
      alert('Acción deshecha');
    } catch (error) {
      console.error('Error undoing:', error);
      alert('Error al deshacer la acción');
      // Restore history on error
      setHistory([...newHistory, previousState]);
    }
  };

  const [, setCollapseTrigger] = useState(0);

  const handleCollapseAll = () => {
    // Clear all expanded items and dispatch event to collapse all
    expandedItems.clear();
    // Dispatch event to collapse all item components
    window.dispatchEvent(new Event('collapse-all'));
    // Trigger re-render
    setCollapseTrigger(prev => prev + 1);
  };

  // Listen for collapse-all event
  useEffect(() => {
    const handleCollapseEvent = () => {
      // This will trigger a re-render
      setCollapseTrigger(prev => prev + 1);
    };
    window.addEventListener('collapse-all', handleCollapseEvent);
    return () => window.removeEventListener('collapse-all', handleCollapseEvent);
  }, []);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? 'Exportando...' : 'Exportar JSON'}
      </button>
      
      <button
        onClick={handleImport}
        disabled={importItems.isPending}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {importItems.isPending ? 'Importando...' : 'Importar JSON'}
      </button>

      <button
        onClick={handleDeleteAll}
        disabled={!itemsData?.items || itemsData.items.length === 0}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Borrar Todo
      </button>

      <button
        onClick={handleUndo}
        disabled={history.length === 0}
        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Deshacer
      </button>

      <button
        onClick={handleCollapseAll}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Comprimir Todo
      </button>
      
      <input
        ref={fileInputRef}
        id="import-file-input"
        name="import-file-input"
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

