export enum GroupMemberStatus {
  ACTIVE = 'ACTIVE',
  WAITLIST = 'WAITLIST',
  EXPELLED = 'EXPELLED',
}

export interface GroupMember {
  id: string;
  groupId: string;
  clientId: string;
  status: GroupMemberStatus;
  joinedAt: string;
  leftAt?: string | null;
  waitlistPosition?: number | null;
  promotedFromWaitlistAt?: string | null;
  notes?: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phone: string;
    email?: string | null;
    photoUrl?: string | null;
    dateOfBirth?: string | null;
  };
}

export interface GroupAvailability {
  total: number;
  occupied: number;
  available: number;
  isFull: boolean;
}

export interface AddMemberResult {
  member: GroupMember;
  waitlisted: boolean;
  position?: number;
}

export interface GroupScheduleEntry {
  id: string;
  date: string;
  status: string;
}
