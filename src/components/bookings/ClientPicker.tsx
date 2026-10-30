import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface ClientPickerProps {
  contacts: Contact[];
  selected: Contact | null;
  onSelect: (contact: Contact | null) => void;
  /** Starts the "new client" form, prefilled with what was typed in the search; omit to hide it */
  onCreateNew?: (name: string) => void;
  /** Trigger text while nothing is selected */
  placeholder?: string;
  /** Label of the option that clears the selection */
  noneLabel?: string;
}

const contactLabel = (c: Contact, fallback: string) => c.name || c.phone || c.email || c.external_id || fallback;

/** Searchable client list (name, phone, email) with a "new client" shortcut */
export function ClientPicker({ contacts, selected, onSelect, onCreateNew, placeholder, noneLabel }: ClientPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <ChannelBadge channelType={selected.channel_type} size="xs" />
              <span className="truncate">{contactLabel(selected, t('common.unknown'))}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder || t('bookings.selectClient')}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder={t('bookings.searchClient')} />
          <CommandList>
            <CommandEmpty>{t('bookings.noClientsFound')}</CommandEmpty>
            <CommandGroup>
              {contacts.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  keywords={[c.name, c.phone, c.email].filter((k): k is string => !!k)}
                  onSelect={() => { onSelect(c); close(); }}
                  className="gap-2"
                >
                  <Avatar src={c.avatar_url} name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{contactLabel(c, t('common.unknown'))}</span>
                    {(c.phone || c.email) && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {[c.phone, c.email].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  <ChannelBadge channelType={c.channel_type} size="xs" />
                  <Check className={cn('h-4 w-4', selected?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
            {(onCreateNew || selected) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {onCreateNew && (
                    <CommandItem forceMount value="__new" onSelect={() => { onCreateNew(query.trim()); close(); }} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      {query.trim() ? t('bookings.newClientNamed', { name: query.trim() }) : t('bookings.newClient')}
                    </CommandItem>
                  )}
                  {selected && (
                    <CommandItem forceMount value="__none" onSelect={() => { onSelect(null); close(); }} className="gap-2 text-muted-foreground">
                      <X className="h-4 w-4" />
                      {noneLabel || t('bookings.noClient')}
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
