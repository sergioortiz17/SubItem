import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemService } from '../services/api';
import { UpdateItemDto } from '../types/item';

export const useItems = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: itemService.getAll,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch on component mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemService.create,
    onSuccess: async () => {
      // Invalidate and refetch immediately - wait for refetch to complete
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      // Force a complete refetch to ensure fresh data
      await queryClient.refetchQueries({ 
        queryKey: ['items'],
        type: 'active'
      });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemDto }) =>
      itemService.update(id, data),
    onSuccess: async () => {
      // Invalidate and refetch immediately
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      await queryClient.refetchQueries({ 
        queryKey: ['items'],
        type: 'active'
      });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemService.delete,
    onSuccess: () => {
      // Invalidate and refetch immediately
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.refetchQueries({ queryKey: ['items'] });
    },
  });
};

export const useImportItems = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemService.import,
    onSuccess: () => {
      // Invalidate and refetch immediately
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.refetchQueries({ queryKey: ['items'] });
    },
  });
};

export const useExportItems = () => {
  return useQuery({
    queryKey: ['export'],
    queryFn: itemService.export,
    enabled: false,
  });
};

