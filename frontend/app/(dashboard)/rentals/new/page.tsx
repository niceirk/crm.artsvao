'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addMonths, addDays, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowLeft, AlertTriangle, Check, Loader2, Building2, Clock, Briefcase, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
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
  useCreateRentalApplication,
  useCheckAvailability,
  useCalculatePrice,
} from '@/hooks/use-rental-applications';
import { WorkspaceAvailabilityGrid } from './components/workspace-availability-grid';
import { HourlyTimeSlotGrid } from './components/hourly-time-slot-grid';
import { MonthlyWorkspaceAvailabilityGrid } from './components/monthly-workspace-availability-grid';
import { RoomDailyAvailabilityGrid } from './components/room-daily-availability-grid';
import { MonthlyRoomAvailabilityGrid } from './components/monthly-room-availability-grid';
import { toast } from 'sonner';
import type { Client } from '@/lib/types/clients';
import type {
  RentalType,
  RentalPeriodType,
  PriceUnit,
  ConflictInfo,
  HourlyTimeSlot,
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
  category: 'hourly',
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

export default function NewRentalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sidebarCollapsed } = useNavigationStore();

  // Получаем параметры предзаполнения из URL
  const prefilledCategory = searchParams.get('category') as RentalCategory | null;
  const prefilledPeriodUnit = searchParams.get('periodUnit') as 'day' | 'month' | null;
  const prefilledRoomId = searchParams.get('roomId');
  const prefilledWorkspaceId = searchParams.get('workspaceId');
  const prefilledDate = searchParams.get('date');

  // Инициализация формы с учётом предзаполненных данных
  const [formData, setFormData] = useState<FormData>(() => ({
    ...initialFormData,
    category: prefilledCategory || 'hourly',
    periodUnit: prefilledPeriodUnit || null,
    roomId: prefilledRoomId || null,
  }));
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
  // Загружаем все workspaces и фильтруем на клиенте
  const { data: allWorkspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  // Отладка
  console.log('rooms:', rooms, 'isLoadingRooms:', isLoadingRooms);
  console.log('allWorkspaces:', allWorkspaces, 'isLoadingWorkspaces:', isLoadingWorkspaces);
  console.log('formData.roomId:', formData.roomId);

  // Фильтруем workspaces по выбранному roomId
  const workspaces = useMemo(() => {
    if (!allWorkspaces || !formData.roomId) return [];
    const filtered = allWorkspaces.filter(ws => ws.roomId === formData.roomId);
    console.log('Filtered workspaces for roomId', formData.roomId, ':', filtered);
    return filtered;
  }, [allWorkspaces, formData.roomId]);

  const createMutation = useCreateRentalApplication();
  const checkAvailabilityMutation = useCheckAvailability();
  const calculatePriceMutation = useCalculatePrice();

  // Фильтрация помещений
  const coworkingRooms = useMemo(() => {
    return rooms?.filter(r => r.isCoworking) || [];
  }, [rooms]);

  // Коворкинги с рабочими местами (для режима "Рабочее место")
  const coworkingRoomsWithWorkspaces = useMemo(() => {
    return rooms?.filter(r => r.isCoworking && (r._count?.workspaces ?? 0) > 0) || [];
  }, [rooms]);

  const regularRooms = useMemo(() =>
    rooms?.filter(r => !r.isCoworking && r.status === 'AVAILABLE') || [],
    [rooms]
  );

  // Помещения коворкинг без рабочих мест (для режима "Кабинет месяц")
  const coworkingRoomsWithoutWorkspaces = useMemo(() => {
    return rooms?.filter(r => r.isCoworking && (r._count?.workspaces ?? 0) === 0) || [];
  }, [rooms]);

  // Определяем является ли выбранное помещение коворкингом без мест
  const isCoworkingWithoutWorkspaces = useMemo(() => {
    if (!formData.roomId || !rooms) return false;
    const room = rooms.find(r => r.id === formData.roomId);
    return room?.isCoworking === true && (room._count?.workspaces ?? 0) === 0;
  }, [formData.roomId, rooms]);

  // Выбранное помещение
  const selectedRoom = useMemo(() => {
    if (!formData.roomId || !rooms) return null;
    return rooms.find(r => r.id === formData.roomId) || null;
  }, [formData.roomId, rooms]);

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
        (slot) => slot.workspaceId === workspaceId && slot.date.getTime() === date.getTime()
      );
      if (exists) {
        return prev.filter(
          (slot) => !(slot.workspaceId === workspaceId && slot.date.getTime() === date.getTime())
        );
      }
      return [...prev, { workspaceId, date }];
    });
  };

  // Синхронизация selectedSlots с formData
  useEffect(() => {
    if (formData.category === 'workspace' && formData.periodUnit === 'day') {
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
  }, [selectedSlots, formData.category, formData.periodUnit]);

  // Флаг для отслеживания первичной загрузки с предзаполненными данными
  const [isInitialPrefill, setIsInitialPrefill] = useState(
    () => !!(prefilledWorkspaceId && prefilledDate && prefilledCategory === 'workspace' && prefilledPeriodUnit === 'day')
  );

  // Сброс selectedSlots и конфликтов при смене категории/периода/коворкинга
  useEffect(() => {
    // Не сбрасываем если это первичная загрузка с предзаполненными данными
    if (isInitialPrefill) {
      return;
    }
    setSelectedSlots([]);
    setConflicts([]);
    setIgnoreConflicts(false);
  }, [formData.category, formData.periodUnit, formData.roomId, isInitialPrefill]);

  // Предзаполнение слота из URL параметров
  useEffect(() => {
    if (
      prefilledWorkspaceId &&
      prefilledDate &&
      prefilledCategory === 'workspace' &&
      prefilledPeriodUnit === 'day' &&
      selectedSlots.length === 0 &&
      isInitialPrefill
    ) {
      const date = new Date(prefilledDate);
      if (!isNaN(date.getTime())) {
        setSelectedSlots([{ workspaceId: prefilledWorkspaceId, date }]);
        // Сбрасываем флаг после успешного предзаполнения
        // Используем setTimeout чтобы сброс произошёл после синхронизации formData
        setTimeout(() => setIsInitialPrefill(false), 100);
      }
    }
  }, [prefilledWorkspaceId, prefilledDate, prefilledCategory, prefilledPeriodUnit, isInitialPrefill]);

  // Расчет цены при изменении параметров
  useEffect(() => {
    // Для HOURLY - рассчитываем на основе выбранных слотов
    if (formData.category === 'hourly' && formData.selectedHourlySlots.length > 0) {
      const room = rooms?.find(r => r.id === formData.roomId);
      if (!room) return;

      // Считаем общее количество минут
      const totalMinutes = formData.selectedHourlySlots.reduce((sum, slot) => {
        const startMin = slot.startHour * 60 + (slot.startMinute || 0);
        const endMin = slot.endHour * 60 + (slot.endMinute || 0);
        return sum + (endMin - startMin);
      }, 0);
      // Количество часов (может быть дробным, например 1.5)
      const quantityHours = totalMinutes / 60;

      setPriceCalculation({
        basePrice: Number(room.hourlyRate),
        quantity: quantityHours,
        priceUnit: 'HOUR',
        totalPrice: Number(room.hourlyRate) * quantityHours,
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
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
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
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      selectedDays: formData.selectedDays.length > 0 ? formData.selectedDays.map(d => format(d, 'yyyy-MM-dd')) : undefined,
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

  // Отправка формы
  const handleSubmit = async () => {
    // Для HOURLY - создаем одну заявку с массивом слотов
    if (formData.category === 'hourly') {
      if (formData.selectedHourlySlots.length === 0) {
        toast.error('Выберите хотя бы один часовой слот');
        return;
      }

      const room = rooms?.find(r => r.id === formData.roomId);
      if (!room) return;

      // Преобразуем слоты в формат API (с минутами)
      const hourlySlots = formData.selectedHourlySlots.map(slot => ({
        date: format(slot.date, 'yyyy-MM-dd'),
        startTime: `${slot.startHour.toString().padStart(2, '0')}:${(slot.startMinute || 0).toString().padStart(2, '0')}`,
        endTime: `${slot.endHour.toString().padStart(2, '0')}:${(slot.endMinute || 0).toString().padStart(2, '0')}`,
      }));

      // Считаем общее количество минут для quantity
      const totalMinutes = formData.selectedHourlySlots.reduce((sum, slot) => {
        const startMin = slot.startHour * 60 + (slot.startMinute || 0);
        const endMin = slot.endHour * 60 + (slot.endMinute || 0);
        return sum + (endMin - startMin);
      }, 0);
      const quantityHours = totalMinutes / 60;

      // Определяем диапазон дат
      const sortedDates = [...formData.selectedHourlySlots]
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const startDate = format(sortedDates[0].date, 'yyyy-MM-dd');
      const lastDate = sortedDates[sortedDates.length - 1].date;
      const endDate = sortedDates.length > 1 && lastDate.getTime() !== sortedDates[0].date.getTime()
        ? format(lastDate, 'yyyy-MM-dd')
        : undefined;

      try {
        await createMutation.mutateAsync({
          rentalType: 'HOURLY',
          roomId: formData.roomId!,
          clientId: formData.clientId!,
          periodType: 'HOURLY',
          startDate,
          endDate,
          hourlySlots,
          basePrice: Number(room.hourlyRate),
          adjustedPrice: formData.adjustedPrice || undefined,
          adjustmentReason: formData.adjustmentReason || undefined,
          priceUnit: 'HOUR',
          quantity: quantityHours,
          paymentType: formData.paymentType,
          eventType: formData.eventType || undefined,
          notes: formData.notes || undefined,
          ignoreConflicts,
        });
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const timeStr = hours > 0 ? `${hours}ч${mins > 0 ? ` ${mins}м` : ''}` : `${mins}м`;
        toast.success(`Создана заявка на ${timeStr} почасовой аренды`);
        router.push('/rentals');
      } catch (error: any) {
        // Обработка конфликтов
        if (error?.response?.status === 409) {
          const conflictData = error?.response?.data?.conflicts;
          if (conflictData && Array.isArray(conflictData)) {
            setConflicts(conflictData);
            toast.error('Обнаружены конфликты бронирования. Проверьте и подтвердите создание.');
          } else {
            toast.error(error?.response?.data?.message || 'Обнаружены конфликты бронирования');
          }
        } else {
          console.error('Failed to create hourly rental:', error);
          toast.error(error?.response?.data?.message || 'Ошибка при создании заявки');
        }
      }

      return;
    }

    const rentalType = getRentalType();
    const periodType = getPeriodType();

    if (!rentalType || !periodType || !formData.startDate || !formData.clientId) return;

    const dto = {
      rentalType,
      roomId: formData.roomId || undefined,
      workspaceIds: formData.workspaceIds.length > 0 ? formData.workspaceIds : undefined,
      clientId: formData.clientId,
      periodType,
      startDate: format(formData.startDate, 'yyyy-MM-dd'),
      endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : undefined,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      selectedDays: formData.selectedDays.length > 0 ? formData.selectedDays.map(d => format(d, 'yyyy-MM-dd')) : undefined,
      basePrice: formData.basePrice,
      adjustedPrice: formData.adjustedPrice || undefined,
      adjustmentReason: formData.adjustmentReason || undefined,
      priceUnit: priceCalculation?.priceUnit || 'DAY',
      quantity: priceCalculation?.quantity || 1,
      paymentType: formData.paymentType,
      eventType: formData.eventType || undefined,
      notes: formData.notes || undefined,
      ignoreConflicts,
    };

    createMutation.mutate(dto, {
      onSuccess: () => {
        router.push('/rentals');
      },
      onError: (error: any) => {
        // Обрабатываем конфликты
        if (error?.response?.status === 409) {
          const conflictData = error?.response?.data?.conflicts;
          if (conflictData && Array.isArray(conflictData)) {
            setConflicts(conflictData);
            toast.error('Обнаружены конфликты бронирования. Проверьте и подтвердите создание.');
          } else {
            toast.error(error?.response?.data?.message || 'Обнаружены конфликты бронирования');
          }
        }
      },
    });
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Новая заявка на аренду</h1>
            <p className="text-muted-foreground">Заполните данные для создания заявки</p>
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

          {/* Единый блок формы */}
          {formData.category && (formData.category === 'hourly' || formData.periodUnit) && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* === WORKSPACE === */}
                {formData.category === 'workspace' && formData.periodUnit && (
                  <>
                    {/* Выбор коворкинга и период на одной строке (только для месяца) */}
                    {formData.periodUnit === 'month' ? (
                      <div className="flex items-end gap-6 flex-wrap">
                        {/* Выбор коворкинга */}
                        <div className="flex-shrink-0 w-64">
                          <Label className="text-sm font-medium">Коворкинг</Label>
                          {isLoadingRooms ? (
                            <div className="flex items-center mt-1 h-10 px-3 border rounded-md">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                              <span className="text-sm text-muted-foreground">Загрузка...</span>
                            </div>
                          ) : coworkingRoomsWithWorkspaces.length === 0 ? (
                            <div className="mt-1 p-3 text-sm text-muted-foreground border rounded-md border-dashed">
                              Нет коворкингов с рабочими местами. <a href="/rentals/workspaces" className="text-primary hover:underline">Добавить рабочие места</a>
                            </div>
                          ) : (
                            <Select
                              value={formData.roomId || ''}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, workspaceIds: [] }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Выберите коворкинг" />
                              </SelectTrigger>
                              <SelectContent>
                                {coworkingRoomsWithWorkspaces.map((room) => (
                                  <SelectItem key={room.id} value={room.id}>
                                    {room.name}{room.number ? ` №${room.number}` : ''} ({room._count?.workspaces} мест)
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
                              className={cn(
                                "text-sm font-medium transition-colors border-b-2 pb-0.5",
                                formData.monthType === 'calendar'
                                  ? "text-primary border-dashed border-muted-foreground"
                                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-dashed hover:border-muted-foreground"
                              )}
                            >
                              Фиксированный месяц
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, monthType: 'sliding', startDate: null, endDate: null }))}
                              className={cn(
                                "text-sm font-medium transition-colors border-b-2 pb-0.5",
                                formData.monthType === 'sliding'
                                  ? "text-primary border-dashed border-muted-foreground"
                                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-dashed hover:border-muted-foreground"
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
                                  disabled={(date) => date < new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label className="text-sm font-medium">Коворкинг</Label>
                        {isLoadingRooms ? (
                          <div className="flex items-center mt-1 h-10 px-3 border rounded-md">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                            <span className="text-sm text-muted-foreground">Загрузка...</span>
                          </div>
                        ) : coworkingRoomsWithWorkspaces.length === 0 ? (
                          <div className="mt-1 p-3 text-sm text-muted-foreground border rounded-md border-dashed">
                            Нет коворкингов с рабочими местами. <a href="/rentals/workspaces" className="text-primary hover:underline">Добавить рабочие места</a>
                          </div>
                        ) : (
                          <Select
                            value={formData.roomId || ''}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, workspaceIds: [] }))}
                          >
                            <SelectTrigger className="mt-1 w-64">
                              <SelectValue placeholder="Выберите коворкинг" />
                            </SelectTrigger>
                            <SelectContent>
                              {coworkingRoomsWithWorkspaces.map((room) => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.name}{room.number ? ` №${room.number}` : ''} ({room._count?.workspaces} мест)
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
                            onSlotToggle={handleSlotToggle}
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

                    {/* Для периода "месяц" */}
                    {formData.periodUnit === 'month' && formData.roomId && (
                      <div className="space-y-4">
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
                                    onClick={() => {
                                      const startDate = startOfMonth(monthDate);
                                      const endDate = endOfMonth(monthDate);
                                      setFormData(prev => ({ ...prev, startDate, endDate }));
                                    }}
                                    className={cn("transition-colors", isSelected && "bg-primary text-primary-foreground")}
                                  >
                                    {format(monthDate, 'LLLL yyyy', { locale: ru })}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {formData.startDate && formData.endDate && (
                          <div className="p-3 bg-muted rounded-lg inline-block">
                            <span className="text-sm">
                              {format(formData.startDate, 'PPP', { locale: ru })} — {format(formData.endDate, 'PPP', { locale: ru })}
                            </span>
                          </div>
                        )}

                        {formData.startDate && formData.endDate && workspaces.length > 0 && (
                          <MonthlyWorkspaceAvailabilityGrid
                            workspaces={workspaces}
                            selectedWorkspaceIds={formData.workspaceIds}
                            onWorkspaceToggle={(workspaceId) => {
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
                        )}
                      </div>
                    )}

                    {/* Проверка доступности и конфликты */}
                    {formData.startDate && (
                      <>
                        <Button
                          variant="outline"
                          onClick={checkAvailability}
                          disabled={isCheckingAvailability}
                          size="sm"
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
                      </>
                    )}
                  </>
                )}

                {/* === HOURLY === */}
                {formData.category === 'hourly' && (
                  <>
                    <div className="w-64">
                      <Label>Помещение</Label>
                      <Select
                        value={formData.roomId || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, selectedHourlySlots: [] }))}
                      >
                        <SelectTrigger className="mt-1">
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
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-shrink-0">
                          <Label className="mb-2 block">Выберите дни</Label>
                          <Calendar
                            mode="multiple"
                            selected={formData.selectedDays}
                            onSelect={(dates) => {
                              setFormData(prev => ({
                                ...prev,
                                selectedDays: dates || [],
                                selectedHourlySlots: prev.selectedHourlySlots.filter(slot =>
                                  dates?.some(d => isSameDay(d, slot.date))
                                ),
                              }));
                            }}
                            locale={ru}
                            disabled={(date) => date < new Date()}
                            className="rounded-md border"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          {formData.selectedDays.length > 0 ? (
                            <>
                              <Label className="mb-2 block">Выберите временные слоты</Label>
                              <HourlyTimeSlotGrid
                                roomId={formData.roomId}
                                selectedDates={formData.selectedDays.sort((a, b) => a.getTime() - b.getTime())}
                                selectedSlots={formData.selectedHourlySlots}
                                onSlotToggle={(slot) => {
                                  setFormData(prev => {
                                    // Сравниваем по дате, часу начала и минутам начала
                                    const exists = prev.selectedHourlySlots.some(
                                      s => isSameDay(s.date, slot.date) &&
                                           s.startHour === slot.startHour &&
                                           (s.startMinute || 0) === (slot.startMinute || 0)
                                    );
                                    return {
                                      ...prev,
                                      selectedHourlySlots: exists
                                        ? prev.selectedHourlySlots.filter(
                                            s => !(isSameDay(s.date, slot.date) &&
                                                   s.startHour === slot.startHour &&
                                                   (s.startMinute || 0) === (slot.startMinute || 0))
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
                    )}
                  </>
                )}

                {/* === ROOM === */}
                {formData.category === 'room' && formData.periodUnit && (
                  <>
                    {/* Выбор кабинета */}
                    <div className="flex items-end gap-6 flex-wrap">
                      <div className="w-72">
                        <Label>Кабинет</Label>
                        <Select
                          value={formData.roomId || ''}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Выберите кабинет" />
                          </SelectTrigger>
                          <SelectContent>
                            {coworkingRooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}{room.number ? ` №${room.number}` : ''} — {formData.periodUnit === 'day' ? `${room.dailyRateCoworking || room.dailyRate} ₽/день` : `${room.monthlyRateCoworking} ₽/мес`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.periodUnit === 'month' && (
                        <div className="flex items-center gap-4 h-10">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, monthType: 'calendar', startDate: null, endDate: null }))}
                            className={cn(
                              "text-sm font-medium transition-colors border-b-2 pb-0.5",
                              formData.monthType === 'calendar'
                                ? "text-primary border-dashed border-muted-foreground"
                                : "text-muted-foreground border-transparent hover:text-foreground"
                            )}
                          >
                            Календарный месяц
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, monthType: 'sliding', startDate: null, endDate: null }))}
                            className={cn(
                              "text-sm font-medium transition-colors border-b-2 pb-0.5",
                              formData.monthType === 'sliding'
                                ? "text-primary border-dashed border-muted-foreground"
                                : "text-muted-foreground border-transparent hover:text-foreground"
                            )}
                          >
                            Скользящий (30 дней)
                          </button>
                        </div>
                      )}

                      {formData.periodUnit === 'month' && formData.monthType === 'sliding' && (
                        <div className="w-64">
                          <Label className="text-sm font-medium">Дата начала</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1 h-10",
                                  !formData.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.startDate ? format(formData.startDate, 'PPP', { locale: ru }) : 'Выберите дату'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.startDate || undefined}
                                onSelect={(date) => {
                                  if (!date) return;
                                  setFormData(prev => ({ ...prev, startDate: date, endDate: addMonths(date, 1) }));
                                }}
                                locale={ru}
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>

                    {/* День: календарь и сетка */}
                    {formData.periodUnit === 'day' && formData.roomId && (
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-shrink-0">
                          <Calendar
                            mode="multiple"
                            selected={formData.selectedDays}
                            onSelect={(dates) => {
                              setFormData(prev => ({
                                ...prev,
                                selectedDays: dates || [],
                                startDate: dates && dates.length > 0 ? dates.sort((a, b) => a.getTime() - b.getTime())[0] : null,
                                endDate: dates && dates.length > 1 ? dates.sort((a, b) => a.getTime() - b.getTime())[dates.length - 1] : null,
                              }));
                            }}
                            locale={ru}
                            disabled={(date) => date < new Date()}
                            className="rounded-md border"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <RoomDailyAvailabilityGrid
                            roomId={formData.roomId}
                            selectedDates={formData.selectedDays}
                            conflicts={conflicts}
                            isCheckingAvailability={isCheckingAvailability}
                            ignoreConflicts={ignoreConflicts}
                            onIgnoreConflictsChange={setIgnoreConflicts}
                            onCheckAvailability={checkAvailability}
                          />
                        </div>
                      </div>
                    )}

                    {/* Месяц: чипсы или период */}
                    {formData.periodUnit === 'month' && formData.roomId && (
                      <div className="space-y-4">
                        {formData.monthType === 'calendar' && (
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
                                  onClick={() => {
                                    const startDate = startOfMonth(monthDate);
                                    const endDate = endOfMonth(monthDate);
                                    setFormData(prev => ({ ...prev, startDate, endDate }));
                                  }}
                                  className={cn("transition-colors", isSelected && "bg-primary text-primary-foreground")}
                                >
                                  {format(monthDate, 'LLLL yyyy', { locale: ru })}
                                </Button>
                              );
                            })}
                          </div>
                        )}

                        {formData.startDate && formData.endDate && (
                          <div className="p-3 bg-muted rounded-lg inline-block">
                            <span className="text-sm">
                              {format(formData.startDate, 'PPP', { locale: ru })} — {format(formData.endDate, 'PPP', { locale: ru })}
                            </span>
                          </div>
                        )}

                        {isCoworkingWithoutWorkspaces && formData.startDate && formData.endDate && selectedRoom && (
                          <MonthlyRoomAvailabilityGrid
                            room={selectedRoom}
                            startDate={formData.startDate}
                            endDate={formData.endDate}
                          />
                        )}

                        {formData.startDate && (
                          <Button
                            variant="outline"
                            onClick={checkAvailability}
                            disabled={isCheckingAvailability}
                            size="sm"
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
                  </>
                )}

                {/* === КЛИЕНТ И ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ === */}
                <Separator />

                <div className="flex flex-wrap gap-6">
                  <div className="w-80">
                    <Label className="text-sm font-medium">Клиент *</Label>
                    <div className="mt-1">
                      <ClientSearch
                        value={formData.clientId || undefined}
                        onValueChange={(clientId) => {
                          setFormData(prev => ({ ...prev, clientId: clientId || null }));
                        }}
                        onClientSelect={(client) => {
                          setSelectedClient(client);
                        }}
                      />
                    </div>
                  </div>

                  {formData.category === 'hourly' && (
                    <div className="w-64">
                      <Label>Тип мероприятия</Label>
                      <Input
                        value={formData.eventType}
                        onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
                        placeholder="мастер-класс, репетиция..."
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-[200px]">
                    <Label>Примечания</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Дополнительная информация"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>

                {priceCalculation && formData.adjustedPrice !== null && (
                  <div className="w-80">
                    <Label>Причина корректировки</Label>
                    <Textarea
                      value={formData.adjustmentReason}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                      placeholder="Укажите причину"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Закрепленный футер со стоимостью */}
      <div className={cn(
        "fixed bottom-0 right-0 bg-background border-t shadow-lg z-50 transition-all duration-300",
        "left-0 md:left-20",
        !sidebarCollapsed && "md:left-64"
      )}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
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

            {/* Кнопка создания */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || createMutation.isPending || (conflicts.length > 0 && !ignoreConflicts)}
              size="lg"
              className="min-w-[200px]"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Создать заявку
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
