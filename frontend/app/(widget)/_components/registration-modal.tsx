'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  timepadLink: string;
}

const BOT_USERNAME = 'artsvao_bot';

export function RegistrationModal({
  open,
  onOpenChange,
  eventId,
  eventName,
  timepadLink,
}: RegistrationModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Проверяем, мобильное ли устройство
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=event_${eventId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Регистрация на мероприятие</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Быстрая регистрация через Telegram */}
          <div className="space-y-3">
            <div className="text-center">
              <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#0088cc]" />
                Быстрая регистрация
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Для клиентов artsvao.ru
              </p>
            </div>

            {isMobile ? (
              // На мобильных показываем кнопку
              <Button
                className="w-full bg-[#0088cc] hover:bg-[#0077b5]"
                size="lg"
                asChild
              >
                <a href={telegramDeepLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Открыть в Telegram
                </a>
              </Button>
            ) : (
              // На десктопе показываем QR код
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={telegramDeepLink}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Отсканируйте QR-код камерой телефона
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={telegramDeepLink} target="_blank" rel="noopener noreferrer">
                    Или откройте в браузере
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Бот найдет вас по номеру телефона и поможет быстро зарегистрироваться
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">или</span>
            </div>
          </div>

          {/* Регистрация через Timepad */}
          <div className="space-y-3">
            <div className="text-center">
              <h3 className="font-semibold">Через Timepad</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Стандартная регистрация на платформе
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              asChild
            >
              <a href={timepadLink} target="_blank" rel="noopener noreferrer">
                Перейти на Timepad
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
