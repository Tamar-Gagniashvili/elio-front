import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ObjectType, ObjectTypeField, ObjectStatus } from '@/lib/objectTypes';
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
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportObjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectTypes: ObjectType[];
  fields: Record<string, ObjectTypeField[]>;
  statuses: Record<string, ObjectStatus[]>;
  onImportComplete: () => void;
}

type DeduplicationStrategy = 'skip' | 'update';

export function ImportObjectsDialog({
  open,
  onOpenChange,
  objectTypes,
  fields,
  statuses,
  onImportComplete,
}: ImportObjectsDialogProps) {
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [uniqueField, setUniqueField] = useState<string>('display_name');
  const [deduplicationStrategy, setDeduplicationStrategy] = useState<DeduplicationStrategy>('skip');
  const [defaultStatusId, setDefaultStatusId] = useState<string>('');

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const selectedType = objectTypes.find((t) => t.id === selectedTypeId);
  const typeFields = selectedTypeId ? fields[selectedTypeId] || [] : [];
  const typeStatuses = selectedTypeId ? statuses[selectedTypeId] || [] : [];

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setColumns([]);
      setPreviewRows([]);
      setAllRows([]);
      setSelectedTypeId('');
      setColumnMapping({});
      setUniqueField('display_name');
      setDeduplicationStrategy('skip');
      setDefaultStatusId('');
      setImportResult(null);
    }
  }, [open]);

  // Auto-select default status when type changes
  useEffect(() => {
    if (selectedTypeId && typeStatuses.length > 0) {
      const defaultStatus = typeStatuses.find((s) => s.is_default);
      setDefaultStatusId(defaultStatus?.id || typeStatuses[0].id);
    }
  }, [selectedTypeId, typeStatuses]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Error parsing file',
          description: 'Could not read the file. Please check the format.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Auto-map columns when type is selected
  useEffect(() => {
    if (selectedTypeId && columns.length > 0 && typeFields.length > 0) {
      const autoMapping: Record<string, string> = {};

      // Try to match display_name
      const nameMatch = columns.find(
        (h) =>
          h.toLowerCase().includes('name') ||
          h.toLowerCase().includes('title') ||
          h.toLowerCase().includes('display')
      );
      if (nameMatch) {
        autoMapping['display_name'] = nameMatch;
      }

      // Try to match each field
      typeFields.forEach((field) => {
        const match = columns.find(
          (h) =>
            h.toLowerCase() === field.name.toLowerCase() ||
            h.toLowerCase() === field.label.toLowerCase() ||
            h.toLowerCase().includes(field.name.toLowerCase())
        );
        if (match) {
          autoMapping[field.name] = match;
        }
      });

      setColumnMapping(autoMapping);
    }
  }, [selectedTypeId, columns, typeFields]);

  const handleImport = async () => {
    if (!currentTenant || !user || !selectedTypeId) return;

    setIsImporting(true);

    try {
      const data = await api.post<any>(`/functions/import-objects`, {
        object_type_id: selectedTypeId,
        rows: allRows,
        column_mapping: columnMapping,
        unique_field: uniqueField,
        deduplication_strategy: deduplicationStrategy,
        default_status_id: defaultStatusId,
      });

      setImportResult(data.results);
      setStep(4);

      if (data.results.imported > 0 || data.results.updated > 0) {
        onImportComplete();
      }
    } catch (error: unknown) {
      console.error('Import error:', error);
      const message = error instanceof Error ? error.message : 'An error occurred during import';
      toast({
        title: 'Import failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const canProceedFromStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return file !== null && columns.length > 0 && !!selectedTypeId;
      case 2:
        return !!columnMapping['display_name'];
      case 3:
        return true;
      default:
        return true;
    }
  };

  const getMappableFields = () => {
    const systemFields = [
      { name: 'display_name', label: 'Name *', description: 'Display name for the object' },
    ];
    const customFields = typeFields.map((f) => ({
      name: f.name,
      label: f.label + (f.is_required ? ' *' : ''),
      description: `${f.field_type} field`,
    }));
    return [...systemFields, ...customFields];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] !grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Objects
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
                  className={cn('w-12 h-0.5 mx-1', step > s ? 'bg-primary/50' : 'bg-muted')}
                />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-220px)] min-h-0 px-1 pb-2">
          {/* Step 1: Upload File & Select Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-semibold mb-1">Upload & Select Type</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a file and choose the object type to import
                </p>
              </div>

              {/* Object Type Selector */}
              <div className="space-y-2">
                <Label>Object Type</Label>
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select object type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {objectTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name_plural}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div className="flex items-center justify-center">
                <label
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                    file
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
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
                      <span className="text-sm">Excel or CSV file</span>
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
                          {columns.slice(0, 5).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-medium">
                              {col}
                            </th>
                          ))}
                          {columns.length > 5 && (
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                              +{columns.length - 5} more
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            {columns.slice(0, 5).map((col) => (
                              <td key={col} className="px-3 py-2 truncate max-w-[150px]">
                                {row[col] || '-'}
                              </td>
                            ))}
                            {columns.length > 5 && <td className="px-3 py-2">...</td>}
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
                <h3 className="font-semibold mb-1">Map Columns</h3>
                <p className="text-sm text-muted-foreground">
                  Map your file columns to {selectedType?.name} fields
                </p>
              </div>

              <div className="space-y-4">
                {getMappableFields().map((field) => (
                  <div key={field.name} className="flex items-center gap-4">
                    <div className="w-40">
                      <Label className="font-medium">{field.label}</Label>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    </div>
                    <Select
                      value={columnMapping[field.name] || ''}
                      onValueChange={(value) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.name]: value === '_none' ? '' : value,
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
                          {getMappableFields().find((f) => f.name === field)?.label || field} ←{' '}
                          {col}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Deduplication & Options */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-semibold mb-1">Import Options</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how duplicates are handled
                </p>
              </div>

              {/* Unique Field */}
              <div className="space-y-2">
                <Label>Unique Identifier Field</Label>
                <p className="text-xs text-muted-foreground">
                  Which field should be used to detect duplicates?
                </p>
                <Select value={uniqueField} onValueChange={setUniqueField}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display_name">Name</SelectItem>
                    {typeFields
                      .filter((f) => f.field_type === 'text' || f.field_type === 'number')
                      .map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deduplication Strategy */}
              <div className="space-y-3">
                <Label>When Duplicates Are Found</Label>
                <RadioGroup
                  value={deduplicationStrategy}
                  onValueChange={(v) => setDeduplicationStrategy(v as DeduplicationStrategy)}
                  className="space-y-2"
                >
                  <label
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      deduplicationStrategy === 'skip'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted'
                    )}
                  >
                    <RadioGroupItem value="skip" />
                    <div>
                      <p className="font-medium">Skip Existing</p>
                      <p className="text-sm text-muted-foreground">
                        Don't import rows that already exist
                      </p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      deduplicationStrategy === 'update'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted'
                    )}
                  >
                    <RadioGroupItem value="update" />
                    <div>
                      <p className="font-medium">Update Existing</p>
                      <p className="text-sm text-muted-foreground">
                        Update fields for existing objects
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Default Status */}
              {typeStatuses.length > 0 && (
                <div className="space-y-2">
                  <Label>Default Status for New Objects</Label>
                  <Select value={defaultStatusId} onValueChange={setDefaultStatusId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                `bg-${status.color}-500`
                              )}
                              style={{
                                backgroundColor:
                                  status.color === 'gray'
                                    ? '#6b7280'
                                    : status.color === 'red'
                                    ? '#ef4444'
                                    : status.color === 'orange'
                                    ? '#f97316'
                                    : status.color === 'yellow'
                                    ? '#eab308'
                                    : status.color === 'green'
                                    ? '#22c55e'
                                    : status.color === 'blue'
                                    ? '#3b82f6'
                                    : status.color === 'purple'
                                    ? '#a855f7'
                                    : status.color === 'pink'
                                    ? '#ec4899'
                                    : '#6b7280',
                              }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Summary */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-2">Import Summary</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {allRows.length} rows to process</li>
                  <li>• Type: {selectedType?.name_plural}</li>
                  <li>
                    • Dedup by:{' '}
                    {uniqueField === 'display_name'
                      ? 'Name'
                      : typeFields.find((f) => f.name === uniqueField)?.label || uniqueField}
                  </li>
                  <li>
                    • Strategy: {deduplicationStrategy === 'skip' ? 'Skip existing' : 'Update existing'}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div
                  className={cn(
                    'h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4',
                    importResult.imported > 0 || importResult.updated > 0
                      ? 'bg-green-100 text-green-600'
                      : 'bg-yellow-100 text-yellow-600'
                  )}
                >
                  {importResult.imported > 0 || importResult.updated > 0 ? (
                    <Check className="h-8 w-8" />
                  ) : (
                    <AlertCircle className="h-8 w-8" />
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-1">Import Complete</h3>
                <p className="text-sm text-muted-foreground">
                  Your {selectedType?.name_plural?.toLowerCase()} have been processed
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {importResult.skipped}
                  </div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/5">
                  <p className="text-sm font-medium text-destructive mb-2">
                    {importResult.errors.length} Errors
                  </p>
                  <ul className="text-sm text-destructive/80 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>• {err}</li>
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

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => (step === 1 || step === 4 ? onOpenChange(false) : setStep(step - 1))}
            disabled={isImporting}
          >
            {step === 1 || step === 4 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            )}
          </Button>

          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceedFromStep(step)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 3 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Import {allRows.length} {selectedType?.name_plural}
                </>
              )}
            </Button>
          )}

          {step === 4 && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
