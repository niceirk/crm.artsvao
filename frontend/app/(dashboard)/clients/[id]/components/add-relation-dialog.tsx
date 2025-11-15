'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useCreateClientRelation, useSearchClients } from '@/hooks/useClients';
import type { RelationType } from '@/lib/types/clients';

interface AddRelationDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const relationTypeLabels: Record<RelationType, string> = {
  PARENT: 'Родитель',
  CHILD: 'Ребенок',
  SPOUSE: 'Супруг(а)',
  SIBLING: 'Брат/Сестра',
};

const formSchema = z.object({
  relatedClientId: z.string().min(1, 'Выберите клиента'),
  relationType: z.enum(['PARENT', 'CHILD', 'SPOUSE', 'SIBLING'], {
    required_error: 'Выберите тип связи',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function AddRelationDialog({ clientId, open, onOpenChange }: AddRelationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults = [] } = useSearchClients(searchQuery);
  const createRelation = useCreateClientRelation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      relatedClientId: '',
      relationType: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    await createRelation.mutateAsync({
      clientId,
      data: {
        relatedClientId: data.relatedClientId,
        relationType: data.relationType,
      },
    });
    form.reset();
    onOpenChange(false);
  };

  const handleCancel = () => {
    form.reset();
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить родственную связь</DialogTitle>
          <DialogDescription>
            Укажите связанного клиента и тип родственной связи
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="relatedClientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Клиент</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="Поиск клиента..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery.length >= 2 && (
                        <div className="border rounded-md max-h-[200px] overflow-y-auto">
                          {searchResults.length > 0 ? (
                            searchResults
                              .filter((client) => client.id !== clientId)
                              .map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                                    field.value === client.id ? 'bg-accent' : ''
                                  }`}
                                  onClick={() => {
                                    field.onChange(client.id);
                                    setSearchQuery(
                                      `${client.lastName} ${client.firstName} ${client.middleName || ''}`
                                    );
                                  }}
                                >
                                  <div className="text-sm font-medium">
                                    {client.lastName} {client.firstName} {client.middleName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.phone} {client.email && `• ${client.email}`}
                                  </div>
                                </button>
                              ))
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              Клиенты не найдены
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип связи</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип связи" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(relationTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={createRelation.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createRelation.isPending}>
                {createRelation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать связь
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
