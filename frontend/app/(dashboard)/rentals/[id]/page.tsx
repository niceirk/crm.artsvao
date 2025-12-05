'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, addMonths, addDays, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowLeft, AlertTriangle, Loader2, Building2, Clock, Briefcase, DoorOpen, Save, X, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ClientSearch } from '@/components/clients/client-search';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useRooms } from '@/hooks/use-rooms';
import { useWorkspaces } from '@/hooks/use-workspaces';
import {
  useRentalApplication,
  useUpdateRentalApplication,
  useCheckAvailability,
  useCalculatePrice,
  useRemoveRental,
} from '@/hooks/use-rental-applications';
import { WorkspaceAvailabilityGrid } from '../new/components/workspace-availability-grid';
import { HourlyTimeSlotGrid } from '../new/components/hourly-time-slot-grid';
import { MonthlyWorkspaceAvailabilityGrid } from '../new/components/monthly-workspace-availability-grid';
import { RoomDailyAvailabilityGrid } from '../new/components/room-daily-availability-grid';
import { toast } from 'sonner';
import type { Client } from '@/lib/types/clients';
import type {
  RentalType,
  RentalPeriodType,
  PriceUnit,
  ConflictInfo,
  HourlyTimeSlot,
  RentalApplication,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_COLORS,
} from '@/lib/types/rental-applications';

type RentalCategory = 'hourly' | 'workspace' | 'room';

interface FormData {
  category: RentalCategory | null;
  periodUnit: 'day' | 'month' | null;
  roomId: string | null;
  workspaceIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  selectedDays: Date[];
  selectedHourlySlots: HourlyTimeSlot[];
  monthType: 'calendar' | 'sliding';
  basePrice: number;
  adjustedPrice: number | null;
  adjustmentReason: string;
  paymentType: 'PREPAYMENT' | 'POSTPAYMENT';
  clientId: string | null;
  notes: string;
  eventType: string;
}

const initialFormData: FormData = {
  category: null,
  periodUnit: null,
  roomId: null,
  workspaceIds: [],
  startDate: null,
  endDate: null,
  startTime: '09:00',
  endTime: '18:00',
  selectedDays: [],
  selectedHourlySlots: [],
  monthType: 'calendar',
  basePrice: 0,
  adjustedPrice: null,
  adjustmentReason: '',
  paymentType: 'PREPAYMENT',
  clientId: null,
  notes: '',
  eventType: '',
};

// Статусы заявок
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждена',
  ACTIVE: 'Активна',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// Функция маппинга данных заявки в FormData
function mapApplicationToFormData(app: RentalApplication): FormData {
  console.log('=== mapApplicationToFormData ===');
  console.log('app:', app);

  // Определить category
  let category: RentalCategory | null = null;
  if (app.rentalType === 'HOURLY') category = 'hourly';
  else if (app.rentalType.startsWith('WORKSPACE')) category = 'workspace';
  else category = 'room';

  // Определить periodUnit
  let periodUnit: 'day' | 'month' | null = null;
  if (app.rentalType.includes('DAILY')) periodUnit = 'day';
  else if (app.rentalType.includes('MONTHLY')) periodUnit = 'month';

  // Определить monthType
  const monthType = app.periodType === 'SLIDING_MONTH' ? 'sliding' : 'calendar';

  // Преобразовать даты
  const startDate = new Date(app.startDate);
  const endDate = app.endDate ? new Date(app.endDate) : null;

  // Выбранные дни - для daily аренды берём из selectedDays, для hourly берём startDate
  let selectedDays: Date[] = [];
  if (app.selectedDays && app.selectedDays.length > 0) {
    selectedDays = app.selectedDays.map(d => new Date(d.date));
  } else if (category === 'hourly') {
    // Для hourly - добавляем дату начала
    selectedDays = [startDate];
  }

  // Workspace IDs
  const workspaceIds = app.workspaces?.map(w => w.workspaceId) || [];

  console.log('category:', category);
  console.log('periodUnit:', periodUnit);
  console.log('startDate:', startDate);
  console.log('endDate:', endDate);
  console.log('selectedDays:', selectedDays);
  console.log('workspaceIds:', workspaceIds);

  // Время (для hourly) - извлекаем из ISO строки
  let startTime = '09:00';
  let endTime = '18:00';

  if (app.startTime) {
    // Формат может быть ISO или просто время
    if (app.startTime.includes('T')) {
      startTime = app.startTime.slice(11, 16);
    } else if (app.startTime.length >= 5) {
      startTime = app.startTime.slice(0, 5);
    }
  }

  if (app.endTime) {
    if (app.endTime.includes('T')) {
      endTime = app.endTime.slice(11, 16);
    } else if (app.endTime.length >= 5) {
      endTime = app.endTime.slice(0, 5);
    }
  }

  // Для HOURLY - восстановить слоты из rentals или создать из startTime/endTime
  let selectedHourlySlots: HourlyTimeSlot[] = [];
  if (category === 'hourly') {
    // Если есть rentals - восстановить слоты из них
    if (app.rentals && app.rentals.length > 0) {
      app.rentals.forEach((rental: any) => {
        const rentalDate = new Date(rental.date);

        // Извлечь часы и минуты из startTime/endTime
        let rentalStartHour = 9, rentalStartMinute = 0;
        let rentalEndHour = 10, rentalEndMinute = 0;
        if (rental.startTime) {
          const timeStr = rental.startTime.includes('T')
            ? rental.startTime.slice(11, 16)
            : rental.startTime.slice(0, 5);
          const [hourStr, minStr] = timeStr.split(':');
          rentalStartHour = parseInt(hourStr);
          rentalStartMinute = parseInt(minStr) || 0;
        }
        if (rental.endTime) {
          const timeStr = rental.endTime.includes('T')
            ? rental.endTime.slice(11, 16)
            : rental.endTime.slice(0, 5);
          const [hourStr, minStr] = timeStr.split(':');
          rentalEndHour = parseInt(hourStr);
          rentalEndMinute = parseInt(minStr) || 0;
        }

        selectedHourlySlots.push({
          date: rentalDate,
          startHour: rentalStartHour,
          startMinute: rentalStartMinute,
          endHour: rentalEndHour,
          endMinute: rentalEndMinute,
        });
      });

      // Обновить selectedDays из уникальных дат в rentals
      const uniqueDateStrings = Array.from(new Set(app.rentals.map((r: any) =>
        new Date(r.date).toISOString().split('T')[0]
      )));
      selectedDays = uniqueDateStrings.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());

      console.log('HOURLY slots restored from rentals:', selectedHourlySlots.length);
    } else {
      // Fallback: создать слоты из startTime/endTime (для старых заявок без rentals)
      const [startHourStr, startMinStr] = startTime.split(':');
      const [endHourStr, endMinStr] = endTime.split(':');
      const startHour = parseInt(startHourStr);
      const startMinute = parseInt(startMinStr) || 0;
      const endHour = parseInt(endHourStr);
      const endMinute = parseInt(endMinStr) || 0;
      const datesForSlots = selectedDays.length > 0 ? selectedDays : [startDate];

      // Для старых заявок создаем один слот на весь диапазон
      datesForSlots.forEach(date => {
        selectedHourlySlots.push({
          date,
          startHour,
          startMinute,
          endHour,
          endMinute,
        });
      });

      console.log('HOURLY slots created from startTime/endTime:', selectedHourlySlots);
    }
  }

  console.log('Final startTime:', startTime);
  console.log('Final endTime:', endTime);
  console.log('Final selectedHourlySlots:', selectedHourlySlots);

  const result: FormData = {
    category,
    periodUnit,
    roomId: app.roomId,
    workspaceIds,
    startDate,
    endDate,
    startTime,
    endTime,
    selectedDays,
    selectedHourlySlots,
    monthType,
    basePrice: app.basePrice,
    adjustedPrice: app.adjustedPrice,
    adjustmentReason: app.adjustmentReason || '',
    paymentType: app.paymentType,
    clientId: app.clientId,
    notes: app.notes || '',
    eventType: app.eventType || '',
  };

  console.log('=== Final FormData result ===', result);
  return result;
}

export default function EditRentalPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { sidebarCollapsed } = useNavigationStore();

  // Загрузка заявки
  const { data: application, isLoading: isLoadingApplication } = useRentalApplication(id);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [ignoreConflicts, setIgnoreConflicts] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState<{
    basePrice: number;
    quantity: number;
    priceUnit: PriceUnit;
    totalPrice: number;
  } | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<{ workspaceId: string; date: Date }[]>([]);

  const { data: rooms, isLoading: isLoadingRooms } = useRooms();
  const { data: allWorkspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  // Фильтруем workspaces по выбранному roomId
  const workspaces = useMemo(() => {
    if (!allWorkspaces || !formData.roomId) return [];
    return allWorkspaces.filter(ws => ws.roomId === formData.roomId);
  }, [allWorkspaces, formData.roomId]);

  const updateMutation = useUpdateRentalApplication();
  const checkAvailabilityMutation = useCheckAvailability();
  const calculatePriceMutation = useCalculatePrice();
  const removeRentalMutation = useRemoveRental();

  // Инициализация формы данными заявки
  useEffect(() => {
    if (application && !isInitialized) {
      const mappedData = mapApplicationToFormData(application);
      setFormData(mappedData);

      // Для workspace с дневной арендой инициализируем selectedSlots
      if (mappedData.category === 'workspace' && mappedData.periodUnit === 'day') {
        const slots: { workspaceId: string; date: Date }[] = [];
        mappedData.workspaceIds.forEach(workspaceId => {
          mappedData.selectedDays.forEach(date => {
            slots.push({ workspaceId, date });
          });
        });
        setSelectedSlots(slots);
      }

      // Инициализация priceCalculation
      setPriceCalculation({
        basePrice: application.basePrice,
        quantity: application.quantity,
        priceUnit: application.priceUnit,
        totalPrice: application.totalPrice,
      });

      setIsInitialized(true);
    }
  }, [application, isInitialized]);

  // Фильтрация помещений
  const coworkingRooms = useMemo(() => {
    return rooms?.filter(r => r.isCoworking) || [];
  }, [rooms]);

  const regularRooms = useMemo(() =>
    rooms?.filter(r => !r.isCoworking && r.status === 'AVAILABLE') || [],
    [rooms]
  );

  // Определение типа аренды
  const getRentalType = (): RentalType | null => {
    if (formData.category === 'hourly') return 'HOURLY';
    if (formData.category === 'workspace') {
      if (formData.periodUnit === 'day') return 'WORKSPACE_DAILY';
      if (formData.periodUnit === 'month') return 'WORKSPACE_MONTHLY';
    }
    if (formData.category === 'room') {
      if (formData.periodUnit === 'day') return 'ROOM_DAILY';
      if (formData.periodUnit === 'month') return 'ROOM_MONTHLY';
    }
    return null;
  };

  // Определение типа периода
  const getPeriodType = (): RentalPeriodType | null => {
    if (formData.category === 'hourly') return 'HOURLY';
    if (formData.periodUnit === 'day') return 'SPECIFIC_DAYS';
    if (formData.periodUnit === 'month') {
      return formData.monthType === 'calendar' ? 'CALENDAR_MONTH' : 'SLIDING_MONTH';
    }
    return null;
  };

  // Обработчик клика по слоту в таблице доступности
  const handleSlotToggle = (workspaceId: string, date: Date) => {
    setSelectedSlots((prev) => {
      const exists = prev.some(
        (slot) => slot.workspaceId === workspaceId && isSameDay(slot.date, date)
      );
      if (exists) {
        return prev.filter(
          (slot) => !(slot.workspaceId === workspaceId && isSameDay(slot.date, date))
        );
      }
      return [...prev, { workspaceId, date }];
    });
  };

  // Синхронизация selectedSlots с formData
  useEffect(() => {
    if (formData.category === 'workspace' && formData.periodUnit === 'day' && isInitialized) {
      const uniqueWorkspaceIds = Array.from(new Set(selectedSlots.map((s) => s.workspaceId)));
      const uniqueDates = selectedSlots
        .map((s) => s.date)
        .filter((date, index, self) =>
          index === self.findIndex((d) => d.getTime() === date.getTime())
        )
        .sort((a, b) => a.getTime() - b.getTime());

      setFormData((prev) => ({
        ...prev,
        workspaceIds: uniqueWorkspaceIds,
        selectedDays: uniqueDates,
        startDate: uniqueDates.length > 0 ? uniqueDates[0] : null,
        endDate: uniqueDates.length > 1 ? uniqueDates[uniqueDates.length - 1] : null,
      }));
    }
  }, [selectedSlots, formData.category, formData.periodUnit, isInitialized]);

  // Расчет цены при изменении параметров (только после инициализации)
  useEffect(() => {
    if (!isInitialized) return;

    // Для HOURLY - рассчитываем на основе выбранных слотов
    if (formData.category === 'hourly' && formData.selectedHourlySlots.length > 0) {
      const room = rooms?.find(r => r.id === formData.roomId);
      if (!room) return;

      setPriceCalculation({
        basePrice: Number(room.hourlyRate),
        quantity: formData.selectedHourlySlots.length,
        priceUnit: 'HOUR',
        totalPrice: Number(room.hourlyRate) * formData.selectedHourlySlots.length,
      });

      setFormData(prev => ({ ...prev, basePrice: Number(room.hourlyRate) }));
      return;
    }

    const rentalType = getRentalType();
    const periodType = getPeriodType();

    if (!rentalType || !periodType) return;
    if (formData.category === 'hourly' && !formData.roomId) return;
    if (formData.category === 'workspace' && formData.workspaceIds.length === 0) return;
    if (formData.category === 'room' && !formData.roomId) return;
    if (!formData.startDate) return;

    const dto = {
      rentalType,
      roomId: formData.roomId || undefined,
      workspaceIds: formData.workspaceIds.length > 0 ? formData.workspaceIds : undefined,
      periodType,
      startDate: format(formData.startDate, 'yyyy-MM-dd'),
      endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : undefined,
      startTime: formData.category === 'hourly' ? formData.startTime : undefined,
      endTime: formData.category === 'hourly' ? formData.endTime : undefined,
      selectedDays: formData.selectedDays.length > 0 ? formData.selectedDays.map(d => format(d, 'yyyy-MM-dd')) : undefined,
    };

    calculatePriceMutation.mutate(dto, {
      onSuccess: (result) => {
        setPriceCalculation(result);
        setFormData(prev => ({ ...prev, basePrice: result.basePrice }));
      },
    });
  }, [
    formData.category,
    formData.periodUnit,
    formData.roomId,
    formData.workspaceIds,
    formData.startDate,
    formData.endDate,
    formData.startTime,
    formData.endTime,
    formData.selectedDays,
    formData.selectedHourlySlots,
    formData.monthType,
    rooms,
    isInitialized,
  ]);

  // Проверка доступности
  const checkAvailability = async () => {
    const rentalType = getRentalType();
    const periodType = getPeriodType();

    if (!rentalType || !periodType || !formData.startDate) return;

    setIsCheckingAvailability(true);
    const dto = {
      rentalType,
      roomId: formData.roomId || undefined,
      workspaceIds: formData.workspaceIds.length > 0 ? formData.workspaceIds : undefined,
      periodType,
      startDate: format(formData.startDate, 'yyyy-MM-dd'),
      endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : undefined,
      startTime: formData.category === 'hourly' ? formData.startTime : undefined,
      endTime: formData.category === 'hourly' ? formData.endTime : undefined,
      selectedDays: formData.selectedDays.length > 0 ? formData.selectedDays.map(d => format(d, 'yyyy-MM-dd')) : undefined,
      excludeApplicationId: id, // Исключаем текущую заявку из проверки
    };

    checkAvailabilityMutation.mutate(dto, {
      onSuccess: (result) => {
        setConflicts(result.conflicts);
        setIsCheckingAvailability(false);
      },
      onError: () => {
        setIsCheckingAvailability(false);
      },
    });
  };

  // Валидация формы
  const isFormValid = () => {
    if (!formData.category) return false;
    if (!formData.clientId) return false;

    if (formData.category === 'hourly') {
      return formData.roomId !== null && formData.selectedHourlySlots.length > 0;
    }

    if (!formData.periodUnit) return false;
    if (!formData.startDate) return false;

    if (formData.category === 'workspace') {
      if (formData.workspaceIds.length === 0) return false;
    } else if (formData.category === 'room') {
      if (!formData.roomId) return false;
    }

    return true;
  };

  // Режим просмотра - если заявка не в статусе DRAFT
  const isViewMode = application?.status !== 'DRAFT';

  // Сохранение изменений
  const handleSave = async () => {
    const rentalType = getRentalType();
    const periodType = getPeriodType();

    if (!rentalType || !periodType || !formData.startDate || !formData.clientId) return;

    // Для HOURLY - преобразуем selectedHourlySlots в формат API (с минутами)
    const hourlySlots = formData.category === 'hourly' && formData.selectedHourlySlots.length > 0
      ? formData.selectedHourlySlots.map(slot => ({
          date: format(slot.date, 'yyyy-MM-dd'),
          startTime: `${slot.startHour.toString().padStart(2, '0')}:${(slot.startMinute || 0).toString().padStart(2, '0')}`,
          endTime: `${slot.endHour.toString().padStart(2, '0')}:${(slot.endMinute || 0).toString().padStart(2, '0')}`,
        }))
      : undefined;

    // Считаем общее количество часов для HOURLY (может быть дробным)
    const hourlyQuantity = formData.category === 'hourly' && formData.selectedHourlySlots.length > 0
      ? formData.selectedHourlySlots.reduce((sum, slot) => {
          const startMin = slot.startHour * 60 + (slot.startMinute || 0);
          const endMin = slot.endHour * 60 + (slot.endMinute || 0);
          return sum + (endMin - startMin);
        }, 0) / 60
      : undefined;

    const dto = {
      rentalType,
      roomId: formData.roomId || undefined,
      workspaceIds: formData.workspaceIds.length > 0 ? formData.workspaceIds : undefined,
      clientId: formData.clientId,
      periodType,
      startDate: format(formData.startDate, 'yyyy-MM-dd'),
      endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : undefined,
      startTime: formData.category === 'hourly' ? formData.startTime : undefined,
      endTime: formData.category === 'hourly' ? formData.endTime : undefined,
      selectedDays: formData.selectedDays.length > 0 ? formData.selectedDays.map(d => format(d, 'yyyy-MM-dd')) : undefined,
      hourlySlots, // Передаём слоты для HOURLY заявок
      basePrice: formData.basePrice,
      adjustedPrice: formData.adjustedPrice || undefined,
      adjustmentReason: formData.adjustmentReason || undefined,
      priceUnit: priceCalculation?.priceUnit || 'DAY',
      quantity: formData.category === 'hourly' ? (hourlyQuantity || 1) : (priceCalculation?.quantity || 1),
      paymentType: formData.paymentType,
      eventType: formData.eventType || undefined,
      notes: formData.notes || undefined,
      ignoreConflicts,
    };

    updateMutation.mutate(
      { id, data: dto },
      {
        onSuccess: () => {
          router.push('/rentals');
        },
      }
    );
  };

  // Загрузка
  if (isLoadingApplication) {
    return (
      <div className="space-y-6 pb-32">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Заявка не найдена</h2>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Заявка №{application.applicationNumber}</h1>
                <Badge className={STATUS_COLORS[application.status]}>
                  {STATUS_LABELS[application.status]}
                </Badge>
                {isViewMode && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Только просмотр
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Создана {format(new Date(application.createdAt), 'PPP', { locale: ru })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Основная форма */}
        <div className="space-y-6">
          {/* Тип аренды */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Почасовая */}
            <Button
              variant={formData.category === 'hourly' ? 'default' : 'outline'}
              disabled={isViewMode}
              onClick={() => setFormData(prev => ({
                ...prev,
                category: 'hourly',
                periodUnit: null,
                roomId: null,
                workspaceIds: [],
                startDate: null,
                endDate: null,
                selectedDays: [],
              }))}
            >
              <Clock className="h-4 w-4 mr-2" />
              Почасовая
            </Button>

            {/* Рабочее место */}
            <Button
              variant={formData.category === 'workspace' ? 'default' : 'outline'}
              disabled={isViewMode}
              onClick={() => setFormData(prev => ({
                ...prev,
                category: 'workspace',
                periodUnit: 'day',
                roomId: null,
                workspaceIds: [],
                startDate: null,
                endDate: null,
                selectedDays: [],
              }))}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Рабочее место
            </Button>

            {/* Подварианты для Рабочего места */}
            {formData.category === 'workspace' && (
              <>
                <div className="h-6 w-px bg-border mx-1" />
                <Button
                  variant={formData.periodUnit === 'day' ? 'default' : 'outline'}
                  size="sm"
                  disabled={isViewMode}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    periodUnit: 'day',
                    startDate: null,
                    endDate: null,
                    selectedDays: [],
                  }))}
                >
                  День
                </Button>
                <Button
                  variant={formData.periodUnit === 'month' ? 'default' : 'outline'}
                  size="sm"
                  disabled={isViewMode}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    periodUnit: 'month',
                    startDate: null,
                    endDate: null,
                    selectedDays: [],
                  }))}
                >
                  Месяц
                </Button>
              </>
            )}

            {/* Кабинет */}
            <Button
              variant={formData.category === 'room' ? 'default' : 'outline'}
              disabled={isViewMode}
              onClick={() => setFormData(prev => ({
                ...prev,
                category: 'room',
                periodUnit: 'day',
                roomId: null,
                workspaceIds: [],
                startDate: null,
                endDate: null,
                selectedDays: [],
              }))}
            >
              <DoorOpen className="h-4 w-4 mr-2" />
              Кабинет
            </Button>

            {/* Подварианты для Кабинета */}
            {formData.category === 'room' && (
              <>
                <div className="h-6 w-px bg-border mx-1" />
                <Button
                  variant={formData.periodUnit === 'day' ? 'default' : 'outline'}
                  size="sm"
                  disabled={isViewMode}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    periodUnit: 'day',
                    startDate: null,
                    endDate: null,
                    selectedDays: [],
                  }))}
                >
                  День
                </Button>
                <Button
                  variant={formData.periodUnit === 'month' ? 'default' : 'outline'}
                  size="sm"
                  disabled={isViewMode}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    periodUnit: 'month',
                    startDate: null,
                    endDate: null,
                    selectedDays: [],
                  }))}
                >
                  Месяц
                </Button>
              </>
            )}
          </div>

          {/* Помещение и даты аренды - для workspace */}
          {formData.category === 'workspace' && formData.periodUnit && (
            <Card>
              <CardHeader>
                <CardTitle>Помещение и даты аренды</CardTitle>
                <CardDescription>
                  {formData.periodUnit === 'day'
                    ? 'Выберите коворкинг и кликните по свободным слотам в таблице'
                    : 'Выберите рабочие места и укажите период'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Выбор коворкинга и период на одной строке (только для месяца) */}
                {formData.periodUnit === 'month' ? (
                  <div className="flex items-end gap-6">
                    {/* Выбор коворкинга */}
                    <div className="flex-shrink-0 w-64">
                      <Label className="text-sm font-medium">Коворкинг</Label>
                      {isLoadingRooms ? (
                        <div className="flex items-center mt-1 h-10 px-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                          <span className="text-sm text-muted-foreground">Загрузка...</span>
                        </div>
                      ) : coworkingRooms.length === 0 ? (
                        <div className="mt-1 p-3 text-sm text-muted-foreground border rounded-md border-dashed">
                          Нет доступных коворкингов. <a href="/admin/rooms" className="text-primary hover:underline">Добавить помещение</a>
                        </div>
                      ) : (
                        <Select
                          value={formData.roomId || ''}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, workspaceIds: [] }))}
                          disabled={isViewMode}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Выберите коворкинг" />
                          </SelectTrigger>
                          <SelectContent>
                            {coworkingRooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}{room.number ? ` №${room.number}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Переключатель периода */}
                    <div className="flex-shrink-0">
                      <Label className="text-sm font-medium">Период</Label>
                      <div className="flex items-center gap-4 mt-1 h-10">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, monthType: 'calendar', startDate: null, endDate: null }))}
                          disabled={isViewMode}
                          className={cn(
                            "text-sm font-medium transition-colors border-b-2 pb-0.5",
                            formData.monthType === 'calendar'
                              ? "text-primary border-dashed border-muted-foreground"
                              : "text-muted-foreground border-transparent hover:text-foreground hover:border-dashed hover:border-muted-foreground",
                            isViewMode && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          Фиксированный месяц
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, monthType: 'sliding', startDate: null, endDate: null }))}
                          disabled={isViewMode}
                          className={cn(
                            "text-sm font-medium transition-colors border-b-2 pb-0.5",
                            formData.monthType === 'sliding'
                              ? "text-primary border-dashed border-muted-foreground"
                              : "text-muted-foreground border-transparent hover:text-foreground hover:border-dashed hover:border-muted-foreground",
                            isViewMode && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          Скользящий (30 дней)
                        </button>
                      </div>
                    </div>

                    {/* Дата начала - только для скользящего месяца */}
                    {formData.monthType === 'sliding' && (
                      <div className="flex-shrink-0 w-64">
                        <Label className="text-sm font-medium">Дата начала</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isViewMode}
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1 h-10",
                                !formData.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.startDate
                                ? format(formData.startDate, 'PPP', { locale: ru })
                                : 'Выберите дату'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.startDate || undefined}
                              onSelect={(date) => {
                                if (!date) return;
                                const endDate = addDays(date, 30);
                                setFormData(prev => ({ ...prev, startDate: date, endDate }));
                              }}
                              locale={ru}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Выбор коворкинга - для режима "день" */
                  <div>
                    <Label className="text-sm font-medium">Коворкинг</Label>
                    {isLoadingRooms ? (
                      <div className="flex items-center mt-1 h-10 px-3 border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground">Загрузка...</span>
                      </div>
                    ) : coworkingRooms.length === 0 ? (
                      <div className="mt-1 p-3 text-sm text-muted-foreground border rounded-md border-dashed">
                        Нет доступных коворкингов. <a href="/admin/rooms" className="text-primary hover:underline">Добавить помещение</a>
                      </div>
                    ) : (
                      <Select
                        value={formData.roomId || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, workspaceIds: [] }))}
                        disabled={isViewMode}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Выберите коворкинг" />
                        </SelectTrigger>
                        <SelectContent>
                          {coworkingRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}{room.number ? ` №${room.number}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Для периода "день" - таблица доступности */}
                {formData.periodUnit === 'day' && formData.roomId && (
                  <>
                    {isLoadingWorkspaces ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Загрузка рабочих мест...</span>
                      </div>
                    ) : workspaces && workspaces.length > 0 ? (
                      <WorkspaceAvailabilityGrid
                        workspaces={workspaces}
                        selectedSlots={selectedSlots}
                        onSlotToggle={isViewMode ? () => {} : handleSlotToggle}
                      />
                    ) : (
                      <div className="p-6 text-center border rounded-lg border-dashed">
                        <div className="text-muted-foreground">
                          В выбранном коворкинге нет рабочих мест.
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Добавьте рабочие места в разделе <a href="/rentals/workspaces" className="text-primary hover:underline">Управление рабочими местами</a>
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Для периода "месяц" - интерфейс с сеткой доступности */}
                {formData.periodUnit === 'month' && formData.roomId && (
                  <div className="space-y-6">
                    {/* Выбор месяца или даты начала */}
                    <div className="space-y-4">
                      {/* Для календарного месяца - чипсы с месяцами */}
                      {formData.monthType === 'calendar' && (
                          <div>
                            <Label className="mb-2 block">Выберите месяц</Label>
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: 12 }, (_, i) => {
                                const monthDate = addMonths(startOfMonth(new Date()), i);
                                const isSelected = formData.startDate &&
                                  format(formData.startDate, 'yyyy-MM') === format(monthDate, 'yyyy-MM');

                                return (
                                  <Button
                                    key={i}
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    disabled={isViewMode}
                                    onClick={() => {
                                      const startDate = startOfMonth(monthDate);
                                      const endDate = endOfMonth(monthDate);
                                      setFormData(prev => ({ ...prev, startDate, endDate }));
                                    }}
                                    className={cn(
                                      "transition-colors",
                                      isSelected && "bg-primary text-primary-foreground"
                                    )}
                                  >
                                    {format(monthDate, 'LLLL yyyy', { locale: ru })}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {formData.startDate && formData.endDate && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium">Период:</div>
                          <div className="text-sm text-muted-foreground">
                            {format(formData.startDate, 'PPP', { locale: ru })} — {format(formData.endDate, 'PPP', { locale: ru })}
                          </div>
                        </div>
                      )}
                    </div>


                    {/* Секция "Доступность" - показывается когда выбраны даты */}
                    {formData.startDate && formData.endDate && workspaces.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Доступность и выбор рабочих мест</h4>
                        <MonthlyWorkspaceAvailabilityGrid
                          workspaces={workspaces}
                          selectedWorkspaceIds={formData.workspaceIds}
                          onWorkspaceToggle={isViewMode ? () => {} : (workspaceId) => {
                            setFormData(prev => ({
                              ...prev,
                              workspaceIds: prev.workspaceIds.includes(workspaceId)
                                ? prev.workspaceIds.filter(id => id !== workspaceId)
                                : [...prev.workspaceIds, workspaceId],
                            }));
                          }}
                          startDate={formData.startDate}
                          endDate={formData.endDate}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Проверка доступности и конфликты */}
                {formData.startDate && !isViewMode && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    <Button
                      variant="outline"
                      onClick={checkAvailability}
                      disabled={isCheckingAvailability}
                      className="w-full"
                    >
                      {isCheckingAvailability ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Проверка...
                        </>
                      ) : (
                        'Проверить доступность'
                      )}
                    </Button>

                    {conflicts.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Обнаружены конфликты</AlertTitle>
                        <AlertDescription>
                          <div className="mt-2 space-y-1">
                            {conflicts.map((conflict, i) => (
                              <div key={i} className="text-sm">
                                {format(new Date(conflict.date), 'PPP', { locale: ru })}: {conflict.description}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={ignoreConflicts}
                                onCheckedChange={(checked) => setIgnoreConflicts(!!checked)}
                              />
                              <span>Игнорировать конфликты</span>
                            </Label>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Объединенный блок для HOURLY: Объект и период */}
          {formData.category === 'hourly' && (
            <Card>
              <CardHeader>
                <CardTitle>Помещение и даты аренды</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Шаг 1: Выбор зала */}
                <div>
                  <Label>Помещение</Label>
                  <Select
                    value={formData.roomId || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, selectedHourlySlots: [] }))}
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите зал" />
                    </SelectTrigger>
                    <SelectContent>
                      {regularRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}{room.number ? ` №${room.number}` : ''} - {room.hourlyRate} ₽/час
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.roomId && (
                  <>
                    <Separator />

                    {/* Шаг 2 и 3: Выбор дней и временных слотов */}
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Календарь слева */}
                      <div className="flex-shrink-0">
                        <Label className="mb-2 block">Выберите дни</Label>
                        <Calendar
                          mode="multiple"
                          selected={formData.selectedDays}
                          onSelect={(dates) => {
                            if (isViewMode) return;
                            setFormData(prev => ({
                              ...prev,
                              selectedDays: dates || [],
                              selectedHourlySlots: prev.selectedHourlySlots.filter(slot =>
                                dates?.some(d => isSameDay(d, slot.date))
                              ),
                            }));
                          }}
                          locale={ru}
                          className="rounded-md border"
                          disabled={isViewMode ? () => true : undefined}
                        />
                      </div>

                      {/* Временные слоты справа */}
                      <div className="flex-1 min-w-0">
                        {formData.selectedDays.length > 0 ? (
                          <>
                            <Label className="mb-2 block">Выберите временные слоты</Label>
                            <HourlyTimeSlotGrid
                              roomId={formData.roomId}
                              selectedDates={formData.selectedDays.sort((a, b) => a.getTime() - b.getTime())}
                              selectedSlots={formData.selectedHourlySlots}
                              onSlotToggle={isViewMode ? () => {} : (slot) => {
                                setFormData(prev => {
                                  const exists = prev.selectedHourlySlots.some(
                                    s => isSameDay(s.date, slot.date) && s.startHour === slot.startHour
                                  );
                                  return {
                                    ...prev,
                                    selectedHourlySlots: exists
                                      ? prev.selectedHourlySlots.filter(
                                          s => !(isSameDay(s.date, slot.date) && s.startHour === slot.startHour)
                                        )
                                      : [...prev.selectedHourlySlots, slot],
                                  };
                                });
                              }}
                            />
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground border rounded-md border-dashed">
                            Выберите дни в календаре
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Забронированные слоты - для HOURLY заявок */}
          {formData.category === 'hourly' && application?.rentals && application.rentals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Забронированные слоты</CardTitle>
                <CardDescription>
                  {application.rentals.length} слот(ов) в этой заявке
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {application.rentals
                    .sort((a, b) => {
                      const dateA = new Date(a.date);
                      const dateB = new Date(b.date);
                      if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
                      const timeA = new Date(a.startTime).getTime();
                      const timeB = new Date(b.startTime).getTime();
                      return timeA - timeB;
                    })
                    .map((rental: any) => (
                      <div
                        key={rental.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="font-medium">
                              {format(new Date(rental.date), 'd MMMM yyyy', { locale: ru })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(rental.startTime).toISOString().slice(11, 16)} - {new Date(rental.endTime).toISOString().slice(11, 16)}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {rental.totalPrice?.toLocaleString('ru-RU')} ₽
                          </Badge>
                        </div>
                        {/* Кнопка удаления - только если DRAFT и слотов больше 1 */}
                        {application.status === 'DRAFT' && application.rentals && application.rentals.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm('Удалить этот слот?')) {
                                removeRentalMutation.mutate({
                                  applicationId: application.id,
                                  rentalId: rental.id,
                                });
                              }
                            }}
                            disabled={removeRentalMutation.isPending}
                          >
                            {removeRentalMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
                {application.status !== 'DRAFT' && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Удаление слотов доступно только для заявок в статусе "Черновик"
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Выбор объекта - только для room */}
          {formData.category === 'room' && formData.periodUnit && (
            <Card>
              <CardHeader>
                <CardTitle>Помещение и даты аренды</CardTitle>
                <CardDescription>Выберите кабинет для аренды</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.category === 'room' && (
                  <Select
                    value={formData.roomId || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите кабинет" />
                    </SelectTrigger>
                    <SelectContent>
                      {coworkingRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          <div className="flex justify-between items-center gap-4">
                            <span>{room.name}{room.number ? ` №${room.number}` : ''}</span>
                            <span className="text-muted-foreground">
                              {formData.periodUnit === 'day' && `${room.dailyRateCoworking || room.dailyRate} ₽/день`}
                              {formData.periodUnit === 'month' && `${room.monthlyRateCoworking} ₽/месяц`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          {/* Период - только для room */}
          {formData.category === 'room' && formData.periodUnit && (
            <Card>
              <CardHeader>
                <CardTitle>Период</CardTitle>
                <CardDescription>Укажите даты аренды</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.periodUnit === 'day' && (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Календарь слева */}
                    <div className="flex-shrink-0">
                      <Calendar
                        mode="multiple"
                        selected={formData.selectedDays}
                        onSelect={(dates) => {
                          if (isViewMode) return;
                          setFormData(prev => ({
                            ...prev,
                            selectedDays: dates || [],
                            startDate: dates && dates.length > 0 ? dates.sort((a, b) => a.getTime() - b.getTime())[0] : null,
                            endDate: dates && dates.length > 1 ? dates.sort((a, b) => a.getTime() - b.getTime())[dates.length - 1] : null,
                          }));
                        }}
                        locale={ru}
                        className="rounded-md border"
                        disabled={isViewMode ? () => true : undefined}
                      />
                    </div>

                    {/* Сетка со статусом доступности справа */}
                    <div className="flex-1 min-w-0">
                      {formData.roomId ? (
                        <RoomDailyAvailabilityGrid
                          roomId={formData.roomId}
                          selectedDates={formData.selectedDays}
                          conflicts={conflicts}
                          isCheckingAvailability={isCheckingAvailability}
                          ignoreConflicts={ignoreConflicts}
                          onIgnoreConflictsChange={isViewMode ? () => {} : setIgnoreConflicts}
                          onCheckAvailability={isViewMode ? () => {} : checkAvailability}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground border rounded-md border-dashed">
                          Сначала выберите кабинет
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.periodUnit === 'month' && (
                  <>
                    <div>
                      <Label>Тип месяца</Label>
                      <RadioGroup
                        value={formData.monthType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, monthType: value as 'calendar' | 'sliding', startDate: null, endDate: null }))}
                        className="mt-2 flex gap-4"
                        disabled={isViewMode}
                      >
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="calendar" />
                          <span>Календарный (с 1-го числа)</span>
                        </Label>
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="sliding" />
                          <span>Скользящий (30 дней)</span>
                        </Label>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>{formData.monthType === 'calendar' ? 'Выберите месяц' : 'Дата начала'}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isViewMode}
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !formData.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.startDate
                              ? formData.monthType === 'calendar'
                                ? format(formData.startDate, 'LLLL yyyy', { locale: ru })
                                : format(formData.startDate, 'PPP', { locale: ru })
                              : 'Выберите дату'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.startDate || undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              let startDate = date;
                              let endDate: Date;

                              if (formData.monthType === 'calendar') {
                                startDate = startOfMonth(date);
                                endDate = endOfMonth(date);
                              } else {
                                endDate = addMonths(date, 1);
                              }

                              setFormData(prev => ({ ...prev, startDate, endDate }));
                            }}
                            locale={ru}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {formData.startDate && formData.endDate && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium">Период аренды:</div>
                        <div className="text-sm text-muted-foreground">
                          {format(formData.startDate, 'PPP', { locale: ru })} — {format(formData.endDate, 'PPP', { locale: ru })}
                        </div>
                      </div>
                    )}

                    {/* Кнопка проверки доступности для месяца */}
                    {formData.startDate && !isViewMode && (
                      <Button
                        variant="outline"
                        onClick={checkAvailability}
                        disabled={isCheckingAvailability}
                        className="w-full"
                      >
                        {isCheckingAvailability ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Проверка...
                          </>
                        ) : (
                          'Проверить доступность'
                        )}
                      </Button>
                    )}

                    {/* Конфликты для месяца */}
                    {conflicts.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Обнаружены конфликты</AlertTitle>
                        <AlertDescription>
                          <div className="mt-2 space-y-1">
                            {conflicts.map((conflict, i) => (
                              <div key={i} className="text-sm">
                                {format(new Date(conflict.date), 'PPP', { locale: ru })}: {conflict.description}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={ignoreConflicts}
                                onCheckedChange={(checked) => setIgnoreConflicts(!!checked)}
                                disabled={isViewMode}
                              />
                              <span>Игнорировать конфликты и продолжить</span>
                            </Label>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Клиент и дополнительные данные */}
          <Card>
            <CardHeader>
              <CardTitle>Клиент и дополнительные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Клиент *</Label>
                <div className="mt-1">
                  <ClientSearch
                    value={formData.clientId || undefined}
                    onValueChange={(clientId) => {
                      if (isViewMode) return;
                      setFormData(prev => ({ ...prev, clientId: clientId || null }));
                    }}
                    onClientSelect={(client) => {
                      setSelectedClient(client);
                    }}
                    disabled={isViewMode}
                  />
                </div>
              </div>

              {formData.category === 'hourly' && (
                <div>
                  <Label>Тип мероприятия</Label>
                  <Input
                    value={formData.eventType}
                    onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
                    placeholder="Например: мастер-класс, репетиция"
                    className="mt-1"
                    disabled={isViewMode}
                  />
                </div>
              )}

              <div>
                <Label>Примечания</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Дополнительная информация"
                  className="mt-1"
                  rows={3}
                  disabled={isViewMode}
                />
              </div>

              {priceCalculation && formData.adjustedPrice !== null && (
                <div>
                  <Label>Причина корректировки</Label>
                  <Textarea
                    value={formData.adjustmentReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                    placeholder="Укажите причину"
                    className="mt-1"
                    rows={2}
                    disabled={isViewMode}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Закрепленный футер */}
      <div className={cn(
        "fixed bottom-0 right-0 bg-background border-t shadow-lg z-50 transition-all duration-300",
        "left-0 md:left-20",
        !sidebarCollapsed && "md:left-64"
      )}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Режим просмотра - кнопка Назад и информация о стоимости */}
            {isViewMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push('/rentals')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к списку
                </Button>

                {/* Информация о стоимости в режиме просмотра */}
                <div className="flex items-center gap-6 ml-auto">
                  {priceCalculation ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {formData.adjustedPrice
                            ? (formData.adjustedPrice * priceCalculation.quantity).toLocaleString('ru-RU')
                            : priceCalculation.totalPrice.toLocaleString('ru-RU')
                          } ₽
                        </span>
                        {formData.adjustedPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {priceCalculation.totalPrice.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {priceCalculation.basePrice.toLocaleString('ru-RU')} ₽ × {priceCalculation.quantity} {
                          priceCalculation.priceUnit === 'HOUR' ? 'ч' :
                          priceCalculation.priceUnit === 'DAY' ? 'д' : 'мес'
                        }
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                {/* Режим редактирования - Выйти слева */}
                <Button
                  variant="ghost"
                  onClick={() => router.push('/rentals')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Выйти
                </Button>

                {/* Стоимость и кнопка сохранения справа */}
                <div className="flex items-center gap-6 ml-auto">
                  {/* Стоимость */}
                  <div className="flex items-center gap-6">
                    {priceCalculation ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {formData.adjustedPrice
                              ? (formData.adjustedPrice * priceCalculation.quantity).toLocaleString('ru-RU')
                              : priceCalculation.totalPrice.toLocaleString('ru-RU')
                            } ₽
                          </span>
                          {formData.adjustedPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              {priceCalculation.totalPrice.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {priceCalculation.basePrice.toLocaleString('ru-RU')} ₽ × {priceCalculation.quantity} {
                            priceCalculation.priceUnit === 'HOUR' ? 'ч' :
                            priceCalculation.priceUnit === 'DAY' ? 'д' : 'мес'
                          }
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Заполните параметры</span>
                    )}
                  </div>

                  {/* Корректировка цены */}
                  {priceCalculation && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.adjustedPrice || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, adjustedPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                        placeholder="Своя цена"
                        className="w-32 h-9"
                      />
                    </div>
                  )}

                  {/* Кнопка сохранения */}
                  <Button
                    onClick={handleSave}
                    disabled={!isFormValid() || updateMutation.isPending || (conflicts.length > 0 && !ignoreConflicts)}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить изменения
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
