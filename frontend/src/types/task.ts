export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  parentId: string | null;
  order: number;
  subitems?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  parentId: string | null;
  order: number;
  subitems?: TaskResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  parentId?: string | null;
  order?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  parentId?: string | null;
  order?: number;
}


