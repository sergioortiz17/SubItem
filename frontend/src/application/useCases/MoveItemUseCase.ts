// Application Use Case - Move Item
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemTreeService } from '../../domain/services/ItemTreeService';
import { ItemValidationService } from '../../domain/services/ItemValidationService';

export class MoveItemUseCase {
  constructor(private itemRepository: IItemRepository) {}

  async execute(activeItemId: string, targetItemId: string): Promise<void> {
    // Get current items
    const { items } = await this.itemRepository.getAll();

    // Validate move
    const validation = ItemValidationService.canMoveItem(items, activeItemId, targetItemId);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid move operation');
    }

    // Find target item
    const targetItem = ItemTreeService.findById(items, targetItemId);
    if (!targetItem) {
      throw new Error('Target item not found');
    }

    // Update item to move it
    await this.itemRepository.update(activeItemId, {
      itemId: targetItemId,
    });
  }
}

