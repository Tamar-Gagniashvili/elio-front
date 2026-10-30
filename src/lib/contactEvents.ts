import type { Contact } from '@/lib/types';

/** Fired on window when a contact's details change, so open panels can refresh in place */
export const CONTACT_UPDATED_EVENT = 'contact:updated';

export const notifyContactUpdated = (contact: Contact) =>
  window.dispatchEvent(new CustomEvent<Contact>(CONTACT_UPDATED_EVENT, { detail: contact }));

/** Saves phone/email on a contact and broadcasts the change */
export async function saveContactDetails(
  api: { put: <T>(endpoint: string, data: unknown) => Promise<T> },
  contactId: string,
  details: Partial<Pick<Contact, 'name' | 'phone' | 'email'>>
): Promise<Contact> {
  const updated = await api.put<Contact>(`/contacts/${contactId}`, details);
  notifyContactUpdated(updated);
  return updated;
}
