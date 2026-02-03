import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Bell, Clock, CalendarIcon, User, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Contact } from '@/lib/types';
import { NoteStatus, NOTE_COLORS, getColorClasses } from './types';

const REMINDER_OPTIONS_KEYS = [
  { value: 'none', key: 'notes.reminder.none' },
  { value: '5', key: 'notes.reminder.5min' },
  { value: '10', key: 'notes.reminder.10min' },
  { value: '30', key: 'notes.reminder.30min' },
  { value: '60', key: 'notes.reminder.1hour' },
  { value: '1440', key: 'notes.reminder.1day' },
  { value: 'custom', key: 'notes.reminder.custom' },
];

interface NoteFormCardProps {
  isEditing: boolean;
  newNote: string;
  setNewNote: (value: string) => void;
  selectedColor: string;
  setSelectedColor: (value: string) => void;
  selectedContactId: string;
  setSelectedContactId: (value: string) => void;
  selectedStatusId: string;
  setSelectedStatusId: (value: string) => void;
  reminderOption: string;
  setReminderOption: (value: string) => void;
  customDate: Date | undefined;
  setCustomDate: (value: Date | undefined) => void;
  customTime: string;
  setCustomTime: (value: string) => void;
  contacts: Contact[];
  statuses: NoteStatus[];
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function NoteFormCard({
  isEditing,
  newNote,
  setNewNote,
  selectedColor,
  setSelectedColor,
  selectedContactId,
  setSelectedContactId,
  selectedStatusId,
  setSelectedStatusId,
  reminderOption,
  setReminderOption,
  customDate,
  setCustomDate,
  customTime,
  setCustomTime,
  contacts,
  statuses,
  isSaving,
  onSave,
  onCancel,
}: NoteFormCardProps) {
  const { t } = useTranslation();
  const formColorClasses = getColorClasses(selectedColor);

  return (
    <div className={cn(
      "mb-6 p-6 rounded-lg border-2 border-dashed transition-colors",
      formColorClasses.bg,
      formColorClasses.border,
      "dark:bg-opacity-30"
    )}>
      <h3 className="font-semibold mb-4">{isEditing ? t('notes.editNote') : t('notes.newNote')}</h3>
    
      <Textarea
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        placeholder={t('notes.whatOnMind')}
        className="min-h-[100px] resize-none bg-transparent border-none focus-visible:ring-0 text-base mb-4"
        autoFocus
      />

      <div className="flex items-center gap-2 mb-4">
        <User className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedContactId} onValueChange={setSelectedContactId}>
          <SelectTrigger className="flex-1 bg-background/50">
            <SelectValue placeholder={t('notes.assignToContact')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('notes.personalNote')}</SelectItem>
            {contacts.map(contact => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name || contact.external_id || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status selector */}
      {statuses.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
            <SelectTrigger className="flex-1 bg-background/50">
              <SelectValue placeholder="Select column..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Color picker */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">{t('notes.color')}:</span>
        <div className="flex gap-1">
          {NOTE_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                color.bg,
                color.border,
                selectedColor === color.value && 'ring-2 ring-offset-1 ring-foreground scale-110'
              )}
            />
          ))}
        </div>
      </div>

      {/* Reminder */}
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <Select value={reminderOption} onValueChange={setReminderOption}>
          <SelectTrigger className="flex-1 bg-background/50">
            <SelectValue placeholder={t('notes.setReminder')} />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS_KEYS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom date/time picker */}
      {reminderOption === 'custom' && (
        <div className="flex flex-col gap-2 p-3 rounded-md bg-background/50 border border-border mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !customDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDate ? format(customDate, "PPP") : t('notes.reminder.pickDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDate}
                onSelect={setCustomDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="flex-1 bg-background"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onSave}
          disabled={!newNote.trim() || isSaving}
        >
          {isEditing ? t('common.update') : t('notes.pinIt')}
        </Button>
      </div>
    </div>
  );
}
