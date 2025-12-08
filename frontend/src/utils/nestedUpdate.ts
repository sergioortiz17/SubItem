import { ItemResponse } from '../types/item';

/**
 * Deep clone an item with all its nested subitems
 */
export function deepCloneItem(item: ItemResponse): ItemResponse {
  return {
    ...item,
    subitems: item.subitems?.map(subitem => deepCloneItem(subitem)) || [],
  };
}

/**
 * Find an item by ID in a nested structure and return its path
 */
export function findItemPath(
  items: ItemResponse[],
  targetId: string,
  path: ItemResponse[] = []
): ItemResponse[] | null {
  for (const item of items) {
    const newPath = [...path, item];
    if (item.id === targetId) {
      return newPath;
    }
    if (item.subitems && item.subitems.length > 0) {
      const found = findItemPath(item.subitems, targetId, newPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Remove an item from its current parent
 */
export function removeItemFromParent(
  items: ItemResponse[],
  itemId: string
): ItemResponse[] {
  return items
    .filter(item => item.id !== itemId)
    .map(item => ({
      ...item,
      subitems: item.subitems ? removeItemFromParent(item.subitems, itemId) : [],
    }));
}

/**
 * Add an item to a parent (by parentId)
 */
export function addItemToParent(
  items: ItemResponse[],
  item: ItemResponse,
  parentId: string | null
): ItemResponse[] {
  if (parentId === null) {
    // Add to root level
    return [...items, item];
  }

  return items.map(i => {
    if (i.id === parentId) {
      return {
        ...i,
        subitems: [...(i.subitems || []), item],
      };
    }
    if (i.subitems && i.subitems.length > 0) {
      return {
        ...i,
        subitems: addItemToParent(i.subitems, item, parentId),
      };
    }
    return i;
  });
}

/**
 * Move an item from one parent to another, preserving all its subitems
 */
export function moveItem(
  items: ItemResponse[],
  itemId: string,
  newParentId: string | null
): ItemResponse[] {
  // Find the item to move
  const itemPath = findItemPath(items, itemId);
  if (!itemPath || itemPath.length === 0) {
    return items;
  }

  const itemToMove = deepCloneItem(itemPath[itemPath.length - 1]);

  // Prevent moving an item into itself or its descendants
  if (newParentId !== null) {
    const newParentPath = findItemPath(items, newParentId);
    if (newParentPath) {
      const newParentIds = newParentPath.map(i => i.id);
      if (newParentIds.includes(itemId)) {
        return items; // Can't move into itself
      }
    }
  }

  // Remove from current location
  let updatedItems = removeItemFromParent(items, itemId);

  // Add to new location
  updatedItems = addItemToParent(updatedItems, itemToMove, newParentId);

  return updatedItems;
}

/**
 * Update an item in the nested structure
 */
export function updateItemInTree(
  items: ItemResponse[],
  itemId: string,
  updates: Partial<ItemResponse>
): ItemResponse[] {
  return items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        ...updates,
        subitems: item.subitems || [],
      };
    }
    if (item.subitems && item.subitems.length > 0) {
      return {
        ...item,
        subitems: updateItemInTree(item.subitems, itemId, updates),
      };
    }
    return item;
  });
}
