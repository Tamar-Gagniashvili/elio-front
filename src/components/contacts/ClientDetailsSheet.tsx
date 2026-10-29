import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarPlus, Link2, Mail, MessageSquare, Phone, StickyNote, Tag, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EditableContactField } from '@/components/contacts/EditableContactField';
import { ContactBookings } from '@/components/bookings/ContactBookings';
import { BookingDialog } from '@/components/bookings/BookingDialog';
import { useDateLocale } from '@/components/bookings/calendarUtils';
import { ContactNotes } from '@/components/inbox/ContactNotes';
import { ManageStatusDialog } from '@/components/inbox/ManageStatusDialog';
import { ReassignDialog } from '@/components/inbox/ReassignDialog';
import { StatusPill } from '@/components/contacts/StatusPill';
import type { ClientRow } from '@/components/contacts/clientTypes';

interface ClientDetailsSheetProps {
  client: ClientRow | null;
  assigneeName?: string | null;
  canReassign: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

function SectionTitle({ icon: Icon, children, action }: { icon: typeof Tag; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {children}
      </div>
      {action}
    </div>
  );
}

export function ClientDetailsSheet({ client, assigneeName, canReassign, onOpenChange, onChanged }: ClientDetailsSheetProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const contact = client?.primary;

  return (
    <Sheet open={!!client} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        {client && contact && (
          <>
            <SheetHeader className="p-5 pb-4 text-left space-y-0">
              <div className="flex items-center gap-3 pr-6">
                <Avatar src={contact.avatar_url} name={client.displayName} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="text-lg font-semibold truncate">{client.displayName}</SheetTitle>
                  <SheetDescription className="text-xs">
                    {t('contacts.clientSince', { date: format(new Date(contact.created_at), 'd MMM yyyy', { locale }) })}
                  </SheetDescription>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={!client.conversationId}
                  onClick={() => navigate(`/inbox?conversation=${client.conversationId}`)}
                  title={client.conversationId ? undefined : t('contacts.noChatYet')}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('bookings.openChat')}
                </Button>
                <Button size="sm" className="gap-2" onClick={() => setBookingOpen(true)}>
                  <CalendarPlus className="h-4 w-4" />
                  {t('bookings.bookSession')}
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto border-t">
              <div className="p-5 space-y-6">
                <section>
                  <SectionTitle icon={Phone}>{t('contacts.contactInformation')}</SectionTitle>
                  <div className="-mx-2">
                    <EditableContactField contactId={contact.id} field="phone" value={contact.phone} icon={Phone} placeholder={t('contacts.addPhone')} />
                    <EditableContactField contactId={contact.id} field="email" value={contact.email} icon={Mail} placeholder={t('contacts.addEmail')} />
                  </div>
                </section>

                <section>
                  <SectionTitle
                    icon={Tag}
                    action={
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setStatusOpen(true)}>
                        {t('contacts.manage')}
                      </Button>
                    }
                  >
                    {t('contacts.statuses')}
                  </SectionTitle>
                  {client.statuses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {client.statuses.map((s) => <StatusPill key={s.id} status={s} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </section>

                <section>
                  <SectionTitle
                    icon={UserPlus}
                    action={canReassign && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setReassignOpen(true)}>
                        {t('contacts.reassign')}
                      </Button>
                    )}
                  >
                    {t('contacts.colAssigned')}
                  </SectionTitle>
                  <p className={cn('text-sm', !assigneeName && 'text-muted-foreground')}>
                    {assigneeName || t('contacts.unassigned')}
                  </p>
                </section>

                <ContactBookings contact={contact} conversationId={client.conversationId} className="" />

                {client.contacts.length > 1 && (
                  <section>
                    <SectionTitle icon={Link2}>{t('contacts.linkedProfiles')}</SectionTitle>
                    <div className="rounded-lg border divide-y">
                      {client.contacts.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                          <ChannelBadge channelType={c.channel_type} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{c.name || t('contacts.unknown')}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.phone || c.email || c.external_id || t('contacts.noContactInfoShort')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {currentTenant && (
                  <section>
                    <SectionTitle icon={StickyNote}>{t('contacts.notesAndReminders')}</SectionTitle>
                    <ContactNotes contactId={contact.id} tenantId={currentTenant.id} />
                  </section>
                )}
              </div>
            </div>

            <BookingDialog
              open={bookingOpen}
              onOpenChange={setBookingOpen}
              contact={contact}
              conversationId={client.conversationId}
              onSaved={onChanged}
            />
            <ManageStatusDialog
              open={statusOpen}
              onOpenChange={setStatusOpen}
              contact={contact}
              onStatusesChanged={onChanged}
            />
            <ReassignDialog
              open={reassignOpen}
              onOpenChange={setReassignOpen}
              contactId={contact.id}
              currentAssignee={client.assignedTo}
              onReassigned={onChanged}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
