import axios from 'axios';
import { ItemResponse, CreateItemDto, UpdateItemDto, Item } from '../types/item';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const itemService = {
  getAll: async (): Promise<{ items: ItemResponse[] }> => {
    const response = await api.get('/items');
    return response.data;
  },

  create: async (data: CreateItemDto): Promise<ItemResponse> => {
    const response = await api.post('/items', data);
    return response.data;
  },

  update: async (id: string, data: UpdateItemDto): Promise<ItemResponse> => {
    const response = await api.put(`/items/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/items/${id}`);
  },

  import: async (data: { items: Item[] }): Promise<void> => {
    await api.post('/import', data);
  },

  export: async (): Promise<{ items: Item[] }> => {
    const response = await api.get('/export');
    return response.data;
  },
};


