'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { groupsApi, type Group, type GroupMember, type UpdateGroupDto } from '@/lib/api/groups';
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
import { ArrowLeft, Edit, Users, Calendar, Clock, Save, X, LayoutGrid, UserCircle, CalendarDays } from 'lucide-react';
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
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';

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
});

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { setCustomTitle } = useBreadcrumbs();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);

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
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [groupData, membersData, roomsData, teachersData] = await Promise.all([
        groupsApi.getGroup(groupId),
        groupsApi.getGroupMembers(groupId),
        roomsApi.getRooms(),
        teachersApi.getTeachers(),
      ]);
      setGroup(groupData);
      setMembers(membersData);
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
      });
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

  const handleMemberAdded = () => {
    // Перезагружаем список участников и обновляем календарь
    fetchData();
    setCalendarKey(prev => prev + 1);
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
            <h1 className="text-3xl font-bold">{group.name}</h1>
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
      <Tabs defaultValue="overview" className="space-y-6">
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
          <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.length} / {group.maxParticipants}
            </div>
            <p className="text-xs text-muted-foreground">
              Свободно мест: {group.maxParticipants - members.length}
            </p>
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
      </div>

          {/* Редактор недельного расписания */}
          <WeeklyScheduleEditor
            value={group.weeklySchedule || []}
            duration={group.duration}
            onChange={handleWeeklyScheduleChange}
            onSave={handleSaveWeeklySchedule}
          />
        </TabsContent>

        {/* Вкладка "Участники" */}
        <TabsContent value="members" className="space-y-6">
          {/* Участники группы */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Участники</CardTitle>
              <CardDescription>
                Клиенты с активными абонементами в группе
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Добавить участника
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              В группе пока нет участников
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
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
                      <div>
                        {member.subscriptionType.name} •{' '}
                        {member.subscriptionType.type === 'UNLIMITED'
                          ? 'Безлимит'
                          : `Осталось: ${member.remainingVisits || 0} посещений`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}
                    >
                      {member.status === 'ACTIVE' ? 'Активен' : member.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      До: {member.validMonth}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            onSuccess={handleMemberAdded}
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
    </div>
  );
}
