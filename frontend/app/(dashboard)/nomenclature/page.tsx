'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Package,
  CreditCard,
  Banknote,
  Filter,
  Plus,
  Pencil,
  Power,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useNomenclature,
  useNomenclatureStats,
  useServiceCategories,
  useDeactivateSubscriptionType,
  useDeleteServiceCategory,
  useDeactivateIndependentService,
} from '@/hooks/use-nomenclature';
import type {
  NomenclatureItemType,
  NomenclatureFilterDto,
  NomenclatureItem,
  ServiceCategory,
} from '@/lib/types/nomenclature';
import { cn } from '@/lib/utils';
import { SubscriptionTypeDialog } from './components/subscription-type-dialog';
import { SingleSessionDialog } from './components/single-session-dialog';
import { ServiceCategoryDialog } from './components/service-category-dialog';
import { IndependentServiceDialog } from './components/independent-service-dialog';

const typeLabels: Record<NomenclatureItemType, string> = {
  SUBSCRIPTION: 'Абонемент',
  SINGLE_SESSION: 'Разовое',
  VISIT_PACK: 'Пакет разовых',
  INDEPENDENT_SERVICE: 'Услуга',
};

const typeIcons: Record<NomenclatureItemType, React.ReactNode> = {
  SUBSCRIPTION: <CreditCard className="h-4 w-4" />,
  SINGLE_SESSION: <Banknote className="h-4 w-4" />,
  VISIT_PACK: <Package className="h-4 w-4" />,
  INDEPENDENT_SERVICE: <Package className="h-4 w-4" />,
};

const typeBadgeVariants: Record<NomenclatureItemType, 'default' | 'secondary' | 'outline'> = {
  SUBSCRIPTION: 'default',
  SINGLE_SESSION: 'secondary',
  VISIT_PACK: 'outline',
  INDEPENDENT_SERVICE: 'outline',
};

type SortField = 'name' | 'type' | 'isActive';
type SortDirection = 'asc' | 'desc';

export default function NomenclaturePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NomenclatureItemType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState('nomenclature');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Dialogs state
  const [subscriptionTypeDialogOpen, setSubscriptionTypeDialogOpen] = useState(false);
  const [singleSessionDialogOpen, setSingleSessionDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [independentServiceDialogOpen, setIndependentServiceDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NomenclatureItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // Confirm dialogs
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [deleteCategoryConfirmOpen, setDeleteCategoryConfirmOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState<NomenclatureItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ServiceCategory | null>(null);

  // Mutations
  const deactivateMutation = useDeactivateSubscriptionType();
  const deleteCategoryMutation = useDeleteServiceCategory();
  const deactivateIndependentServiceMutation = useDeactivateIndependentService();

  const filter: NomenclatureFilterDto = useMemo(() => {
    const f: NomenclatureFilterDto = {};
    if (typeFilter !== 'all') f.type = typeFilter;
    if (categoryFilter !== 'all') f.categoryId = categoryFilter;
    if (search) f.search = search;
    if (activeFilter !== 'all') f.isActive = activeFilter === 'active';
    return f;
  }, [typeFilter, categoryFilter, search, activeFilter]);

  const { data: items, isLoading } = useNomenclature(filter);
  const { data: stats } = useNomenclatureStats();
  const { data: categories } = useServiceCategories();

  // Сортировка данных
  const sortedItems = useMemo(() => {
    if (!items) return [];

    return [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ru');
          break;
        case 'type':
          comparison = typeLabels[a.type].localeCompare(typeLabels[b.type], 'ru');
          break;
        case 'isActive':
          comparison = (a.isActive === b.isActive) ? 0 : (a.isActive ? -1 : 1);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatVat = (rate: number) => {
    if (rate === 0) return 'без НДС';
    return `НДС ${rate}%`;
  };

  // Handlers
  const handleEditItem = (item: NomenclatureItem) => {
    setEditingItem(item);
    if (item.type === 'SUBSCRIPTION') {
      setSubscriptionTypeDialogOpen(true);
    } else if (item.type === 'SINGLE_SESSION') {
      setSingleSessionDialogOpen(true);
    } else if (item.type === 'INDEPENDENT_SERVICE') {
      setIndependentServiceDialogOpen(true);
    }
  };

  const handleCreateSubscriptionType = () => {
    setEditingItem(null);
    setSubscriptionTypeDialogOpen(true);
  };

  const handleCreateIndependentService = () => {
    setEditingItem(null);
    setIndependentServiceDialogOpen(true);
  };

  const handleDeactivateItem = (item: NomenclatureItem) => {
    setItemToDeactivate(item);
    setDeactivateConfirmOpen(true);
  };

  const confirmDeactivate = async () => {
    if (itemToDeactivate) {
      if (itemToDeactivate.type === 'INDEPENDENT_SERVICE') {
        await deactivateIndependentServiceMutation.mutateAsync(itemToDeactivate.id);
      } else {
        await deactivateMutation.mutateAsync(itemToDeactivate.id);
      }
      setDeactivateConfirmOpen(false);
      setItemToDeactivate(null);
    }
  };

  const handleEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (category: ServiceCategory) => {
    setCategoryToDelete(category);
    setDeleteCategoryConfirmOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      setDeleteCategoryConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCreateSubscriptionType}>
              <CreditCard className="h-4 w-4 mr-2" />
              Тип абонемента
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateIndependentService}>
              <Package className="h-4 w-4 mr-2" />
              Прочая услуга
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateCategory}>
              <Filter className="h-4 w-4 mr-2" />
              Категория услуг
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="nomenclature">Номенклатура</TabsTrigger>
          <TabsTrigger value="categories">Категории услуг</TabsTrigger>
        </TabsList>

        {/* Вкладка Номенклатура */}
        <TabsContent value="nomenclature" className="space-y-4">
          {/* Фильтры */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="SUBSCRIPTION">Абонементы</SelectItem>
                <SelectItem value="SINGLE_SESSION">Разовые</SelectItem>
                <SelectItem value="INDEPENDENT_SERVICE">Услуги</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Таблица */}
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : !sortedItems?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Нет позиций по заданным фильтрам
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="hover:bg-transparent p-0 h-auto font-medium"
                      >
                        Название
                        <SortIcon field="name" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('type')}
                        className="hover:bg-transparent p-0 h-auto font-medium"
                      >
                        Тип
                        <SortIcon field="type" />
                      </Button>
                    </TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead>НДС</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            item.isActive ? "bg-green-500" : "bg-gray-400"
                          )} />
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariants[item.type]} className="gap-1">
                          {typeIcons[item.type]}
                          {typeLabels[item.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <span className="text-sm">{item.category.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm",
                          item.vatRate === 0 && "text-muted-foreground"
                        )}>
                          {formatVat(item.vatRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditItem(item)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            {(item.type === 'SUBSCRIPTION' || item.type === 'INDEPENDENT_SERVICE') && item.isActive && (
                              <DropdownMenuItem
                                onClick={() => handleDeactivateItem(item)}
                                className="text-destructive"
                              >
                                <Power className="h-4 w-4 mr-2" />
                                Деактивировать
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Вкладка Категории */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={handleCreateCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Создать категорию
            </Button>
          </div>
          {!categories?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Нет категорий услуг
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>НДС по умолчанию</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.description || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm",
                          category.defaultVatRate === 0 && "text-muted-foreground"
                        )}>
                          {formatVat(category.defaultVatRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCategory(category)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SubscriptionTypeDialog
        open={subscriptionTypeDialogOpen}
        onOpenChange={setSubscriptionTypeDialogOpen}
        editItem={editingItem}
      />

      <SingleSessionDialog
        open={singleSessionDialogOpen}
        onOpenChange={setSingleSessionDialogOpen}
        editItem={editingItem}
      />

      <ServiceCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        editCategory={editingCategory}
      />

      <IndependentServiceDialog
        open={independentServiceDialogOpen}
        onOpenChange={setIndependentServiceDialogOpen}
        editItem={editingItem}
      />

      {/* Confirm Deactivate Dialog */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Деактивировать {itemToDeactivate?.type === 'INDEPENDENT_SERVICE' ? 'услугу' : 'тип абонемента'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDeactivate?.type === 'INDEPENDENT_SERVICE'
                ? `Услуга "${itemToDeactivate?.name}" будет деактивирована. Она перестанет отображаться при продаже.`
                : `Тип абонемента "${itemToDeactivate?.name}" будет деактивирован. Он перестанет отображаться при продаже, но существующие абонементы останутся активными.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={deactivateMutation.isPending || deactivateIndependentServiceMutation.isPending}
            >
              {(deactivateMutation.isPending || deactivateIndependentServiceMutation.isPending) ? 'Деактивация...' : 'Деактивировать'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Category Dialog */}
      <AlertDialog open={deleteCategoryConfirmOpen} onOpenChange={setDeleteCategoryConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Категория "{categoryToDelete?.name}" будет удалена.
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
