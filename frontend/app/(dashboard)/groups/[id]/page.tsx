'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { groupsApi, type Group, type GroupMember, type UpdateGroupDto, type GroupMemberStatus, type GroupAvailability } from '@/lib/api/groups';
import { roomsApi, type Room } from '@/lib/api/rooms';
import { teachersApi, type Teacher } from '@/lib/api/teachers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Users, Calendar, Clock, Save, X, LayoutGrid, UserCircle, CalendarDays, Coins, UserPlus, UserMinus, UserCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatWeeklySchedule, DAY_LABELS, DAYS_OF_WEEK, formatTimeRange, type WeeklyScheduleItem } from '@/lib/types/weekly-schedule';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/lib/utils/toast';
import { WeeklyScheduleEditor } from '@/components/groups/weekly-schedule-editor';
import { AddMemberDialog } from '@/components/groups/add-member-dialog';
import { MonthPlanner } from '@/components/groups/month-planner';
import { GroupMonthlyCalendar } from '@/components/groups/group-monthly-calendar';
import { ScheduledMonthsTimeline } from '@/components/groups/scheduled-months-timeline';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';
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

const groupSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  maxParticipants: z.number().min(1, 'Минимум 1 участник').max(100, 'Максимум 100 участников'),
  singleSessionPrice: z.number().min(0, 'Цена не может быть отрицательной'),
  ageMin: z.number().min(0).max(100).optional().or(z.literal(0)),
  ageMax: z.number().min(0).max(100).optional().or(z.literal(0)),
  duration: z.number().min(15, 'Минимум 15 минут').max(480, 'Максимум 480 минут').optional().or(z.literal(0)),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  roomId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  isPaid: z.boolean(),
});

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { setCustomTitle } = useBreadcrumbs();

  const [group, setGroup] = useState<Group | null>(null);
  const [activeMembers, setActiveMembers] = useState<GroupMember[]>([]);
  const [waitlistMembers, setWaitlistMembers] = useState<GroupMember[]>([]);
  const [expelledMembers, setExpelledMembers] = useState<GroupMember[]>([]);
  const [availability, setAvailability] = useState<GroupAvailability | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberStatusTab, setMemberStatusTab] = useState('active');
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>();
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [memberToPromote, setMemberToPromote] = useState<GroupMember | null>(null);

  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      maxParticipants: 10,
      singleSessionPrice: 0,
      ageMin: 0,
      ageMax: 0,
      duration: 0,
      teacherId: '',
      roomId: '',
      status: 'ACTIVE',
      isPaid: false,
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [groupData, roomsData, teachersData] = await Promise.all([
        groupsApi.getGroup(groupId),
        roomsApi.getRooms(),
        teachersApi.getTeachers(),
      ]);
      setGroup(groupData);
      setRooms(roomsData);
      setTeachers(teachersData);

      // Устанавливаем название группы в хлебные крошки
      setCustomTitle(groupData.name);

      console.log('Loaded teachers:', teachersData);
      console.log('Group teacherId:', groupData.teacherId);

      // Обновляем форму с данными группы
      form.reset({
        name: groupData.name,
        maxParticipants: groupData.maxParticipants,
        singleSessionPrice: groupData.singleSessionPrice,
        ageMin: groupData.ageMin || 0,
        ageMax: groupData.ageMax || 0,
        duration: groupData.duration || 0,
        teacherId: groupData.teacherId,
        roomId: groupData.roomId || '',
        status: groupData.status,
        isPaid: groupData.isPaid ?? false,
      });

      // Загружаем участников и доступность
      await fetchMembers();
    } catch (error: any) {
      console.error('Failed to fetch group data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Неизвестная ошибка';
      const statusCode = error.response?.status;

      if (statusCode === 404) {
        setLoadError('Группа не найдена');
        toast.error('Группа не найдена');
      } else if (statusCode === 401 || statusCode === 403) {
        setLoadError('Нет доступа к данным группы');
        toast.error('Ошибка авторизации');
      } else {
        setLoadError(`Ошибка загрузки: ${errorMessage}`);
        toast.error('Не удалось загрузить данные группы');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const [active, waitlist, expelled, avail] = await Promise.all([
        groupsApi.getGroupMembers(groupId, 'ACTIVE'),
        groupsApi.getGroupMembers(groupId, 'WAITLIST'),
        groupsApi.getGroupMembers(groupId, 'EXPELLED'),
        groupsApi.checkGroupAvailability(groupId),
      ]);
      setActiveMembers(active);
      setWaitlistMembers(waitlist);
      setExpelledMembers(expelled);
      setAvailability(avail);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast.error('Не удалось загрузить участников');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  // Очищаем кастомный заголовок при размонтировании компонента
  useEffect(() => {
    return () => {
      setCustomTitle(null);
    };
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Сбрасываем форму к исходным значениям
    if (group) {
      form.reset({
        name: group.name,
        maxParticipants: group.maxParticipants,
        singleSessionPrice: group.singleSessionPrice,
        ageMin: group.ageMin || 0,
        ageMax: group.ageMax || 0,
        duration: group.duration || 0,
        teacherId: group.teacherId,
        roomId: group.roomId || '',
        status: group.status,
        isPaid: group.isPaid ?? false,
      });
    }
  };

  const handleSave = async (values: z.infer<typeof groupSchema>) => {
    try {
      setIsSaving(true);
      const updateData: UpdateGroupDto = {
        ...values,
        ageMin: values.ageMin || undefined,
        ageMax: values.ageMax || undefined,
        duration: values.duration || undefined,
        roomId: values.roomId || undefined,
      };

      const updatedGroup = await groupsApi.updateGroup(groupId, updateData);
      setGroup(updatedGroup);
      setIsEditing(false);
      toast.success('Группа успешно обновлена');
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Не удалось обновить группу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeeklyScheduleChange = (schedule: WeeklyScheduleItem[]) => {
    if (group) {
      setGroup({ ...group, weeklySchedule: schedule });
    }
  };

  const handleSaveWeeklySchedule = async () => {
    if (!group?.weeklySchedule) return;

    try {
      const updatedGroup = await groupsApi.updateWeeklySchedule(
        groupId,
        group.weeklySchedule
      );
      setGroup(updatedGroup);
      toast.success('Расписание успешно обновлено');
    } catch (error) {
      console.error('Failed to update weekly schedule:', error);
      toast.error('Не удалось обновить расписание');
      throw error; // чтобы WeeklyScheduleEditor мог обработать ошибку
    }
  };

  const handleMemberAdded = async () => {
    // Перезагружаем список участников и обновляем календарь
    await fetchMembers();
    setCalendarKey(prev => prev + 1);
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (!memberToRemove) {
      setMemberToRemove(member);
      return;
    }

    try {
      await groupsApi.removeGroupMember(member.id);
      toast.success('Участник отчислен из группы');
      setMemberToRemove(null);
      await fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Не удалось отчислить участника');
    }
  };

  const handlePromoteMember = async (member: GroupMember) => {
    if (!memberToPromote) {
      setMemberToPromote(member);
      return;
    }

    try {
      await groupsApi.updateMemberStatus(member.id, 'ACTIVE');
      toast.success('Участник переведен в активные');
      setMemberToPromote(null);
      await fetchMembers();
    } catch (error) {
      console.error('Failed to promote member:', error);
      toast.error('Не удалось перевести участника');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (loadError || !group) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Ошибка загрузки группы</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{loadError || 'Группа не найдена'}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => router.push('/admin/groups')} variant="outline">
                ← Вернуться к списку групп
              </Button>
              <Button onClick={() => fetchData()}>
                Попробовать снова
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Шапка группы */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/studios/${group.studioId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{group.name}</h1>
              <Badge variant={group.status === 'ACTIVE' ? 'default' : 'secondary'} className={group.status === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700' : ''}>
                {group.status === 'ACTIVE' ? 'Активна' : group.status === 'INACTIVE' ? 'Неактивна' : 'Архив'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {group.teacher && (
                <span>
                  Преподаватель: {group.teacher.firstName} {group.teacher.lastName}
                </span>
              )}
              {group.room && <span>Помещение: {group.room.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Badge variant={group.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {group.status === 'ACTIVE' ? 'Активна' : group.status === 'INACTIVE' ? 'Неактивна' : 'Архив'}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(handleSave)}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Карточка с редактированием основной информации */}
      {isEditing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Редактирование группы</CardTitle>
                <CardDescription>
                  Измените основную информацию о группе
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Статус *</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as any)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Активна</SelectItem>
                      <SelectItem value="INACTIVE">Неактивна</SelectItem>
                      <SelectItem value="ARCHIVED">Архив</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isPaid">Тип группы *</Label>
                  <Select
                    value={form.watch('isPaid') ? 'paid' : 'free'}
                    onValueChange={(value) => form.setValue('isPaid', value === 'paid')}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Платная</SelectItem>
                      <SelectItem value="free">Бесплатная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              {/* Название */}
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Название группы"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Макс. участников, Длительность, Возраст - 4 колонки */}
              <div className="grid gap-4 grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Макс. участников *</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    {...form.register('maxParticipants', { valueAsNumber: true })}
                    placeholder="10"
                  />
                  {form.formState.errors.maxParticipants && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.maxParticipants.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Длительность (мин)</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...form.register('duration', { valueAsNumber: true })}
                    placeholder="90"
                  />
                  {form.formState.errors.duration && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.duration.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageMin">Мин. возраст</Label>
                  <Input
                    id="ageMin"
                    type="number"
                    {...form.register('ageMin', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {form.formState.errors.ageMin && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.ageMin.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageMax">Макс. возраст</Label>
                  <Input
                    id="ageMax"
                    type="number"
                    {...form.register('ageMax', { valueAsNumber: true })}
                    placeholder="100"
                  />
                  {form.formState.errors.ageMax && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.ageMax.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Преподаватель и Помещение - 2 колонки */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teacherId">Преподаватель *</Label>
                  <Select
                    value={form.watch('teacherId') || undefined}
                    onValueChange={(value) => {
                      console.log('Selected teacher:', value);
                      form.setValue('teacherId', value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите преподавателя" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.length === 0 ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          Нет доступных преподавателей
                        </div>
                      ) : (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.lastName} {teacher.firstName} {teacher.middleName || ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.teacherId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.teacherId.message}
                    </p>
                  )}
                  {teachers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Доступно преподавателей: {teachers.length}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roomId">Помещение</Label>
                  <Select
                    value={form.watch('roomId') || 'none'}
                    onValueChange={(value) => form.setValue('roomId', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите помещение" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без помещения</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.number && `(${room.number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!form.watch('roomId') && (
                    <p className="text-sm text-amber-600">
                      Помещение обязательно для создания расписания
                    </p>
                  )}
                </div>
              </div>

              {/* Цена */}
              <div className="space-y-2">
                <Label htmlFor="singleSessionPrice">Цена занятия *</Label>
                <Input
                  id="singleSessionPrice"
                  type="number"
                  {...form.register('singleSessionPrice', { valueAsNumber: true })}
                  placeholder="1000"
                  className="max-w-xs"
                />
                {form.formState.errors.singleSessionPrice && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.singleSessionPrice.message}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Табы для организации контента */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Участники
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Расписание занятий
          </TabsTrigger>
        </TabsList>

        {/* Вкладка "Обзор" */}
        <TabsContent value="overview" className="space-y-6">
          {/* Информация о группе */}
          <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availability?.occupied || 0} / {availability?.total || group.maxParticipants}
            </div>
            <p className="text-xs text-muted-foreground">
              Свободно мест: {availability?.available || 0}
            </p>
            {waitlistMembers.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                В очереди: {waitlistMembers.length}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Цена занятия</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{group.singleSessionPrice} ₽</div>
            {group.ageMin && group.ageMax && (
              <p className="text-xs text-muted-foreground">
                Возраст: {group.ageMin}-{group.ageMax} лет
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Длительность</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {group.duration ? `${group.duration} мин` : 'Не задано'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Тип группы</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {group.isPaid ? 'Платная' : 'Бесплатная'}
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Блок расписания группы */}
          <Card>
            <CardHeader>
              <CardTitle>Расписание группы</CardTitle>
              <CardDescription>
                Настройте недельный шаблон и просмотрите запланированные месяцы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeline с запланированными месяцами */}
              <ScheduledMonthsTimeline
                groupId={groupId}
                onMonthClick={(month) => {
                  setSelectedMonth(month);
                  setActiveTab('schedule');
                }}
              />

              {/* Редактор недельного расписания */}
              <div className="border-t pt-6">
                <WeeklyScheduleEditor
                  value={group.weeklySchedule || []}
                  duration={group.duration}
                  onChange={handleWeeklyScheduleChange}
                  onSave={handleSaveWeeklySchedule}
                  rooms={rooms}
                  defaultRoomId={group.roomId}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка "Участники" */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Участники группы</CardTitle>
                  <CardDescription>
                    Управление участниками и листом ожидания
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить участника
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Под-вкладки для статусов участников */}
              <Tabs value={memberStatusTab} onValueChange={setMemberStatusTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Активные ({activeMembers.length})
                  </TabsTrigger>
                  <TabsTrigger value="waitlist" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Лист ожидания ({waitlistMembers.length})
                  </TabsTrigger>
                  <TabsTrigger value="expelled" className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4" />
                    Отчисленные ({expelledMembers.length})
                  </TabsTrigger>
                </TabsList>

                {/* Активные участники */}
                <TabsContent value="active" className="space-y-3">
                  {loadingMembers ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Загрузка...</p>
                    </div>
                  ) : activeMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Нет активных участников
                      </p>
                    </div>
                  ) : (
                    activeMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/clients/${member.clientId}`}
                              className="font-medium hover:underline"
                            >
                              {member.client.lastName} {member.client.firstName}{' '}
                              {member.client.middleName}
                            </Link>
                            {member.promotedFromWaitlistAt && (
                              <Badge variant="outline" className="text-xs">
                                Переведен из листа ожидания
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <div>{member.client.phone}</div>
                            <div className="text-xs mt-0.5">
                              Присоединился: {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            Активен
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Лист ожидания */}
                <TabsContent value="waitlist" className="space-y-3">
                  {loadingMembers ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Загрузка...</p>
                    </div>
                  ) : waitlistMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Лист ожидания пуст
                      </p>
                    </div>
                  ) : (
                    <>
                      {availability?.isFull && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg mb-4">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            Группа заполнена. Участники в листе ожидания будут автоматически переведены при освобождении мест.
                          </p>
                        </div>
                      )}
                      {waitlistMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                                {member.waitlistPosition}
                              </Badge>
                              <Link
                                href={`/clients/${member.clientId}`}
                                className="font-medium hover:underline"
                              >
                                {member.client.lastName} {member.client.firstName}{' '}
                                {member.client.middleName}
                              </Link>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <div>{member.client.phone}</div>
                              <div className="text-xs mt-0.5">
                                В очереди с: {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              В очереди
                            </Badge>
                            {!availability?.isFull && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteMember(member)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                В активные
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </TabsContent>

                {/* Отчисленные */}
                <TabsContent value="expelled" className="space-y-3">
                  {loadingMembers ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Загрузка...</p>
                    </div>
                  ) : expelledMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Нет отчисленных участников
                      </p>
                    </div>
                  ) : (
                    expelledMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                      >
                        <div className="flex-1">
                          <Link
                            href={`/clients/${member.clientId}`}
                            className="font-medium hover:underline"
                          >
                            {member.client.lastName} {member.client.firstName}{' '}
                            {member.client.middleName}
                          </Link>
                          <div className="text-sm text-muted-foreground mt-1">
                            <div>{member.client.phone}</div>
                            {member.leftAt && (
                              <div className="text-xs mt-0.5">
                                Отчислен: {new Date(member.leftAt).toLocaleDateString('ru-RU')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          Отчислен
                        </Badge>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка "Расписание занятий" */}
        <TabsContent value="schedule" className="space-y-6">
          {/* Планировщик месяца */}
          <MonthPlanner
            groupId={groupId}
            weeklySchedule={group.weeklySchedule}
            duration={group.duration}
            teacherId={group.teacherId}
            roomId={group.roomId}
            rooms={rooms}
            onSuccess={handleMemberAdded}
            initialMonth={selectedMonth}
          />

          {/* Календарь занятий группы */}
          <GroupMonthlyCalendar key={calendarKey} groupId={groupId} />
        </TabsContent>
      </Tabs>

      {/* Диалог добавления участника */}
      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        groupId={groupId}
        onSuccess={handleMemberAdded}
      />

      {/* Диалог подтверждения отчисления */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отчислить участника?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отчислить {memberToRemove?.client.firstName} {memberToRemove?.client.lastName} из группы?
              {memberToRemove?.status === 'ACTIVE' && waitlistMembers.length > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Первый участник из листа ожидания будет автоматически переведен в активные.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}>
              Отчислить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения перевода */}
      <AlertDialog open={!!memberToPromote} onOpenChange={(open) => !open && setMemberToPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Перевести участника в активные?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите перевести {memberToPromote?.client.firstName} {memberToPromote?.client.lastName} в активные участники группы?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToPromote(null)}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => memberToPromote && handlePromoteMember(memberToPromote)}>
              Перевести
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
