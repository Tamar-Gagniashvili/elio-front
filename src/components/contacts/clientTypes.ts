import type { Booking, Contact } from '@/lib/types';

export interface LeadStatus {
  id: string;
  name: string;
  color: string;
}

/** One client in the list: a single contact, or contacts linked across channels */
export interface ClientRow {
  id: string;
  isLinked: boolean;
  displayName: string;
  contacts: Contact[];
  /** The contact that is edited, booked and opened (the most recently active one) */
  primary: Contact;
  lastActivity: string;
  statuses: LeadStatus[];
  /** Added by hand or imported, rather than from a chat */
  isOffline: boolean;
  conversationId: string | null;
  assignedTo: string | null;
  nextBooking: Booking | null;
}
