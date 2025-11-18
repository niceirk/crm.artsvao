'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Client } from '@/lib/types/clients';
import { EditableField } from '@/components/editable-field';
import { useUpdateClient } from '@/hooks/useClients';
import { formatPhoneNumber } from '@/lib/utils/phone';

interface ClientContactsCardProps {
  client: Client;
}

export function ClientContactsCard({ client }: ClientContactsCardProps) {
  const updateClient = useUpdateClient();

  const handleUpdate = async (field: string, value: string | null) => {
    await updateClient.mutateAsync({
      id: client.id,
      data: { [field]: value },
    });
  };

  const validateEmail = (email: string): boolean | string => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || 'Неверный формат email';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Контактная информация
        </CardTitle>
        <CardDescription>
          Способы связи с клиентом
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0 mt-1">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <EditableField
              label="Телефон"
              value={client.phone}
              type="tel"
              required
              formatDisplay={(value) => formatPhoneNumber(value) || '—'}
              onSave={(value) => handleUpdate('phone', value)}
            />
          </div>
          {client.phone && (
            <Button variant="outline" size="sm" asChild className="shrink-0 mt-6">
              <a href={`tel:${client.phone}`}>
                Позвонить
              </a>
            </Button>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0 mt-1">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <EditableField
              label="Email"
              value={client.email}
              type="email"
              allowNull
              validate={validateEmail}
              formatDisplay={(value) => value || '—'}
              onSave={(value) => handleUpdate('email', value)}
            />
          </div>
          {client.email && (
            <Button variant="outline" size="sm" asChild className="shrink-0 mt-6">
              <a href={`mailto:${client.email}`}>
                Написать
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
