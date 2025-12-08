// Infrastructure - Concrete implementation of IItemRepository
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemEntity, ItemTree } from '../../domain/entities/Item';
import { CreateItemDto, UpdateItemDto, Item } from '../../types/item';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ItemRepository implements IItemRepository {
  async getAll(): Promise<{ items: ItemTree[] }> {
    const response = await api.get('/items');
    return response.data;
  }

  async create(data: CreateItemDto): Promise<ItemEntity> {
    const response = await api.post('/items', data);
    return response.data;
  }

  async update(id: string, data: UpdateItemDto): Promise<ItemEntity> {
    const response = await api.put(`/items/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  }

  async import(data: { items: Item[] }): Promise<void> {
    await api.post('/import', data);
  }

  async export(): Promise<{ items: Item[] }> {
    const response = await api.get('/export');
    return response.data;
  }
}

