// Domain Service - Validation logic
import { ItemTreeService, ItemTreeLike } from './ItemTreeService';

export class ItemValidationService {
  /**
   * Validate if moving an item to another is allowed
   */
  static canMoveItem<T extends ItemTreeLike>(
    items: T[],
    activeItemId: string,
    targetItemId: string
  ): { valid: boolean; reason?: string } {
    if (activeItemId === targetItemId) {
      return { valid: false, reason: 'Cannot move item to itself' };
    }

    const targetItem = ItemTreeService.findById(items, targetItemId);
    if (!targetItem) {
      return { valid: false, reason: 'Target item not found' };
    }

    // Check if target is a descendant (would create a cycle)
    if (ItemTreeService.isDescendant(targetItem, activeItemId)) {
      return { valid: false, reason: 'Cannot move item into its own descendant' };
    }

    return { valid: true };
  }

  /**
   * Validate if reordering is allowed
   */
  static canReorder<T extends ItemTreeLike>(
    items: T[],
    activeItemId: string,
    targetItemId: string
  ): { valid: boolean; reason?: string } {
    if (!ItemTreeService.areSameLevel(items, activeItemId, targetItemId)) {
      return { valid: false, reason: 'Items must be at the same level to reorder' };
    }

    return { valid: true };
  }
}

