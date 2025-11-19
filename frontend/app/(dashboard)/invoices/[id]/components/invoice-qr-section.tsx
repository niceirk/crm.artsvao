'use client';

import { useState } from 'react';
import { QrCode, Download, Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { invoicesApi } from '@/lib/api/invoices';
import { toast } from 'sonner';

interface InvoiceQRSectionProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function InvoiceQRSection({ invoiceId, invoiceNumber }: InvoiceQRSectionProps) {
  const [qrData, setQrData] = useState<{
    dataUrl: string;
    paymentData: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQR = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoicesApi.getQRCodeDataURL(invoiceId);
      setQrData(data);
      toast.success('QR-код сгенерирован', {
        description: 'QR-код для оплаты успешно создан',
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Не удалось сгенерировать QR-код';
      setError(errorMessage);
      toast.error('Ошибка', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    try {
      const blob = await invoicesApi.getQRCodeBlob(invoiceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${invoiceNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('QR-код скачан', {
        description: `Файл qr-${invoiceNumber}.png сохранен`,
      });
    } catch (err) {
      toast.error('Ошибка', {
        description: 'Не удалось скачать QR-код',
      });
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const result = await invoicesApi.sendQREmail(invoiceId);
      if (result.success) {
        toast.success('Email отправлен', {
          description: result.message,
        });
      } else {
        toast.warning('Внимание', {
          description: result.message,
        });
      }
    } catch (err) {
      toast.error('Ошибка', {
        description: 'Не удалось отправить email',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR-код для оплаты
        </CardTitle>
        <CardDescription>
          Сгенерируйте QR-код для оплаты счета через мобильное приложение банка
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrData && !error && (
          <Button
            onClick={handleGenerateQR}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация QR-кода...
              </>
            ) : (
              <>
                <QrCode className="mr-2 h-4 w-4" />
                Сгенерировать QR-код
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="space-y-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={handleGenerateQR}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Попытка...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Попробовать снова
                </>
              )}
            </Button>
          </div>
        )}

        {qrData && (
          <div className="space-y-4">
            {/* QR Code Image */}
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img
                src={qrData.dataUrl}
                alt="QR код для оплаты"
                className="w-64 h-64"
              />
            </div>

            {/* Payment Info */}
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="font-medium">Информация о платеже:</div>
              <div className="grid gap-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Получатель:</span>
                  <span className="text-right font-medium">{qrData.paymentData.Name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Сумма:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    }).format(qrData.paymentData.Sum)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-muted-foreground">Назначение платежа:</span>
                  <span className="text-sm">{qrData.paymentData.Purpose}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleGenerateQR}
                disabled={isLoading}
                variant="secondary"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Обновление...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Обновить QR-код
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadQR}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Скачать PNG
                </Button>
                <Button
                  onClick={handleSendEmail}
                  variant="outline"
                  className="flex-1"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Отправить на email
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Как оплатить:</strong>
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>Откройте мобильное приложение вашего банка</li>
                  <li>Выберите "Оплата по QR-коду"</li>
                  <li>Наведите камеру на QR-код</li>
                  <li>Проверьте данные и подтвердите платеж</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
