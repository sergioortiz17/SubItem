// Presentation Hook - React Query integration with repository pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { UpdateItemDto } from '../../types/item';

// Dependency Injection - Repository is injected
export function createItemHooks(repository: IItemRepository) {
  const useItems = () => {
    return useQuery({
      queryKey: ['items'],
      queryFn: () => repository.getAll(),
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    });
  };

  const useCreateItem = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: repository.create,
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['items'] });
        await queryClient.refetchQueries({ 
          queryKey: ['items'],
          type: 'active'
        });
      },
    });
  };

  const useUpdateItem = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateItemDto }) =>
        repository.update(id, data),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['items'] });
        await queryClient.refetchQueries({ 
          queryKey: ['items'],
          type: 'active'
        });
      },
    });
  };

  const useDeleteItem = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: repository.delete,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['items'] });
        queryClient.refetchQueries({ queryKey: ['items'] });
      },
    });
  };

  const useImportItems = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: repository.import,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['items'] });
        queryClient.refetchQueries({ queryKey: ['items'] });
      },
    });
  };

  const useExportItems = () => {
    return useQuery({
      queryKey: ['export'],
      queryFn: repository.export,
      enabled: false,
    });
  };

  return {
    useItems,
    useCreateItem,
    useUpdateItem,
    useDeleteItem,
    useImportItems,
    useExportItems,
  };
}

