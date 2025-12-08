/**
 * Generates hierarchical numbering like 1, 1.1, 1.2, 1.1.1, etc.
 * Similar to Linux file system numbering
 */
export function generateNumbering(path: number[]): string {
  if (path.length === 0) {
    return '';
  }
  return path.join('.');
}

/**
 * Builds a numbering path for an item based on its position in the tree
 */
export function buildNumberingPath(
  items: any[],
  targetId: string,
  currentPath: number[] = []
): number[] | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const newPath = [...currentPath, i + 1];
    
    if (item.id === targetId) {
      return newPath;
    }
    
    if (item.subitems && item.subitems.length > 0) {
      const found = buildNumberingPath(item.subitems, targetId, newPath);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

