// Domain Service - Business logic for item tree operations

// Generic type for tree-like structures
export type ItemTreeLike = {
  id: string;
  subitems?: ItemTreeLike[];
  [key: string]: any;
};

export class ItemTreeService {
  /**
   * Find an item by ID in a tree structure
   */
  static findById<T extends ItemTreeLike>(items: T[], id: string): T | null {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.subitems && item.subitems.length > 0) {
        const found = this.findById(item.subitems as T[], id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Find parent item ID for a given item
   */
  static findParentId<T extends ItemTreeLike>(items: T[], itemId: string): string | null {
    const findParent = (itemList: T[], parentId: string | null = null): string | null => {
      for (const item of itemList) {
        if (item.id === itemId) {
          return parentId;
        }
        if (item.subitems && item.subitems.length > 0) {
          const found = findParent(item.subitems as T[], item.id);
          if (found !== null) {
            return found;
          }
        }
      }
      return null;
    };
    return findParent(items);
  }

  /**
   * Check if an item is a descendant of another item
   */
  static isDescendant<T extends ItemTreeLike>(potentialAncestor: T, itemId: string): boolean {
    if (potentialAncestor.id === itemId) {
      return true;
    }
    if (potentialAncestor.subitems) {
      for (const subitem of potentialAncestor.subitems as T[]) {
        if (this.isDescendant(subitem, itemId)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Flatten a tree structure to a flat array
   */
  static flatten<T extends ItemTreeLike>(items: T[]): T[] {
    const result: T[] = [];
    const flatten = (itemList: T[]) => {
      itemList.forEach(item => {
        result.push(item);
        if (item.subitems && item.subitems.length > 0) {
          flatten(item.subitems as T[]);
        }
      });
    };
    flatten(items);
    return result;
  }

  /**
   * Check if two items are at the same level
   */
  static areSameLevel<T extends ItemTreeLike>(items: T[], itemId1: string, itemId2: string): boolean {
    const parent1 = this.findParentId(items, itemId1);
    const parent2 = this.findParentId(items, itemId2);
    return parent1 === parent2;
  }
}

