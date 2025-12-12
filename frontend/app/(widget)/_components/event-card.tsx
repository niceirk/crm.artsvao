'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Baby, Calendar } from 'lucide-react';
import { Event } from '../_lib/api';
import { formatShortDate, formatTime } from '../_lib/utils';
import { TicketsBadge } from './tickets-badge';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/widget/event/${event.id}`}
      className="group flex flex-col h-full bg-white rounded-xl p-3 cursor-pointer"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
        {event.photoUrl ? (
          <Image
            src={event.photoUrl}
            alt={event.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Children badge */}
        {event.isForChildren && (
          <div className="absolute top-2 right-2 bg-pink-500 text-white p-1.5 rounded-full">
            <Baby className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Title with age rating */}
      <h3 className="font-semibold text-base line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {event.name}{event.ageRating && `, ${event.ageRating}`}
      </h3>

      {/* Date & time under photo */}
      <div className="text-sm text-muted-foreground">
        <span>{formatShortDate(event.date)}</span>
        <span className="mx-1.5">·</span>
        <span>{formatTime(event.startTime)}</span>
        <TicketsBadge
          eventId={event.id}
          maxCapacity={event.maxCapacity}
          participants={event.participants}
        />
      </div>
    </Link>
  );
}
