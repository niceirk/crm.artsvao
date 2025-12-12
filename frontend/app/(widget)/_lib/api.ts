const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface WeeklyScheduleItem {
  day: number | string;
  startTime: string;
  endTime?: string;
}

export interface Group {
  id: string;
  name: string;
  weeklySchedule: WeeklyScheduleItem[] | null;
  duration: number | null;
  ageMin: number | null;
  ageMax: number | null;
  teacher: {
    firstName: string;
    lastName: string;
  };
  room: {
    name: string;
  } | null;
}

export interface Studio {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  category: string | null;
  groups: Group[];
}

export interface EventType {
  id: string;
  name: string;
  color: string | null;
}

export interface Room {
  name: string;
  number: string | null;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  fullDescription?: string | null;
  photoUrl: string | null;
  date: string;
  startTime: string;
  endTime: string;
  timepadLink: string | null;
  maxCapacity?: number | null;
  participants?: number | null;
  // Новые поля для виджета
  eventFormat?: string | null;
  ageRating?: string | null;
  ageDescription?: string | null;
  isForChildren?: boolean;
  room: Room | null;
  eventType: EventType | null;
}

export async function fetchStudios(studioId?: string): Promise<Studio[]> {
  const params = new URLSearchParams();
  if (studioId) params.set('studioId', studioId);

  const url = `${API_BASE_URL}/public/widget/studios${params.toString() ? `?${params}` : ''}`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch studios');
  }

  return res.json();
}

export interface EventsFilters {
  eventTypeId?: string;
  isForChildren?: boolean;
  hasAvailableSeats?: boolean;
  date?: string;
  limit?: number;
}

export async function fetchEventTypes(): Promise<EventType[]> {
  const res = await fetch(`${API_BASE_URL}/public/widget/event-types`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch event types');
  }

  return res.json();
}

export async function fetchEventDates(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/public/widget/event-dates`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch event dates');
  }

  return res.json();
}

export async function fetchEvents(filters?: EventsFilters): Promise<Event[]> {
  const params = new URLSearchParams();
  if (filters?.eventTypeId) params.set('eventTypeId', filters.eventTypeId);
  if (filters?.isForChildren !== undefined) params.set('isForChildren', String(filters.isForChildren));
  if (filters?.hasAvailableSeats !== undefined) params.set('hasAvailableSeats', String(filters.hasAvailableSeats));
  if (filters?.date) params.set('date', filters.date);
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `${API_BASE_URL}/public/widget/events${params.toString() ? `?${params}` : ''}`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }

  return res.json();
}

export async function fetchEvent(id: string): Promise<Event> {
  const res = await fetch(`${API_BASE_URL}/public/widget/events/${id}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch event');
  }

  return res.json();
}

export interface TicketAvailability {
  available: number;
  total: number;
  sold: number;
}

export async function fetchTicketsAvailability(
  eventIds: string[]
): Promise<Record<string, TicketAvailability | null>> {
  const res = await fetch(`${API_BASE_URL}/public/widget/tickets-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventIds }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch tickets availability');
  }

  return res.json();
}
