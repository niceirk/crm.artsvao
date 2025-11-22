'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  caption?: string;
  fileName?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  caption,
  fileName = 'image'
}: ImageViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Сброс состояния загрузки при открытии нового изображения
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [imageUrl, isOpen]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-gray-100/90 backdrop-blur-xl border-none">
        {/* Верхняя панель с кнопками */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-gray-200/80 to-transparent">
          <div className="flex-1">
            {caption && (
              <p className="text-gray-900 text-sm font-medium truncate pr-4">
                {caption}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-9 w-9 text-gray-700 hover:bg-gray-300/60"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 text-gray-700 hover:bg-gray-300/60"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Изображение */}
        <div className="flex items-center justify-center w-full h-full min-h-[300px] p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            </div>
          )}
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full max-h-[90vh] object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>

        {/* Caption внизу (если есть) */}
        {caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-200/80 to-transparent">
            <p className="text-gray-900 text-center text-sm">{caption}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
