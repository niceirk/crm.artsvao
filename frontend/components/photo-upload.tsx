'use client';

import { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  photoUrl?: string | null;
  fallback?: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

export function PhotoUpload({
  photoUrl,
  fallback = '',
  onUpload,
  onDelete,
  size = 'lg',
  className,
  disabled = false,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Недопустимый формат файла. Разрешены: JPEG, PNG, GIF, WEBP');
      return;
    }

    // Проверка размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 5MB');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success('Фото успешно загружено');
    } catch (error) {
      toast.error('Ошибка при загрузке фото');
    } finally {
      setIsUploading(false);
      // Очищаем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success('Фото удалено');
    } catch (error) {
      toast.error('Ошибка при удалении фото');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = isUploading || isDeleting;

  return (
    <div className={cn('relative group', className)}>
      <Avatar className={cn(sizeClasses[size], 'border-2 border-muted')}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full w-full bg-muted">
            <Loader2 className={cn(iconSizes[size], 'animate-spin text-muted-foreground')} />
          </div>
        ) : (
          <>
            <AvatarImage src={photoUrl || undefined} alt="Фото" />
            <AvatarFallback className="text-lg font-medium">
              {fallback ? getInitials(fallback) : <User className={iconSizes[size]} />}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Оверлей с кнопками при наведении */}
      {!disabled && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>

          {photoUrl && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить фото?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы уверены, что хотите удалить фото? Это действие нельзя отменить.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isLoading}
      />
    </div>
  );
}
