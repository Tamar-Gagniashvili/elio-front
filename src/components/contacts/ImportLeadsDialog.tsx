import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Users,
  Zap,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

type AssignmentStrategy = 'none' | 'round_robin' | 'single_user' | 'routing_rule';

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportLeadsDialogProps) {
  const { t } = useTranslation();
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();

  const CONTACT_FIELDS = [
    { key: 'name', label: t('contacts.fieldName'), description: t('contacts.fieldNameDesc') },
    { key: 'email', label: t('contacts.fieldEmail'), description: t('contacts.fieldEmailDesc') },
    { key: 'phone', label: t('contacts.fieldPhone'), description: t('contacts.fieldPhoneDesc') },
    { key: 'external_id', label: t('contacts.fieldExternalId'), description: t('contacts.fieldExternalIdDesc') },
  ];

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const [assignmentStrategy, setAssignmentStrategy] = useState<AssignmentStrategy>('none');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    skippedLeads: Array<{
      row: number;
      name: string;
      reason: 'duplicate_email' | 'duplicate_phone' | 'no_identifying_info';
      value?: string;
    }>;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setColumns([]);
      setPreviewRows([]);
      setAllRows([]);
      setColumnMapping({});
      setAssignmentStrategy('none');
      setSelectedUserIds([]);
      setSelectedRuleId('');
      setImportResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && currentTenant) {
      fetchRoutingRules();
      fetchTeamMembers();
    }
  }, [open, currentTenant]);

  const fetchRoutingRules = async () => {
    if (!currentTenant) return;
    try {
      const data = await api.get<any[]>(`/routing-rules?tenant_id=${currentTenant.id}&is_active=1&sort_by=priority&sort_direction=asc`);
      setRoutingRules(data || []);
    } catch (error) {
      console.error('Error fetching routing rules:', error);
      setRoutingRules([]);
    }
  };

  const fetchTeamMembers = async () => {
    if (!currentTenant) return;
    try {
      const memberships = await api.get<any[]>(`/tenant-memberships?tenant_id=${currentTenant.id}&is_active=1&role[]=sales`);
      if (memberships && Array.isArray(memberships)) {
        const members: TeamMember[] = memberships.filter(m => m.profile).map((m) => ({
          id: m.user_id,
          name: m.profile.full_name || m.profile.email || 'Unknown',
          role: m.role,
        }));
        setTeamMembers(members);
      } else {
        setTeamMembers([]);
      }
    } catch (e) {
      console.error('Error fetching memberships:', e);
      setTeamMembers([]);
    }
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
        defval: '',
        raw: false,
      });

      if (jsonData.length === 0) {
        toast({
          title: t('contacts.emptyFile'),
          description: t('contacts.emptyFileDesc'),
          variant: 'destructive',
        });
        return;
      }

      const headers = Object.keys(jsonData[0]);
      setColumns(headers);
      setPreviewRows(jsonData.slice(0, 5));
      setAllRows(jsonData);

      const autoMapping: Record<string, string> = {};
      CONTACT_FIELDS.forEach((field) => {
        const match = headers.find(
          (h) => h.toLowerCase().includes(field.key) || 
                 field.key.includes(h.toLowerCase())
        );
        if (match) {
          autoMapping[field.key] = match;
        }
      });
      setColumnMapping(autoMapping);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: t('contacts.errorParsingFile'),
        description: t('contacts.errorParsingFileDesc'),
        variant: 'destructive',
      });
    }
  }, [toast, t]);

  const handleImport = async () => {
    if (!currentTenant || !user) return;

    setIsImporting(true);

    try {
      const data = await api.post('/functions/import-leads', {
        tenant_id: currentTenant.id,
        rows: allRows,
        column_mapping: columnMapping,
        assignment_strategy: assignmentStrategy,
        assignment_config: {
          user_ids: assignmentStrategy === 'round_robin' || assignmentStrategy === 'single_user' 
            ? selectedUserIds 
            : undefined,
          rule_id: assignmentStrategy === 'routing_rule' ? selectedRuleId : undefined,
        },
      });

      setImportResult(data.results);
      setStep(4);
      
      if (data.results.imported > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: t('contacts.importFailed'),
        description: error.message || t('errors.somethingWentWrong'),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const canProceedFromStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return file !== null && columns.length > 0;
      case 2:
        return Object.values(columnMapping).some(Boolean);
      case 3:
        if (assignmentStrategy === 'none') return true;
        if (assignmentStrategy === 'round_robin' || assignmentStrategy === 'single_user') {
          return selectedUserIds.length > 0;
        }
        if (assignmentStrategy === 'routing_rule') return !!selectedRuleId;
        return true;
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] !grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {t('contacts.importOfflineLeads')}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : step > s
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-1',
                    step > s ? 'bg-primary/50' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-220px)] min-h-0 px-1 pb-2">
          {/* Step 1: Upload File */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-semibold mb-1">{t('contacts.uploadYourFile')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('contacts.uploadFileDesc')}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <label
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                    file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  )}
                >
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {t('contacts.rowsFound', { count: allRows.length })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Upload className="h-10 w-10 mb-2" />
                      <span className="font-medium">{t('contacts.clickToUpload')}</span>
                      <span className="text-sm">{t('contacts.orDragDrop')}</span>
                    </div>
                  )}
                  <Input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {previewRows.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 text-sm font-medium">
                    {t('contacts.previewFirstRows')}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {columns.map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            {columns.map((col) => (
                              <td key={col} className="px-3 py-2 truncate max-w-[150px]">
                                {row[col] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-semibold mb-1">{t('contacts.mapYourColumns')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('contacts.mapColumnsDesc')}
                </p>
              </div>

              <div className="space-y-4">
                {CONTACT_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-4">
                    <div className="w-32">
                      <Label className="font-medium">{field.label}</Label>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    </div>
                    <Select
                      value={columnMapping[field.key] || ''}
                      onValueChange={(value) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.key]: value === '_none' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t('contacts.selectColumn')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t('contacts.dontMap')}</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {Object.values(columnMapping).some(Boolean) && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-medium mb-2">{t('contacts.mappingPreview')}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(columnMapping)
                      .filter(([, col]) => col)
                      .map(([field, col]) => (
                        <Badge key={field} variant="secondary">
                          {CONTACT_FIELDS.find((f) => f.key === field)?.label} ← {col}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Assignment */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-semibold mb-1">{t('contacts.leadAssignment')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('contacts.leadAssignmentDesc')}
                </p>
              </div>

              <RadioGroup
                value={assignmentStrategy}
                onValueChange={(v) => setAssignmentStrategy(v as AssignmentStrategy)}
                className="space-y-3"
              >
                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    assignmentStrategy === 'none' ? 'border-primary bg-primary/5' : 'border-muted'
                  )}
                >
                  <RadioGroupItem value="none" className="mt-0.5" />
                  <div>
                    <p className="font-medium">{t('contacts.leaveUnassigned')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('contacts.leaveUnassignedDesc')}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    assignmentStrategy === 'round_robin' ? 'border-primary bg-primary/5' : 'border-muted'
                  )}
                >
                  <RadioGroupItem value="round_robin" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <p className="font-medium">{t('contacts.roundRobin')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('contacts.roundRobinDesc')}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    assignmentStrategy === 'single_user' ? 'border-primary bg-primary/5' : 'border-muted'
                  )}
                >
                  <RadioGroupItem value="single_user" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      <p className="font-medium">{t('contacts.assignToOnePerson')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('contacts.assignToOnePersonDesc')}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    assignmentStrategy === 'routing_rule' ? 'border-primary bg-primary/5' : 'border-muted'
                  )}
                >
                  <RadioGroupItem value="routing_rule" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <p className="font-medium">{t('contacts.useRoutingRule')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('contacts.useRoutingRuleDesc')}
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {/* Team Member Selection */}
              {(assignmentStrategy === 'round_robin' || assignmentStrategy === 'single_user') && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>
                      {assignmentStrategy === 'round_robin' 
                        ? t('contacts.selectTeamMembersRR')
                        : t('contacts.selectTeamMember')}
                    </Label>
                    {assignmentStrategy === 'round_robin' && teamMembers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedUserIds.length === teamMembers.length) {
                            setSelectedUserIds([]);
                          } else {
                            setSelectedUserIds(teamMembers.map(m => m.id));
                          }
                        }}
                        className="text-xs h-7"
                      >
                        {selectedUserIds.length === teamMembers.length ? t('contacts.deselectAll') : t('contacts.selectAll')}
                      </Button>
                    )}
                  </div>
                  {teamMembers.length === 0 ? (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>{t('contacts.noSalesMembers')}</p>
                      <p className="text-xs">{t('contacts.noSalesMembersDesc')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => {
                            if (assignmentStrategy === 'single_user') {
                              setSelectedUserIds([member.id]);
                            } else {
                              toggleUserSelection(member.id);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            selectedUserIds.includes(member.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          )}
                        >
                          <Checkbox
                            checked={selectedUserIds.includes(member.id)}
                            onCheckedChange={() => {
                              if (assignmentStrategy === 'single_user') {
                                setSelectedUserIds([member.id]);
                              } else {
                                toggleUserSelection(member.id);
                              }
                            }}
                          />
                          <span className="flex-1">{member.name}</span>
                          <Badge variant="secondary">
                            {member.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedUserIds.length > 0 && assignmentStrategy === 'round_robin' && (
                    <p className="text-xs text-muted-foreground">
                      {t('contacts.membersSelected', { count: selectedUserIds.length })}
                    </p>
                  )}
                </div>
              )}

              {/* Routing Rule Selection */}
              {assignmentStrategy === 'routing_rule' && (
                <div className="border rounded-lg p-4 space-y-3">
                  <Label>{t('contacts.selectRoutingRule')}</Label>
                  {routingRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('contacts.noRoutingRules')}
                    </p>
                  ) : (
                    <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('contacts.chooseRule')} />
                      </SelectTrigger>
                      <SelectContent>
                        {routingRules.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id}>
                            <div>
                              <p>{rule.name}</p>
                              {rule.description && (
                                <p className="text-xs text-muted-foreground">
                                  {rule.description}
                                </p>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={cn(
                  'h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center',
                  importResult.imported > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                )}>
                  {importResult.imported > 0 ? (
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold text-xl mb-1">{t('contacts.importComplete')}</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">{t('contacts.importedCount')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('contacts.skippedCount')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {importResult.errors.length}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">{t('contacts.errorsCount')}</p>
                </div>
              </div>

              {importResult.skippedLeads && importResult.skippedLeads.length > 0 && (
                <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300 mb-3">
                    {t('contacts.skippedLeads')}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {importResult.skippedLeads.filter(s => s.reason === 'duplicate_email').length > 0 && (
                      <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                        {t('contacts.duplicateEmails', { count: importResult.skippedLeads.filter(s => s.reason === 'duplicate_email').length })}
                      </Badge>
                    )}
                    {importResult.skippedLeads.filter(s => s.reason === 'duplicate_phone').length > 0 && (
                      <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                        {t('contacts.duplicatePhones', { count: importResult.skippedLeads.filter(s => s.reason === 'duplicate_phone').length })}
                      </Badge>
                    )}
                    {importResult.skippedLeads.filter(s => s.reason === 'no_identifying_info').length > 0 && (
                      <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                        {t('contacts.missingInfo', { count: importResult.skippedLeads.filter(s => s.reason === 'no_identifying_info').length })}
                      </Badge>
                    )}
                  </div>
                  
                  <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1.5 max-h-[150px] overflow-y-auto">
                    {importResult.skippedLeads.slice(0, 15).map((lead, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-yellow-500 dark:text-yellow-500">•</span>
                        <span className="font-medium">{lead.name}</span>
                        <span className="text-yellow-500 dark:text-yellow-500">—</span>
                        <span className="text-xs">
                          {lead.reason === 'duplicate_email' && t('contacts.emailAlreadyExists', { value: lead.value })}
                          {lead.reason === 'duplicate_phone' && t('contacts.phoneAlreadyExists', { value: lead.value })}
                          {lead.reason === 'no_identifying_info' && t('contacts.noIdentifyingInfo')}
                        </span>
                      </li>
                    ))}
                    {importResult.skippedLeads.length > 15 && (
                      <li className="text-xs text-yellow-500 dark:text-yellow-500 pl-4">
                        {t('contacts.andMore', { count: importResult.skippedLeads.length - 15 })}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                  <p className="font-medium text-red-700 dark:text-red-300 mb-2">{t('contacts.errorsLabel')}</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>{t('contacts.andMore', { count: importResult.errors.length - 10 })}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1 || step === 4}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceedFromStep(step)}
            >
              {t('common.next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : step === 3 ? (
            <Button
              onClick={handleImport}
              disabled={!canProceedFromStep(3) || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('contacts.importing')}
                </>
              ) : (
                <>
                  {t('contacts.importNLeads', { count: allRows.length })}
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              {t('contacts.done')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}