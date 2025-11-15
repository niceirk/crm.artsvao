import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi, Room, CreateRoomDto, UpdateRoomDto } from '@/lib/api/rooms';
import { useToast } from '@/hooks/use-toast';

export const useRooms = () => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getRooms,
  });
};

export const useRoom = (id: string) => {
  return useQuery({
    queryKey: ['rooms', id],
    queryFn: () => roomsApi.getRoom(id),
    enabled: !!id,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateRoomDto) => roomsApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({
        title: 'Успешно',
        description: 'Помещение создано',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка создания помещения',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomDto }) =>
      roomsApi.updateRoom(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', variables.id] });
      toast({
        title: 'Успешно',
        description: 'Помещение обновлено',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка обновления помещения',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => roomsApi.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({
        title: 'Успешно',
        description: 'Помещение удалено',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Ошибка удаления помещения',
        variant: 'destructive',
      });
    },
  });
};
