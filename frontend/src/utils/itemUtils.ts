import { ItemResponse } from '../types/item';

export const countSubitems = (item: ItemResponse): { direct: number; total: number } => {
  const direct = item.subitems?.length || 0;
  let total = direct;
  
  if (item.subitems) {
    item.subitems.forEach(subitem => {
      const { total: nestedTotal } = countSubitems(subitem);
      total += nestedTotal;
    });
  }
  
  return { direct, total };
};

export const calculateProgress = (item: ItemResponse): { completed: number; total: number; percentage: number } => {
  let completed = item.status === 'done' ? 1 : 0;
  let total = 1;
  
  if (item.subitems) {
    item.subitems.forEach(subitem => {
      const { completed: subCompleted, total: subTotal } = calculateProgress(subitem);
      completed += subCompleted;
      total += subTotal;
    });
  }
  
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return { completed, total, percentage };
};

export const flattenItems = (items: ItemResponse[]): ItemResponse[] => {
  const result: ItemResponse[] = [];
  
  const flatten = (itemList: ItemResponse[]) => {
    itemList.forEach(item => {
      result.push(item);
      if (item.subitems && item.subitems.length > 0) {
        flatten(item.subitems);
      }
    });
  };
  
  flatten(items);
  return result;
};

export const findItemById = (items: ItemResponse[], id: string): ItemResponse | null => {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.subitems) {
      const found = findItemById(item.subitems, id);
      if (found) return found;
    }
  }
  return null;
};

