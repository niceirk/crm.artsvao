'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { studiosApi, type Studio, type StudioStats, type UpdateStudioDto } from '@/lib/api/studios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Edit,
  Users,
  CreditCard,
  Layers,
  Save,
  X,
  Plus,
  User,
  MapPin,
  Users2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { formatWeeklySchedule } from '@/lib/types/weekly-schedule';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/lib/utils/toast';
import { useBreadcrumbs } from '@/lib/contexts/breadcrumbs-context';
import { GroupDialog } from '../../admin/groups/group-dialog';
import { SubscriptionTypeDialog } from '../../admin/subscription-types/subscription-type-dialog';

const studioSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  type: z.enum(['GROUP', 'INDIVIDUAL', 'BOTH']),
  category: z.string().optional(),
  photoUrl: z.string().url('Неверный формат URL').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export default function StudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;
  const { setCustomTitle } = useBreadcrumbs();

  const [studio, setStudio] = useState<Studio | null>(null);
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof studioSchema>>({
    resolver: zodResolver(studioSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'GROUP',
      category: '',
      photoUrl: '',
      status: 'ACTIVE',
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [studioData, statsData, groupsData, typesData] = await Promise.all([
        studiosApi.getStudio(studioId),
        studiosApi.getStudioStats(studioId),
        studiosApi.getStudioGroups(studioId),
        studiosApi.getStudioSubscriptionTypes(studioId),
      ]);
      setStudio(studioData);
      setStats(statsData);
      setGroups(groupsData);
      setSubscriptionTypes(typesData);

      // Устанавливаем название студии в хлебные крошки
      setCustomTitle(studioData.name);

      // Обновляем форму с данными студии
      form.reset({
        name: studioData.name,
        description: studioData.description || '',
        type: studioData.type,
        category: studioData.category || '',
        photoUrl: studioData.photoUrl || '',
        status: studioData.status,
      });
    } catch (error: any) {
      console.error('Failed to fetch studio data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Неизвестная ошибка';
      const statusCode = error.response?.status;

      if (statusCode === 404) {
        setLoadError('Студия не найдена');
        toast.error('Студия не найдена');
      } else if (statusCode === 401 || statusCode === 403) {
        setLoadError('Нет доступа к данным студии');
        toast.error('Ошибка авторизации');
      } else {
        setLoadError(`Ошибка загрузки: ${errorMessage}`);
        toast.error('Не удалось загрузить данные студии');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studioId]);

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
    if (studio) {
      form.reset({
        name: studio.name,
        description: studio.description || '',
        type: studio.type,
        category: studio.category || '',
        photoUrl: studio.photoUrl || '',
        status: studio.status,
      });
    }
  };

  const handleSave = async (values: z.infer<typeof studioSchema>) => {
    try {
      setIsSaving(true);
      const updateData: UpdateStudioDto = {
        ...values,
        description: values.description || undefined,
        category: values.category || undefined,
        photoUrl: values.photoUrl || undefined,
      };

      const updatedStudio = await studiosApi.updateStudio(studioId, updateData);
      setStudio(updatedStudio);
      setIsEditing(false);
      toast.success('Студия успешно обновлена');
    } catch (error) {
      console.error('Failed to update studio:', error);
      toast.error('Не удалось обновить студию');
    } finally {
      setIsSaving(false);
    }
  };

  const refreshGroupsAndStats = async () => {
    try {
      const [groupsData, statsData] = await Promise.all([
        studiosApi.getStudioGroups(studioId),
        studiosApi.getStudioStats(studioId),
      ]);
      setGroups(groupsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to refresh groups for studio:', error);
      toast.error('Не удалось обновить группы студии');
    }
  };

  const refreshSubscriptionTypes = async () => {
    try {
      const typesData = await studiosApi.getStudioSubscriptionTypes(studioId);
      setSubscriptionTypes(typesData);
    } catch (error) {
      console.error('Failed to refresh subscription types for studio:', error);
      toast.error('Не удалось обновить типы абонементов');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (loadError || !studio) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Ошибка загрузки студии</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{loadError || 'Студия не найдена'}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => router.push('/admin/studios')} variant="outline">
                ← Вернуться к списку студий
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
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/studios')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{studio.name}</h1>
              <Badge
                className={
                  studio.status === 'ACTIVE'
                    ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
                    : 'bg-secondary text-secondary-foreground'
                }
              >
                {studio.status === 'ACTIVE' ? 'Активна' : 'Неактивна'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
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

      {/* Описание */}
      <Card>
        <CardHeader>
          <CardTitle>Описание</CardTitle>
        </CardHeader>
        <CardContent>
          {studio.description ? (
            <p className="text-sm text-muted-foreground">{studio.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Описание не заполнено</p>
          )}
        </CardContent>
      </Card>

      {/* Карточка с основной информацией о студии */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Редактирование студии</CardTitle>
            <CardDescription>
              Измените информацию о студии
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Название студии"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Тип *</Label>
                  <Select
                    value={form.watch('type')}
                    onValueChange={(value) => form.setValue('type', value as 'GROUP' | 'INDIVIDUAL' | 'BOTH')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GROUP">Групповые занятия</SelectItem>
                      <SelectItem value="INDIVIDUAL">Индивидуальные занятия</SelectItem>
                      <SelectItem value="BOTH">Оба типа</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Категория</Label>
                  <Input
                    id="category"
                    {...form.register('category')}
                    placeholder="Танцы, Спорт и т.д."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Статус *</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as 'ACTIVE' | 'INACTIVE')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Активна</SelectItem>
                      <SelectItem value="INACTIVE">Неактивна</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Описание студии"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="photoUrl">URL фотографии</Label>
                  <Input
                    id="photoUrl"
                    {...form.register('photoUrl')}
                    placeholder="https://example.com/photo.jpg"
                  />
                  {form.formState.errors.photoUrl && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.photoUrl.message}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Групп</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.groupsCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.participantsCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных абонементов</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptionsCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Группы студии */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Группы</CardTitle>
            <CardDescription>
              Список всех групп студии. Кликните на группу для просмотра деталей.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsGroupDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить группу
          </Button>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              В студии пока нет групп
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="block p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{group.name}</h3>
                        <Badge
                          className={
                            group.status === 'ACTIVE'
                              ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
                              : 'bg-secondary text-secondary-foreground'
                          }
                        >
                          {group.status === 'ACTIVE' ? 'Активна' : 'Неактивна'}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 truncate">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {group.teacher
                              ? `${group.teacher.firstName} ${group.teacher.lastName}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {group.room?.name || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Users2 className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {group._count?.subscriptions || 0} / {group.maxParticipants}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Layers className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {group._count?.schedules || 0}
                          </span>
                        </div>
                        {group.weeklySchedule && group.duration && (
                          <div className="col-span-2 flex items-center gap-1 truncate">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {formatWeeklySchedule(group.weeklySchedule, group.duration)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Типы абонементов */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Типы абонементов</CardTitle>
            <CardDescription>
              Доступные тарифы для групп студии
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsSubscriptionDialogOpen(true)}
            disabled={groups.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Новый тип
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptionTypes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Нет доступных абонементов
            </p>
          ) : (
            <div className="space-y-2">
              {subscriptionTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{type.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Группа: {type.group?.name}
                    </p>
                    {type.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{type.price} ₽</div>
                    <Badge variant="outline">
                      {type.type === 'UNLIMITED' ? 'Безлимит' : 'По занятиям'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GroupDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        defaultStudioId={studio.id}
        disableStudioSelect
        onSuccess={async () => {
          await refreshGroupsAndStats();
        }}
      />

      <SubscriptionTypeDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
        defaultGroupId={groups[0]?.id}
        studioId={studio.id}
        groupsList={groups}
        onSuccess={async () => {
          await refreshSubscriptionTypes();
        }}
      />
    </div>
  );
}
