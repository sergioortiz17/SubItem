import axios from 'axios';
import { TaskResponse, CreateTaskDto, UpdateTaskDto } from '../types/task';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const taskService = {
  getAll: async (): Promise<{ tasks: TaskResponse[] }> => {
    const response = await api.get('/tasks');
    return response.data;
  },

  create: async (data: CreateTaskDto): Promise<TaskResponse> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTaskDto): Promise<TaskResponse> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  import: async (data: { tasks: TaskResponse[] }): Promise<void> => {
    await api.post('/import', data);
  },

  export: async (): Promise<{ tasks: TaskResponse[] }> => {
    const response = await api.get('/export');
    return response.data;
  },
};


