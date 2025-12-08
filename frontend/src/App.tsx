import { useState } from 'react';
import { useItems, useCreateItem } from './hooks/useItems';
import ItemList from './components/ItemList';
import ImportExport from './components/ImportExport';
import DebugTree from './components/DebugTree';
import ItemDetailView from './components/ItemDetailView';
import { findItemById } from './utils/itemUtils';

function App() {
  const { data, isLoading, error } = useItems();
  const createItem = useCreateItem();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [debugPanelWidth, setDebugPanelWidth] = useState(320); // Default 320px (w-80)
  const [detailViewItemId, setDetailViewItemId] = useState<string | null>(null);
  const [showDebugTree, setShowDebugTree] = useState(true);

  const handleAddItem = () => {
    if (newItemTitle.trim()) {
      createItem.mutate(
        {
          title: newItemTitle.trim(),
          status: 'todo',
          itemId: null, // Root task
        },
        {
          onSuccess: () => {
            setNewItemTitle('');
          },
        }
      );
    }
  };

  const handleAddSubitem = (itemId: string) => {
    const title = prompt('Título del subitem:');
    if (title && title.trim()) {
      createItem.mutate({
        title: title.trim(),
        status: 'todo',
        itemId: itemId, // Creates subitem in level 0 of this item
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
        <div className="text-red-400">Error al cargar los items</div>
      </div>
    );
  }

  const items = data?.items || [];

  // Find the item for detail view
  const detailViewItem = detailViewItemId ? findItemById(items, detailViewItemId) : null;

  // If in detail view, show only that item
  if (detailViewItem) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex">
        <div className="flex-1 overflow-y-auto">
          <ItemDetailView
            item={detailViewItem}
            onBack={() => setDetailViewItemId(null)}
            onAddSubitem={handleAddSubitem}
          />
        </div>

        {/* Debug Tree Panel */}
        {showDebugTree && (
          <DebugTree
            items={items}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            width={debugPanelWidth}
            onWidthChange={setDebugPanelWidth}
          />
        )}
      </div>
    );
  }

  // Normal view
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">RoadMap SubItem</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDebugTree(!showDebugTree)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                >
                  {showDebugTree ? 'Ocultar Debug' : 'Mostrar Debug'}
                </button>
                <ImportExport />
              </div>
            </div>

            {/* Add Item Input */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                id="new-item-title"
                name="new-item-title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
                placeholder="Nueva tarea..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemTitle.trim() || createItem.isPending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createItem.isPending ? 'Agregando...' : 'Agregar Tarea'}
              </button>
            </div>
          </div>

          {/* Item List */}
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No hay tareas. Agrega una nueva tarea para comenzar.</p>
            </div>
          ) : (
            <ItemList
              items={items}
              onAddSubitem={handleAddSubitem}
              onItemDoubleClick={setDetailViewItemId}
            />
          )}
        </div>
      </div>

      {/* Debug Tree Panel */}
      {showDebugTree && (
        <DebugTree
          items={items}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          width={debugPanelWidth}
          onWidthChange={setDebugPanelWidth}
        />
      )}
    </div>
  );
}

export default App;


