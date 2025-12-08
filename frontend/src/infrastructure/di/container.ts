// Dependency Injection Container
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { createItemHooks } from '../../presentation/hooks/useItemsRefactored';
import { MoveItemUseCase } from '../../application/useCases/MoveItemUseCase';
import { ReorderItemUseCase } from '../../application/useCases/ReorderItemUseCase';

// Create repository instance
const itemRepository: IItemRepository = new ItemRepository();

// Create use cases
export const moveItemUseCase = new MoveItemUseCase(itemRepository);
export const reorderItemUseCase = new ReorderItemUseCase(itemRepository);

// Create hooks with dependency injection
export const {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useImportItems,
  useExportItems,
} = createItemHooks(itemRepository);

// Export repository for direct use if needed
export { itemRepository };

