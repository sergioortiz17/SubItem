import { ItemResponse } from '../types/item';
import ItemList from './ItemList';

interface ItemDetailViewProps {
  item: ItemResponse;
  onBack: () => void;
  onAddSubitem: (parentId: string) => void;
  reorderMode?: boolean;
  setReorderMode?: (value: boolean) => void;
}

export default function ItemDetailView({ item, onBack, onAddSubitem, reorderMode = false, setReorderMode }: ItemDetailViewProps) {
  // Create a single-item array for ItemList component
  const singleItemArray: ItemResponse[] = [item];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with back button */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l-9-9 9-9" />
              <path d="M3 10h16" />
            </svg>
            <span className="font-medium">Volver</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{item.title}</h1>
              {item.description && (
                <p className="text-slate-400">{item.description}</p>
              )}
            </div>
            {setReorderMode && (
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
            )}
          </div>
        </div>

        {/* Item and its subitems */}
        <ItemList items={singleItemArray} onAddSubitem={onAddSubitem} reorderMode={reorderMode} />
      </div>
    </div>
  );
}

