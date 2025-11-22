'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizontal, Loader2, Paperclip, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendImage?: (imageFile: File, caption?: string) => Promise<void>;
  onSendImages?: (imageFiles: File[], caption?: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ImagePreview {
  file: File;
  previewUrl: string;
}

export function ChatInput({
  onSend,
  onSendImage,
  onSendImages,
  placeholder = 'Введите сообщение...',
  disabled = false,
  className,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSending || disabled) {
      return;
    }

    // Если есть изображения, отправляем их
    if (images.length > 0) {
      setIsSending(true);
      try {
        const imageFiles = images.map((img) => img.file);

        // Если больше одного изображения и есть обработчик для множественных
        if (imageFiles.length > 1 && onSendImages) {
          await onSendImages(imageFiles, text.trim() || undefined);
        }
        // Если одно изображение и есть обработчик для одного
        else if (imageFiles.length === 1 && onSendImage) {
          await onSendImage(imageFiles[0], text.trim() || undefined);
        }
        // Фоллбэк на множественную отправку если есть только она
        else if (onSendImages) {
          await onSendImages(imageFiles, text.trim() || undefined);
        }

        setText('');
        clearImages();
      } catch (error) {
        console.error('Failed to send images:', error);
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Если есть текст, отправляем его
    if (text.trim()) {
      setIsSending(true);
      try {
        await onSend(text.trim());
        setText('');
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Отправка по Ctrl+Enter или Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const validateImageFile = (file: File): boolean => {
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return false;
    }

    // Проверка размера (макс 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Размер изображения не должен превышать 10MB');
      return false;
    }

    return true;
  };

  const addImages = (newFiles: File[]) => {
    const validFiles = newFiles.filter(validateImageFile);

    // Проверка максимального количества (10 изображений)
    if (images.length + validFiles.length > 10) {
      alert('Можно загрузить максимум 10 изображений');
      return;
    }

    // Создаем превью для новых файлов
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            file,
            previewUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
    // Сброс input для возможности повторного выбора тех же файлов
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Обработчики Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addImages(files);
    }
  };

  // Обработчик вставки из буфера (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles: File[] = [];

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      addImages(imageFiles);
    }
  };

  const canSend = (text.trim() || images.length > 0) && !isSending && !disabled;
  const hasImageSupport = onSendImage || onSendImages;

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2 w-full', className)}>
      {/* Галерея превью изображений */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image.previewUrl}
                alt={`Preview ${index + 1}`}
                className="rounded-lg h-20 w-20 object-cover border border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                onClick={() => removeImage(index)}
                disabled={isSending}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-b-lg text-center truncate">
                {(image.file.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          ))}
          {images.length > 1 && (
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearImages}
                disabled={isSending}
                className="h-20 text-xs text-muted-foreground hover:text-destructive"
              >
                Удалить все
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Область ввода с D&D */}
      <div
        className={cn(
          'relative w-full transition-colors',
          isDragging && 'bg-blue-50 dark:bg-blue-950/20'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Скрытый input для выбора файлов */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Контейнер с полем ввода и иконками */}
        <div className="relative flex items-center w-full bg-background border border-input rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          {/* Кнопка прикрепления файлов внутри поля */}
          {hasImageSupport && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSending}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 hover:opacity-70 transition-opacity disabled:opacity-50"
              title="Прикрепить изображения"
            >
              {images.length > 0 ? (
                <div className="flex flex-col items-center gap-0.5">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-[10px] font-semibold text-blue-600">{images.length}</span>
                </div>
              ) : (
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Текстовое поле с padding для иконок */}
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              images.length > 0
                ? 'Добавьте подпись (необязательно)...'
                : placeholder
            }
            disabled={disabled || isSending}
            className={cn(
              "flex-1 min-h-[56px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              hasImageSupport ? "pl-12 pr-14" : "px-4 pr-14"
            )}
          />

          {/* Кнопка отправки внутри поля */}
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 transition-all",
              canSend
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105"
                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            )}
            title="Отправить сообщение"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Подсказка о D&D */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-100/90 dark:bg-blue-950/90 rounded-lg border-2 border-dashed border-blue-500 pointer-events-none z-10">
            <div className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2">
              <ImageIcon className="h-6 w-6" />
              Отпустите для загрузки изображений
            </div>
          </div>
        )}
      </div>

      {/* Подсказка */}
      {images.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {images.length} {images.length === 1 ? 'изображение' : 'изображения'} выбрано
          {images.length < 10 && ` (максимум 10)`}
        </div>
      )}
    </form>
  );
}
