'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Client } from '@/lib/types/clients';

interface ClientContactsCardProps {
  client: Client;
}

export function ClientContactsCard({ client }: ClientContactsCardProps) {
  const hasContacts = client.email || client.address;

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
      <CardContent>
        {!hasContacts ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Контактная информация не указана
          </p>
        ) : (
          <div className="space-y-4">
            {client.phone && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <dt className="text-xs text-muted-foreground">Телефон</dt>
                  <dd className="text-sm font-medium">
                    <a
                      href={`tel:${client.phone}`}
                      className="hover:underline"
                    >
                      {client.phone}
                    </a>
                  </dd>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${client.phone}`}>
                    Позвонить
                  </a>
                </Button>
              </div>
            )}

            {client.email && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium">
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:underline"
                    >
                      {client.email}
                    </a>
                  </dd>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${client.email}`}>
                    Написать
                  </a>
                </Button>
              </div>
            )}

            {client.address && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <dt className="text-xs text-muted-foreground">Адрес</dt>
                  <dd className="text-sm font-medium">{client.address}</dd>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
