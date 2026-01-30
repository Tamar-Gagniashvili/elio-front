import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

const CONTACT_FIELDS = [
  { key: 'name', label: 'Name', description: 'Contact name' },
  { key: 'email', label: 'Email', description: 'Email address' },
  { key: 'phone', label: 'Phone', description: 'Phone number' },
  { key: 'external_id', label: 'External ID', description: 'Your CRM or system ID' },
];

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportLeadsDialogProps) {
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();

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
    errors: string[];
  } | null>(null);

  // Reset state when dialog closes
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

  // Fetch routing rules and team members
  useEffect(() => {
    if (open && currentTenant) {
      fetchRoutingRules();
      fetchTeamMembers();
    }
  }, [open, currentTenant]);

  const fetchRoutingRules = async () => {
    if (!currentTenant) return;
    
    const { data } = await supabase
      .from('routing_rules')
      .select('id, name, description')
      .eq('tenant_id', currentTenant.id)
      .eq('is_active', true)
      .order('priority');
    
    setRoutingRules(data || []);
  };

  const fetchTeamMembers = async () => {
    if (!currentTenant) return;
    
    const { data: memberships } = await supabase
      .from('tenant_memberships')
      .select(`
        user_id,
        role,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('tenant_id', currentTenant.id)
      .eq('is_active', true)
      .eq('role', 'sales');

    const members: TeamMember[] = (memberships || []).map((m) => {
      const profile = m.profiles as unknown as { full_name?: string; email: string } | null;
      return {
        id: m.user_id,
        name: profile?.full_name || profile?.email || 'Unknown',
        role: m.role,
      };
    });
    
    setTeamMembers(members);
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
          title: 'Empty file',
          description: 'The file contains no data rows',
          variant: 'destructive',
        });
        return;
      }

      const headers = Object.keys(jsonData[0]);
      setColumns(headers);
      setPreviewRows(jsonData.slice(0, 5));
      setAllRows(jsonData);

      // Auto-map columns with similar names
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
        title: 'Error parsing file',
        description: 'Could not read the Excel file. Please check the format.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleImport = async () => {
    if (!currentTenant || !user) return;

    setIsImporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-leads', {
        body: {
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
        },
      });

      if (error) throw error;

      setImportResult(data.results);
      setStep(4); // Go to results step
      
      if (data.results.imported > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error.message || 'An error occurred during import',
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
            Import Offline Leads
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
                <h3 className="font-semibold mb-1">Upload Your File</h3>
                <p className="text-sm text-muted-foreground">
                  Upload an Excel (.xlsx, .xls) or CSV file with your leads
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
                        {allRows.length} rows found
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Upload className="h-10 w-10 mb-2" />
                      <span className="font-medium">Click to upload</span>
                      <span className="text-sm">or drag and drop</span>
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
                    Preview (first 5 rows)
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
                <h3 className="font-semibold mb-1">Map Your Columns</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us which columns contain contact information
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
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Don't map</SelectItem>
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
                  <p className="text-sm font-medium mb-2">Mapping Preview</p>
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
                <h3 className="font-semibold mb-1">Lead Assignment</h3>
                <p className="text-sm text-muted-foreground">
                  Choose how to assign these leads to your sales team
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
                    <p className="font-medium">Leave Unassigned</p>
                    <p className="text-sm text-muted-foreground">
                      Import contacts without assigning to anyone
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
                      <p className="font-medium">Round Robin</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Distribute leads evenly among selected team members
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
                      <p className="font-medium">Assign to One Person</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Assign all leads to a specific team member
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
                      <p className="font-medium">Use Routing Rule</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Apply an existing routing rule to assign and tag leads
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {/* Team Member Selection */}
              {(assignmentStrategy === 'round_robin' || assignmentStrategy === 'single_user') && (
                <div className="border rounded-lg p-4 space-y-3">
                  <Label>
                    {assignmentStrategy === 'round_robin' 
                      ? 'Select team members for round-robin' 
                      : 'Select team member'}
                  </Label>
                  {teamMembers.length === 0 ? (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>No sales team members found.</p>
                      <p className="text-xs">Add team members with the "sales" role in Settings to enable assignment.</p>
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
                      {selectedUserIds.length} member{selectedUserIds.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {/* Routing Rule Selection */}
              {assignmentStrategy === 'routing_rule' && (
                <div className="border rounded-lg p-4 space-y-3">
                  <Label>Select routing rule</Label>
                  {routingRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No routing rules found. Create rules in the Rules page first.
                    </p>
                  ) : (
                    <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a rule..." />
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
                <h3 className="font-semibold text-xl mb-1">Import Complete</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">Imported</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Skipped</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {importResult.errors.length}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">Errors</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                  <p className="font-medium text-red-700 dark:text-red-300 mb-2">Errors:</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>...and {importResult.errors.length - 10} more</li>
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
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceedFromStep(step)}
            >
              Next
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
                  Importing...
                </>
              ) : (
                <>
                  Import {allRows.length} Leads
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
