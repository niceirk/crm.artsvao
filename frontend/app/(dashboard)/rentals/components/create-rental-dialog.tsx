'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, addDays, addWeeks, addMonths, startOfMonth, endOfMonth, differenceInHours } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ClientSearch } from '@/components/clients/client-search';
import { useRooms } from '@/hooks/use-rooms';
import { useWorkspaces } from '@/hooks/use-workspaces';
import {
  useCreateRentalApplication,
  useCheckAvailability,
  useCalculatePrice,
} from '@/hooks/use-rental-applications';
import type { Client } from '@/lib/types/clients';
import type {
  RentalType,
  RentalPeriodType,
  PriceUnit,
  ConflictInfo,
} from '@/lib/types/rental-applications';

interface CreateRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'type' | 'object' | 'period' | 'price' | 'confirm';

const STEPS: WizardStep[] = ['type', 'object', 'period', 'price', 'confirm'];

const STEP_TITLES: Record<WizardStep, string> = {
  type: 'Тип аренды',
  object: 'Выбор объекта',
  period: 'Период аренды',
  price: 'Стоимость',
  confirm: 'Подтверждение',
};

type RentalCategory = 'hourly' | 'workspace' | 'room';

interface FormData {
  category: RentalCategory | null;
  periodUnit: 'day' | 'week' | 'month' | null;
  roomId: string | null;
  workspaceIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  selectedDays: Date[];
  monthType: 'calendar' | 'sliding';
  weekCount: number;
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
  monthType: 'calendar',
  weekCount: 1,
  basePrice: 0,
  adjustedPrice: null,
  adjustmentReason: '',
  paymentType: 'PREPAYMENT',
  clientId: null,
  notes: '',
  eventType: '',
};

export function CreateRentalDialog({ open, onOpenChange }: CreateRentalDialogProps) {
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [ignoreConflicts, setIgnoreConflicts] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState<{
    basePrice: number;
    quantity: number;
    priceUnit: PriceUnit;
    totalPrice: number;
  } | null>(null);

  const { data: rooms } = useRooms();
  const { data: workspaces } = useWorkspaces(formData.roomId || undefined);

  const createMutation = useCreateRentalApplication();
  const checkAvailabilityMutation = useCheckAvailability();
  const calculatePriceMutation = useCalculatePrice();

  // Фильтрация помещений
  const coworkingRooms = useMemo(() =>
    rooms?.filter(r => r.isCoworking) || [],
    [rooms]
  );

  const regularRooms = useMemo(() =>
    rooms?.filter(r => !r.isCoworking && r.status === 'AVAILABLE') || [],
    [rooms]
  );

  // Определение типа аренды на основе выбранных параметров
  const getRentalType = (): RentalType | null => {
    if (formData.category === 'hourly') return 'HOURLY';
    if (formData.category === 'workspace') {
      if (formData.periodUnit === 'day') return 'WORKSPACE_DAILY';
      if (formData.periodUnit === 'week') return 'WORKSPACE_WEEKLY';
      if (formData.periodUnit === 'month') return 'WORKSPACE_MONTHLY';
    }
    if (formData.category === 'room') {
      if (formData.periodUnit === 'day') return 'ROOM_DAILY';
      if (formData.periodUnit === 'week') return 'ROOM_WEEKLY';
      if (formData.periodUnit === 'month') return 'ROOM_MONTHLY';
    }
    return null;
  };

  // Определение типа периода
  const getPeriodType = (): RentalPeriodType | null => {
    if (formData.category === 'hourly') return 'HOURLY';
    if (formData.periodUnit === 'day') return 'SPECIFIC_DAYS';
    if (formData.periodUnit === 'week') return 'WEEKLY';
    if (formData.periodUnit === 'month') {
      return formData.monthType === 'calendar' ? 'CALENDAR_MONTH' : 'SLIDING_MONTH';
    }
    return null;
  };

  // Сброс формы при закрытии
  useEffect(() => {
    if (!open) {
      setStep('type');
      setFormData(initialFormData);
      setSelectedClient(null);
      setConflicts([]);
      setShowConflictWarning(false);
      setIgnoreConflicts(false);
      setPriceCalculation(null);
    }
  }, [open]);

  // Расчет цены при изменении параметров
  useEffect(() => {
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
    formData.monthType,
  ]);

  // Проверка доступности
  const checkAvailability = async () => {
    const rentalType = getRentalType();
    const periodType = getPeriodType();

    if (!rentalType || !periodType || !formData.startDate) return;

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

    checkAvailabilityMutation.mutate(dto, {
      onSuccess: (result) => {
        setConflicts(result.conflicts);
        if (!result.available) {
          setShowConflictWarning(true);
        }
      },
    });
  };

  // Навигация по шагам
  const currentStepIndex = STEPS.indexOf(step);
  const canGoBack = currentStepIndex > 0;
  const canGoNext = () => {
    switch (step) {
      case 'type':
        return formData.category !== null && (formData.category === 'hourly' || formData.periodUnit !== null);
      case 'object':
        if (formData.category === 'hourly') return !!formData.roomId;
        if (formData.category === 'workspace') return formData.workspaceIds.length > 0;
        if (formData.category === 'room') return !!formData.roomId;
        return false;
      case 'period':
        return !!formData.startDate;
      case 'price':
        return true;
      case 'confirm':
        return !!formData.clientId;
      default:
        return false;
    }
  };

  const goBack = () => {
    if (canGoBack) {
      setStep(STEPS[currentStepIndex - 1]);
    }
  };

  const goNext = () => {
    if (canGoNext()) {
      if (step === 'period') {
        checkAvailability();
      }
      setStep(STEPS[currentStepIndex + 1]);
    }
  };

  // Отправка формы
  const handleSubmit = async () => {
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
      startTime: formData.category === 'hourly' ? formData.startTime : undefined,
      endTime: formData.category === 'hourly' ? formData.endTime : undefined,
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
        onOpenChange(false);
      },
    });
  };

  // Рендер шагов
  const renderTypeStep = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Категория аренды</Label>
        <RadioGroup
          value={formData.category || ''}
          onValueChange={(value) => setFormData(prev => ({
            ...prev,
            category: value as RentalCategory,
            periodUnit: value === 'hourly' ? null : prev.periodUnit,
            roomId: null,
            workspaceIds: [],
          }))}
          className="mt-3 grid grid-cols-3 gap-4"
        >
          <Label
            htmlFor="hourly"
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
              formData.category === 'hourly' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="hourly" id="hourly" className="sr-only" />
            <span className="text-2xl mb-2">🕐</span>
            <span className="font-medium">Почасовая</span>
            <span className="text-xs text-muted-foreground text-center mt-1">Аренда зала на несколько часов</span>
          </Label>

          <Label
            htmlFor="workspace"
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
              formData.category === 'workspace' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="workspace" id="workspace" className="sr-only" />
            <span className="text-2xl mb-2">💼</span>
            <span className="font-medium">Рабочее место</span>
            <span className="text-xs text-muted-foreground text-center mt-1">Коворкинг - одно или несколько мест</span>
          </Label>

          <Label
            htmlFor="room"
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
              formData.category === 'room' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="room" id="room" className="sr-only" />
            <span className="text-2xl mb-2">🏢</span>
            <span className="font-medium">Кабинет</span>
            <span className="text-xs text-muted-foreground text-center mt-1">Аренда всего помещения</span>
          </Label>
        </RadioGroup>
      </div>

      {(formData.category === 'workspace' || formData.category === 'room') && (
        <div>
          <Label className="text-base font-medium">Период аренды</Label>
          <RadioGroup
            value={formData.periodUnit || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, periodUnit: value as 'day' | 'week' | 'month' }))}
            className="mt-3 grid grid-cols-3 gap-4"
          >
            <Label
              htmlFor="day"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                formData.periodUnit === 'day' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="day" id="day" className="sr-only" />
              <span className="font-medium">День</span>
              <span className="text-xs text-muted-foreground">Выбор конкретных дней</span>
            </Label>

            <Label
              htmlFor="week"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                formData.periodUnit === 'week' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="week" id="week" className="sr-only" />
              <span className="font-medium">Неделя</span>
              <span className="text-xs text-muted-foreground">Одна или несколько недель</span>
            </Label>

            <Label
              htmlFor="month"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                formData.periodUnit === 'month' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="month" id="month" className="sr-only" />
              <span className="font-medium">Месяц</span>
              <span className="text-xs text-muted-foreground">Календарный или скользящий</span>
            </Label>
          </RadioGroup>
        </div>
      )}
    </div>
  );

  const renderObjectStep = () => (
    <div className="space-y-6">
      {formData.category === 'hourly' && (
        <div>
          <Label className="text-base font-medium">Выберите помещение</Label>
          <Select
            value={formData.roomId || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
          >
            <SelectTrigger className="mt-2">
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
      )}

      {formData.category === 'workspace' && (
        <>
          <div>
            <Label className="text-base font-medium">Выберите коворкинг-помещение</Label>
            <Select
              value={formData.roomId || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value, workspaceIds: [] }))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Выберите помещение" />
              </SelectTrigger>
              <SelectContent>
                {coworkingRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}{room.number ? ` №${room.number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.roomId && workspaces && workspaces.length > 0 && (
            <div>
              <Label className="text-base font-medium">Выберите рабочие места</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {workspaces.map((ws) => (
                  <Label
                    key={ws.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      formData.workspaceIds.includes(ws.id) ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Checkbox
                      checked={formData.workspaceIds.includes(ws.id)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          workspaceIds: checked
                            ? [...prev.workspaceIds, ws.id]
                            : prev.workspaceIds.filter(id => id !== ws.id),
                        }));
                      }}
                    />
                    <div>
                      <div className="font-medium">{ws.name}{ws.number ? ` №${ws.number}` : ''}</div>
                      <div className="text-xs text-muted-foreground">
                        {formData.periodUnit === 'day' && `${ws.dailyRate} ₽/день`}
                        {formData.periodUnit === 'week' && `${ws.weeklyRate || ws.dailyRate * 7} ₽/неделя`}
                        {formData.periodUnit === 'month' && `${ws.monthlyRate} ₽/месяц`}
                      </div>
                    </div>
                  </Label>
                ))}
              </div>
              {formData.workspaceIds.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Выбрано: {formData.workspaceIds.length} рабочих мест
                </div>
              )}
            </div>
          )}
        </>
      )}

      {formData.category === 'room' && (
        <div>
          <Label className="text-base font-medium">Выберите кабинет для аренды</Label>
          <Select
            value={formData.roomId || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Выберите кабинет" />
            </SelectTrigger>
            <SelectContent>
              {coworkingRooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  <div className="flex justify-between items-center gap-4">
                    <span>{room.name}{room.number ? ` №${room.number}` : ''}</span>
                    <span className="text-muted-foreground">
                      {formData.periodUnit === 'day' && `${room.dailyRateCoworking || room.dailyRate} ₽/день`}
                      {formData.periodUnit === 'week' && `${room.weeklyRateCoworking || (room.dailyRateCoworking || room.dailyRate || 0) * 7} ₽/неделя`}
                      {formData.periodUnit === 'month' && `${room.monthlyRateCoworking} ₽/месяц`}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderPeriodStep = () => (
    <div className="space-y-6">
      {formData.category === 'hourly' && (
        <>
          <div>
            <Label className="text-base font-medium">Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
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
                  onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date || null }))}
                  locale={ru}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Время начала</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Время окончания</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>
        </>
      )}

      {formData.periodUnit === 'day' && (
        <div>
          <Label className="text-base font-medium">Выберите дни</Label>
          <p className="text-sm text-muted-foreground mb-2">Выберите один или несколько дней для аренды</p>
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
          {formData.selectedDays.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Выбрано дней: {formData.selectedDays.length}
            </div>
          )}
        </div>
      )}

      {formData.periodUnit === 'week' && (
        <>
          <div>
            <Label className="text-base font-medium">Дата начала</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !formData.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? format(formData.startDate, 'PPP', { locale: ru }) : 'Выберите дату начала'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.startDate || undefined}
                  onSelect={(date) => {
                    const endDate = date ? addWeeks(date, formData.weekCount) : null;
                    setFormData(prev => ({ ...prev, startDate: date || null, endDate }));
                  }}
                  locale={ru}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-base font-medium">Количество недель</Label>
            <Select
              value={formData.weekCount.toString()}
              onValueChange={(value) => {
                const weeks = parseInt(value);
                const endDate = formData.startDate ? addWeeks(formData.startDate, weeks) : null;
                setFormData(prev => ({ ...prev, weekCount: weeks, endDate }));
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'неделя' : n < 5 ? 'недели' : 'недель'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.startDate && formData.endDate && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Период аренды:</div>
              <div className="text-sm text-muted-foreground">
                {format(formData.startDate, 'PPP', { locale: ru })} — {format(formData.endDate, 'PPP', { locale: ru })}
              </div>
            </div>
          )}
        </>
      )}

      {formData.periodUnit === 'month' && (
        <>
          <div>
            <Label className="text-base font-medium">Тип месяца</Label>
            <RadioGroup
              value={formData.monthType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, monthType: value as 'calendar' | 'sliding' }))}
              className="mt-2 flex gap-4"
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
            <Label className="text-base font-medium">
              {formData.monthType === 'calendar' ? 'Выберите месяц' : 'Дата начала'}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
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
                  disabled={(date) => date < new Date()}
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
        </>
      )}
    </div>
  );

  const renderPriceStep = () => (
    <div className="space-y-6">
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
                <span>Игнорировать конфликты и продолжить</span>
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {priceCalculation && (
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex justify-between">
            <span>Базовая ставка:</span>
            <span className="font-medium">{priceCalculation.basePrice.toLocaleString('ru-RU')} ₽/{
              priceCalculation.priceUnit === 'HOUR' ? 'час' :
              priceCalculation.priceUnit === 'DAY' ? 'день' :
              priceCalculation.priceUnit === 'WEEK' ? 'неделя' : 'месяц'
            }</span>
          </div>
          <div className="flex justify-between">
            <span>Количество:</span>
            <span className="font-medium">{priceCalculation.quantity}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Итого:</span>
            <span>{priceCalculation.totalPrice.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      )}

      <div>
        <Label>Корректировка цены (опционально)</Label>
        <Input
          type="number"
          value={formData.adjustedPrice || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, adjustedPrice: e.target.value ? parseFloat(e.target.value) : null }))}
          placeholder="Введите скорректированную цену"
          className="mt-2"
        />
      </div>

      {formData.adjustedPrice && (
        <div>
          <Label>Причина корректировки</Label>
          <Textarea
            value={formData.adjustmentReason}
            onChange={(e) => setFormData(prev => ({ ...prev, adjustmentReason: e.target.value }))}
            placeholder="Укажите причину изменения цены"
            className="mt-2"
          />
        </div>
      )}

      {formData.adjustedPrice && priceCalculation && (
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex justify-between text-lg font-bold text-green-700">
            <span>Итого с корректировкой:</span>
            <span>{(formData.adjustedPrice * priceCalculation.quantity).toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderConfirmStep = () => {
    const selectedRoom = rooms?.find(r => r.id === formData.roomId);
    const selectedWorkspaces = workspaces?.filter(w => formData.workspaceIds.includes(w.id)) || [];

    return (
      <div className="space-y-6">
        {/* Сводка */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-medium">Сводка заявки</h4>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Тип аренды:</span>
            <span className="font-medium">
              {formData.category === 'hourly' && 'Почасовая'}
              {formData.category === 'workspace' && 'Рабочее место'}
              {formData.category === 'room' && 'Кабинет'}
              {formData.periodUnit && ` (${formData.periodUnit === 'day' ? 'по дням' : formData.periodUnit === 'week' ? 'по неделям' : 'по месяцам'})`}
            </span>

            <span className="text-muted-foreground">Объект:</span>
            <span className="font-medium">
              {formData.category === 'workspace' && selectedWorkspaces.length > 0
                ? selectedWorkspaces.map(w => w.name).join(', ')
                : selectedRoom?.name || '-'}
            </span>

            <span className="text-muted-foreground">Период:</span>
            <span className="font-medium">
              {formData.startDate && format(formData.startDate, 'PPP', { locale: ru })}
              {formData.endDate && ` — ${format(formData.endDate, 'PPP', { locale: ru })}`}
              {formData.category === 'hourly' && ` (${formData.startTime} - ${formData.endTime})`}
            </span>

            <span className="text-muted-foreground">Стоимость:</span>
            <span className="font-medium">
              {formData.adjustedPrice
                ? `${(formData.adjustedPrice * (priceCalculation?.quantity || 1)).toLocaleString('ru-RU')} ₽`
                : priceCalculation
                  ? `${priceCalculation.totalPrice.toLocaleString('ru-RU')} ₽`
                  : '-'}
            </span>
          </div>
        </div>

        {/* Выбор клиента */}
        <div>
          <Label className="text-base font-medium">Клиент</Label>
          <div className="mt-2">
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

        {/* Тип оплаты */}
        <div>
          <Label className="text-base font-medium">Тип оплаты</Label>
          <RadioGroup
            value={formData.paymentType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value as 'PREPAYMENT' | 'POSTPAYMENT' }))}
            className="mt-2 flex gap-4"
          >
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="PREPAYMENT" />
              <span>Предоплата</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="POSTPAYMENT" />
              <span>Постоплата</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Тип мероприятия */}
        {formData.category === 'hourly' && (
          <div>
            <Label>Тип мероприятия (опционально)</Label>
            <Input
              value={formData.eventType}
              onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
              placeholder="Например: мастер-класс, репетиция"
              className="mt-2"
            />
          </div>
        )}

        {/* Примечания */}
        <div>
          <Label>Примечания (опционально)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Дополнительная информация"
            className="mt-2"
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая заявка на аренду</DialogTitle>
          <DialogDescription>
            Шаг {currentStepIndex + 1} из {STEPS.length}: {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Индикатор прогресса */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  i < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : i === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-1",
                  i < currentStepIndex ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Контент шага */}
        <div className="py-4">
          {step === 'type' && renderTypeStep()}
          {step === 'object' && renderObjectStep()}
          {step === 'period' && renderPeriodStep()}
          {step === 'price' && renderPriceStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>

        {/* Кнопки навигации */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>

          {step !== 'confirm' ? (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Далее
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canGoNext() || createMutation.isPending}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
