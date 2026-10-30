import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MoreHorizontal, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { StatusIndicator } from '@/components/StatusIcon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusDialog, type StatusFormValues } from '@/components/statuses/StatusDialog';
import { statusHex } from '@/components/statuses/statusColors';

interface LeadStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon?: string | null;
  created_at: string;
  created_by: string | null;
}

const STATUS_COLORS = [
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200', dot: 'bg-blue-500', glow: 'shadow-blue-500/20' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-800 dark:text-green-200', dot: 'bg-green-500', glow: 'shadow-green-500/20' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-200', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/20' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-800 dark:text-red-200', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200', dot: 'bg-purple-500', glow: 'shadow-purple-500/20' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-800 dark:text-pink-200', dot: 'bg-pink-500', glow: 'shadow-pink-500/20' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-200', dot: 'bg-orange-500', glow: 'shadow-orange-500/20' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-800 dark:text-cyan-200', dot: 'bg-cyan-500', glow: 'shadow-cyan-500/20' },
];

export function getStatusColorClasses(color: string) {
  return STATUS_COLORS.find(c => c.name === color) || STATUS_COLORS[0];
}

export function getColorHex(colorName: string): string {
  return statusHex(colorName);
}

interface ContactStatusRow {
  status_id: string;
  contact_id: string;
}

export default function Statuses() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading, currentTenant, currentMembership } = useAuth();
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadStatus | null>(null);
  const [deleting, setDeleting] = useState<LeadStatus | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!currentTenant || !user) return;

    try {
      const data = await api.get<LeadStatus[]>(`/lead-statuses?tenant_id=${currentTenant.id}&sort_by=created_at&sort_direction=asc`);
      setStatuses(data || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast({ title: t('common.error'), description: t('statuses.failedToFetch'), variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // Sales users only count the clients assigned to them
    try {
      const params = new URLSearchParams({ tenant_id: currentTenant.id });
      if (!isAdmin) {
        const assigned = await api.get<{ contact_id: string }[]>(`/conversations?tenant_id=${currentTenant.id}&assigned_to=${user.id}`);
        const ids = [...new Set((assigned || []).map((c) => c.contact_id))];
        if (ids.length === 0) {
          setCounts({});
          setIsLoading(false);
          return;
        }
        ids.forEach((id) => params.append('contact_id[]', id));
      }
      const rows = await api.get<ContactStatusRow[]>(`/contact-statuses?${params.toString()}`);
      const next: Record<string, number> = {};
      (rows || []).forEach((row) => { next[row.status_id] = (next[row.status_id] || 0) + 1; });
      setCounts(next);
    } catch (error) {
      console.error('Error counting statuses:', error);
    }

    setIsLoading(false);
  }, [currentTenant, user, isAdmin, toast, t]);

  useEffect(() => {
    if (authLoading) return;
    if (user && !currentTenant) {
      navigate('/onboarding');
      return;
    }
    fetchStatuses();
  }, [authLoading, user, currentTenant, navigate, fetchStatuses]);

  // Stable, so the dialog doesn't reset while it is open
  const editingValues = useMemo<StatusFormValues | null>(
    () => (editing ? { name: editing.name, color: editing.color, icon: editing.icon || null } : null),
    [editing],
  );

  const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (status: LeadStatus) => {
    setEditing(status);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: StatusFormValues) => {
    try {
      if (editing) {
        await api.put(`/lead-statuses/${editing.id}`, values);
        toast({ title: t('statuses.statusUpdated') });
      } else {
        await api.post('/lead-statuses', { ...values, tenant_id: currentTenant?.id });
        toast({ title: t('statuses.statusCreated'), description: t('statuses.statusCreatedDesc', { name: values.name }) });
      }
      fetchStatuses();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: editing ? t('statuses.failedToUpdate') : t('statuses.failedToCreate'),
        variant: 'destructive',
      });
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const status = deleting;
    setDeleting(null);
    try {
      await api.delete(`/lead-statuses/${status.id}`);
      setStatuses((prev) => prev.filter((s) => s.id !== status.id));
      toast({ title: t('statuses.statusDeleted'), description: t('statuses.statusDeletedDesc', { name: status.name }) });
    } catch (error) {
      toast({ title: t('common.error'), description: t('statuses.failedToDelete'), variant: 'destructive' });
    }
  };

  const deletingCount = deleting ? counts[deleting.id] || 0 : 0;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t('statuses.title')}</h1>
              {!isLoading && (
                <span className="rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {statuses.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? t('statuses.subtitleAdmin') : t('statuses.subtitleUser')}
            </p>
          </div>
          {isAdmin && statuses.length > 0 && (
            <Button size="sm" className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" />
              {t('statuses.newStatus')}
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {authLoading || isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-1.5 w-full max-w-xs" />
                  </div>
                </div>
              ))}
            </div>
          ) : statuses.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={Tag}
                title={t('statuses.noStatusesYet')}
                description={isAdmin ? t('statuses.emptyAdmin') : t('statuses.emptyUser')}
                action={isAdmin ? { label: t('statuses.createFirstStatus'), onClick: openNew, icon: Plus } : undefined}
              />
            </div>
          ) : (
            <>
            <div className="flex items-center gap-2 border-b bg-muted/40 py-2.5 pl-4 pr-2 text-xs font-medium text-muted-foreground">
              <span className="flex-1 pl-12">{t('contacts.colStatus')}</span>
              <span className="w-24 sm:w-72 text-right">{t('contacts.clients')}</span>
              <span className="w-4" />
              {isAdmin && <span className="w-8" />}
            </div>
            <ul className="divide-y">
              {statuses.map((status) => {
                const hex = getColorHex(status.color);
                const count = counts[status.id] || 0;
                return (
                  <li key={status.id} className="group flex items-center gap-2 pr-2 transition-colors hover:bg-muted/40">
                    <button
                      onClick={() => navigate(`/contacts?status=${status.id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 text-left"
                      title={t('statuses.viewClients')}
                    >
                      <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${hex}1f` }}
                      >
                        <StatusIndicator icon={status.icon} color={hex} colorDotClass="h-2.5 w-2.5" iconClass="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 font-medium truncate">{status.name}</span>
                      {/* How common the status is, relative to the most used one */}
                      <span className="flex w-24 flex-shrink-0 items-center gap-3 sm:w-72">
                        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block">
                          <span
                            className="block h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: hex }}
                          />
                        </span>
                        <span className="ml-auto text-sm tabular-nums text-muted-foreground whitespace-nowrap sm:w-8 sm:text-right">
                          {count}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-8 w-8 flex-shrink-0 text-muted-foreground',
                              'sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100',
                            )}
                            aria-label={t('statuses.edit')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(status)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            {t('statuses.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleting(status)} className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            {t('statuses.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>
      </div>

      <StatusDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingValues}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('statuses.deleteConfirm', { name: deleting?.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCount > 0
                ? t('statuses.deleteConfirmDesc', { count: deletingCount })
                : t('statuses.deleteConfirmDescNone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('statuses.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
