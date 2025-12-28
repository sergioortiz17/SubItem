// Domain Entity - Pure business logic
export interface ItemEntity {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  levelId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemTree extends ItemEntity {
  subitems?: ItemTree[];
  levelNum?: number | null;
}

// Domain constants
export const MAX_DEPTH = 7;
export const DRAG_ACTIVATION_DISTANCE = 8;

