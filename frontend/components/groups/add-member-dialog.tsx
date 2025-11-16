'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { groupsApi, type AddMemberDto } from '@/lib/api/groups';
import { getClients } from '@/lib/api/clients';
import { toast } from '@/lib/utils/toast';
import { Loader2 } from 'lucide-react';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSuccess: () => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  groupId,
  onSuccess,
}: AddMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<Partial<AddMemberDto>>({
    clientId: '',
    subscriptionTypeId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    validMonth: '',
    originalPrice: 0,
    paidPrice: 0,
    remainingVisits: undefined,
    purchasedMonths: 1,
  });

  // Загрузка данных при открытии диалога
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, groupId]);

  // Автозаполнение validMonth при изменении startDate
  useEffect(() => {
    if (formData.startDate) {
      const date = new Date(formData.startDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      setFormData((prev) => ({ ...prev, validMonth: `${year}-${month}` }));

      // Автозаполнение endDate (конец месяца)
      const endDate = new Date(year, date.getMonth() + (formData.purchasedMonths || 1), 0);
      setFormData((prev) => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0],
      }));
    }
  }, [formData.startDate, formData.purchasedMonths]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [clientsData, typesData] = await Promise.all([
        getClients(),
        groupsApi.getGroupSubscriptionTypes(groupId),
      ]);
      setClients(clientsData.items || []);
      setSubscriptionTypes(typesData);

      // Автоустановка первого типа абонемента и его цены
      if (typesData.length > 0) {
        setFormData((prev) => ({
          ...prev,
          subscriptionTypeId: typesData[0].id,
          originalPrice: Number(typesData[0].price),
          paidPrice: Number(typesData[0].price),
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.subscriptionTypeId) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      setLoading(true);
      await groupsApi.addGroupMember(groupId, formData as AddMemberDto);
      toast.success('Участник успешно добавлен');
      onSuccess();
      onOpenChange(false);

      // Сброс формы
      setFormData({
        clientId: '',
        subscriptionTypeId: subscriptionTypes[0]?.id || '',
        purchaseDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        validMonth: '',
        originalPrice: subscriptionTypes[0] ? Number(subscriptionTypes[0].price) : 0,
        paidPrice: subscriptionTypes[0] ? Number(subscriptionTypes[0].price) : 0,
        remainingVisits: undefined,
        purchasedMonths: 1,
      });
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error('Не удалось добавить участника');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionTypeChange = (typeId: string) => {
    const type = subscriptionTypes.find((t) => t.id === typeId);
    if (type) {
      setFormData((prev) => ({
        ...prev,
        subscriptionTypeId: typeId,
        originalPrice: Number(type.price),
        paidPrice: Number(type.price),
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить участника в группу</DialogTitle>
          <DialogDescription>
            Создание абонемента для клиента
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Клиент */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientId">Клиент *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, clientId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите клиента" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.lastName} {client.firstName} {client.middleName} ({client.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Тип абонемента */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subscriptionTypeId">Тип абонемента *</Label>
                <Select
                  value={formData.subscriptionTypeId}
                  onValueChange={handleSubscriptionTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип абонемента" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} - {Number(type.price)} ₽ ({type.type === 'UNLIMITED' ? 'Безлимит' : 'По занятиям'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Дата покупки */}
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Дата покупки *</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Дата начала */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Дата начала *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Количество месяцев */}
              <div className="space-y-2">
                <Label htmlFor="purchasedMonths">Месяцев</Label>
                <Input
                  id="purchasedMonths"
                  type="number"
                  min="1"
                  value={formData.purchasedMonths}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, purchasedMonths: parseInt(e.target.value, 10) }))
                  }
                />
              </div>

              {/* Дата окончания (автозаполняется) */}
              <div className="space-y-2">
                <Label htmlFor="endDate">Дата окончания *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Месяц действия (автозаполняется) */}
              <div className="space-y-2">
                <Label htmlFor="validMonth">Месяц действия *</Label>
                <Input
                  id="validMonth"
                  type="text"
                  value={formData.validMonth}
                  placeholder="YYYY-MM"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, validMonth: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Осталось посещений */}
              <div className="space-y-2">
                <Label htmlFor="remainingVisits">Осталось посещений</Label>
                <Input
                  id="remainingVisits"
                  type="number"
                  min="0"
                  value={formData.remainingVisits || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      remainingVisits: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    }))
                  }
                  placeholder="Для разовых абонементов"
                />
              </div>

              {/* Оригинальная цена */}
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Оригинальная цена *</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      originalPrice: parseFloat(e.target.value),
                    }))
                  }
                  required
                />
              </div>

              {/* Оплаченная цена */}
              <div className="space-y-2">
                <Label htmlFor="paidPrice">Оплаченная цена *</Label>
                <Input
                  id="paidPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.paidPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      paidPrice: parseFloat(e.target.value),
                    }))
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Добавить
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
