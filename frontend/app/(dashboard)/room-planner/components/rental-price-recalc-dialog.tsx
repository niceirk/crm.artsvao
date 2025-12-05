'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { calculateRentalPrice } from '@/hooks/use-activity-move';
import type { Room } from '@/lib/api/rooms';
import type { Rental } from '@/lib/api/rentals';

interface RentalPriceRecalcDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
  oldRoom: Room | null;
  newRoom: Room | null;
  newStartTime: string;
  newEndTime: string;
  onConfirm: (newPrice: number) => void;
  onCancel: () => void;
}

export function RentalPriceRecalcDialog({
  open,
  onOpenChange,
  rental,
  oldRoom,
  newRoom,
  newStartTime,
  newEndTime,
  onConfirm,
  onCancel,
}: RentalPriceRecalcDialogProps) {
  if (!rental || !newRoom) {
    return null;
  }

  const oldPrice = Number(rental.totalPrice) || 0;
  const newHourlyRate = Number(newRoom.hourlyRate) || 0;
  const newPrice = calculateRentalPrice(newHourlyRate, newStartTime, newEndTime);

  const handleConfirm = () => {
    onConfirm(newPrice);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  // Рассчитываем длительность
  const [startH, startM] = newStartTime.split(':').map(Number);
  const [endH, endM] = newEndTime.split(':').map(Number);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const hours = Math.ceil(durationMinutes / 60);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Изменение помещения</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                При смене помещения стоимость аренды будет пересчитана:
              </p>

              <div className="grid gap-3 p-4 rounded-lg bg-muted">
                {oldRoom && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Старое помещение:</span>
                    <span className="font-medium">{oldRoom.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Новое помещение:</span>
                  <span className="font-medium">{newRoom.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Время:</span>
                  <span className="font-medium">{newStartTime} - {newEndTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Тариф:</span>
                  <span className="font-medium">{newHourlyRate.toLocaleString('ru-RU')} руб/час</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Длительность:</span>
                  <span className="font-medium">{hours} ч</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground line-through">
                      {oldPrice.toLocaleString('ru-RU')} руб.
                    </span>
                    <span className="text-lg font-semibold text-primary">
                      {newPrice.toLocaleString('ru-RU')} руб.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Подтвердить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
