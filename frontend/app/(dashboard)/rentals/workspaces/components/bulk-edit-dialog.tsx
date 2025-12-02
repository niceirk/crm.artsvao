'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Workspace, UpdateWorkspaceDto } from '@/lib/api/workspaces';
import { useUpdateWorkspace } from '@/hooks/use-workspaces';
import { toast } from 'sonner';

interface BulkEditDialogProps {
  workspaces: Workspace[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkEditDialog({
  workspaces,
  open,
  onOpenChange,
  onSuccess,
}: BulkEditDialogProps) {
  const [updateStatus, setUpdateStatus] = useState(false);
  const [updateDailyRate, setUpdateDailyRate] = useState(false);
  const [updateMonthlyRate, setUpdateMonthlyRate] = useState(false);
  const [updateAmenities, setUpdateAmenities] = useState(false);

  const [status, setStatus] = useState<'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'>('AVAILABLE');
  const [dailyRate, setDailyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [amenities, setAmenities] = useState('');

  const [isUpdating, setIsUpdating] = useState(false);
  const updateMutation = useUpdateWorkspace();

  const handleSubmit = async () => {
    if (workspaces.length === 0) return;

    const updates: UpdateWorkspaceDto = {};
    if (updateStatus) updates.status = status;
    if (updateDailyRate && dailyRate) updates.dailyRate = Number(dailyRate);
    if (updateMonthlyRate && monthlyRate) updates.monthlyRate = Number(monthlyRate);
    if (updateAmenities) updates.amenities = amenities;

    if (Object.keys(updates).length === 0) {
      toast.error('Выберите хотя бы одно поле для обновления');
      return;
    }

    setIsUpdating(true);

    try {
      for (const workspace of workspaces) {
        await updateMutation.mutateAsync({ id: workspace.id, data: updates });
      }
      toast.success(`Обновлено ${workspaces.length} рабочих мест`);
      onSuccess();
      resetForm();
    } catch (error) {
      toast.error('Ошибка при обновлении');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetForm = () => {
    setUpdateStatus(false);
    setUpdateDailyRate(false);
    setUpdateMonthlyRate(false);
    setUpdateAmenities(false);
    setStatus('AVAILABLE');
    setDailyRate('');
    setMonthlyRate('');
    setAmenities('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Массовое редактирование</DialogTitle>
          <DialogDescription>
            Выбрано рабочих мест: {workspaces.length}. Отметьте поля, которые хотите изменить.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Статус */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-status"
              checked={updateStatus}
              onCheckedChange={(checked) => setUpdateStatus(!!checked)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-status" className="cursor-pointer">
                Изменить статус
              </Label>
              {updateStatus && (
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Свободно</SelectItem>
                    <SelectItem value="OCCUPIED">Занято</SelectItem>
                    <SelectItem value="MAINTENANCE">На обслуживании</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Дневная ставка */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-daily"
              checked={updateDailyRate}
              onCheckedChange={(checked) => setUpdateDailyRate(!!checked)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-daily" className="cursor-pointer">
                Изменить дневную ставку
              </Label>
              {updateDailyRate && (
                <Input
                  type="number"
                  placeholder="500"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Месячная ставка */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-monthly"
              checked={updateMonthlyRate}
              onCheckedChange={(checked) => setUpdateMonthlyRate(!!checked)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-monthly" className="cursor-pointer">
                Изменить месячную ставку
              </Label>
              {updateMonthlyRate && (
                <Input
                  type="number"
                  placeholder="10000"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Удобства */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-amenities"
              checked={updateAmenities}
              onCheckedChange={(checked) => setUpdateAmenities(!!checked)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-amenities" className="cursor-pointer">
                Изменить удобства
              </Label>
              {updateAmenities && (
                <Input
                  placeholder="Wi-Fi, розетка, монитор..."
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating ? 'Обновление...' : 'Применить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
