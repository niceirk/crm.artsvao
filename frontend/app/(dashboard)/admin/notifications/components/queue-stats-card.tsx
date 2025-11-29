'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQueueStats } from '@/hooks/use-notifications';
import { Loader2, Clock, Send, AlertCircle, XCircle } from 'lucide-react';

export function QueueStatsCard() {
  const { data: stats, isLoading } = useQueueStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Статус очереди</CardTitle>
        <CardDescription>Обновляется автоматически каждые 5 секунд</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Ожидает</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <div>
              <div className="text-2xl font-bold">{stats.processing}</div>
              <div className="text-xs text-muted-foreground">Отправляется</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <div className="text-xs text-muted-foreground">Отправлено</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Ошибок</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Rate Limits</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Telegram: {stats.rateLimits.telegramSentThisSecond}/30 в сек
            </Badge>
            <Badge variant="outline">
              Email: {stats.rateLimits.emailSentThisHour}/20 в час
            </Badge>
            <Badge variant="outline">
              Email сегодня: {stats.rateLimits.emailSentToday}/500
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
