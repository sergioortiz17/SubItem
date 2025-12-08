// Application Use Case - Reorder Item
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemTreeService } from '../../domain/services/ItemTreeService';
import { ItemValidationService } from '../../domain/services/ItemValidationService';

export class ReorderItemUseCase {
  constructor(private itemRepository: IItemRepository) {}

  async execute(
    activeItemId: string,
    targetItemId: string,
    position: 'before' | 'after'
  ): Promise<void> {
    // Get current items
    const { items } = await this.itemRepository.getAll();

    // Validate reorder
    const validation = ItemValidationService.canReorder(items, activeItemId, targetItemId);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid reorder operation');
    }

    // Find target item
    const targetItem = ItemTreeService.findById(items, targetItemId);
    if (!targetItem) {
      throw new Error('Target item not found');
    }

    // Calculate new order
    const newOrder = position === 'before' ? targetItem.order : targetItem.order + 1;

    // Update item order
    await this.itemRepository.update(activeItemId, {
      order: newOrder,
    });
  }
}

