export interface Item {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  levelId: string | null;
  levelNum?: number | null;
  order: number;
  subitems?: Item[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemResponse {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  levelId: string | null;
  levelNum?: number | null;
  order: number;
  subitems?: ItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDto {
  title: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  itemId?: string | null;  // If provided, creates subitem in level 0 of this item
  levelId?: string | null; // If provided, creates subitem in this specific level
  order?: number;
}

export interface UpdateItemDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  itemId?: string | null;  // Move to level 0 of this item
  levelId?: string | null; // Move to this specific level
  order?: number;
}

