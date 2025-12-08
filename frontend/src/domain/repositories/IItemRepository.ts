// Repository Interface - Dependency Inversion Principle
import { ItemEntity, ItemTree } from '../entities/Item';
import { CreateItemDto, UpdateItemDto } from '../../types/item';

export interface IItemRepository {
  getAll(): Promise<{ items: ItemTree[] }>;
  create(data: CreateItemDto): Promise<ItemEntity>;
  update(id: string, data: UpdateItemDto): Promise<ItemEntity>;
  delete(id: string): Promise<void>;
  import(data: { items: ItemEntity[] }): Promise<void>;
  export(): Promise<{ items: ItemEntity[] }>;
}

