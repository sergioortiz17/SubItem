import { useState, useEffect, useRef } from 'react';
import { useItems, useCreateItem } from './infrastructure/di/container';
import ItemList from './components/ItemList';
import ImportExport from './components/ImportExport';
import DebugTree from './components/DebugTree';
import ItemDetailView from './components/ItemDetailView';
import { ItemTreeService } from './domain/services/ItemTreeService';
import { ItemResponse } from './types/item';

const ROADMAP_NAME_KEY = 'roadmap-name';

function App() {
  const { data, isLoading, error } = useItems();
  const createItem = useCreateItem();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [debugPanelWidth, setDebugPanelWidth] = useState(320); // Default 320px (w-80)
  const [detailViewItemId, setDetailViewItemId] = useState<string | null>(null);
  const [showDebugTree, setShowDebugTree] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [roadmapName, setRoadmapName] = useState(() => {
    // Initialize from localStorage or use default
    const saved = localStorage.getItem(ROADMAP_NAME_KEY);
    return saved || 'RoadMap SubItem';
  });
  const [isEditingRoadmapName, setIsEditingRoadmapName] = useState(false);
  const [editingRoadmapName, setEditingRoadmapName] = useState(roadmapName);
  const roadmapNameInputRef = useRef<HTMLInputElement>(null);

  // Load roadmap name from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(ROADMAP_NAME_KEY);
    if (saved) {
      setRoadmapName(saved);
      setEditingRoadmapName(saved);
    }
  }, []);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingRoadmapName && roadmapNameInputRef.current) {
      roadmapNameInputRef.current.focus();
      roadmapNameInputRef.current.select();
    }
  }, [isEditingRoadmapName]);

  const handleSaveRoadmapName = () => {
    const trimmed = editingRoadmapName.trim();
    if (trimmed) {
      setRoadmapName(trimmed);
      localStorage.setItem(ROADMAP_NAME_KEY, trimmed);
    } else {
      setEditingRoadmapName(roadmapName); // Reset if empty
    }
    setIsEditingRoadmapName(false);
  };

  const handleCancelEditRoadmapName = () => {
    setEditingRoadmapName(roadmapName);
    setIsEditingRoadmapName(false);
  };

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
  const detailViewItem = detailViewItemId 
    ? ItemTreeService.findById<ItemResponse>(items as ItemResponse[], detailViewItemId) 
    : null;

  // If in detail view, show only that item
  if (detailViewItem) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex">
        <div className="flex-1 overflow-y-auto">
          <ItemDetailView
            item={detailViewItem}
            onBack={() => setDetailViewItemId(null)}
            onAddSubitem={handleAddSubitem}
            reorderMode={reorderMode}
            setReorderMode={setReorderMode}
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
            onClose={() => setShowDebugTree(false)}
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
              <div className="flex items-center gap-2 group">
                {isEditingRoadmapName ? (
                  <input
                    ref={roadmapNameInputRef}
                    type="text"
                    value={editingRoadmapName}
                    onChange={(e) => setEditingRoadmapName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveRoadmapName();
                      } else if (e.key === 'Escape') {
                        handleCancelEditRoadmapName();
                      }
                    }}
                    onBlur={handleSaveRoadmapName}
                    className="text-3xl font-bold text-white bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-400"
                    style={{ minWidth: '200px' }}
                  />
                ) : (
                  <>
                    <h1
                      className="text-3xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
                      onDoubleClick={() => setIsEditingRoadmapName(true)}
                      title="Doble click para editar"
                    >
                      {roadmapName}
                    </h1>
                    <button
                      onClick={() => setIsEditingRoadmapName(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-400"
                      title="Editar nombre"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    reorderMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {reorderMode ? '✓ Re-order' : 'Re-order'}
                </button>
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
              reorderMode={reorderMode}
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
          onClose={() => setShowDebugTree(false)}
        />
      )}
    </div>
  );
}

export default App;


