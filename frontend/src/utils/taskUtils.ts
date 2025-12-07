import { TaskResponse } from '../types/task';

export const countSubitems = (task: TaskResponse): { direct: number; total: number } => {
  const direct = task.subitems?.length || 0;
  let total = direct;
  
  if (task.subitems) {
    task.subitems.forEach(subitem => {
      const { total: nestedTotal } = countSubitems(subitem);
      total += nestedTotal;
    });
  }
  
  return { direct, total };
};

export const calculateProgress = (task: TaskResponse): { completed: number; total: number; percentage: number } => {
  let completed = task.status === 'done' ? 1 : 0;
  let total = 1;
  
  if (task.subitems) {
    task.subitems.forEach(subitem => {
      const { completed: subCompleted, total: subTotal } = calculateProgress(subitem);
      completed += subCompleted;
      total += subTotal;
    });
  }
  
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return { completed, total, percentage };
};

export const flattenTasks = (tasks: TaskResponse[]): TaskResponse[] => {
  const result: TaskResponse[] = [];
  
  const flatten = (taskList: TaskResponse[]) => {
    taskList.forEach(task => {
      result.push(task);
      if (task.subitems && task.subitems.length > 0) {
        flatten(task.subitems);
      }
    });
  };
  
  flatten(tasks);
  return result;
};


