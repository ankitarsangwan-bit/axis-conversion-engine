// MIS Upload Types for file ingestion workflow

export interface RawMISRow {
  [key: string]: string | number | null;
}

export interface ParsedMISFile {
  fileName: string;
  fileSize: number;
  rows: RawMISRow[];
  columns: string[];
  parseDate: Date;
}

// Expected schema columns for Axis MIS
export const REQUIRED_COLUMNS = [
  'application_id',
  'blaze_output',
  'login_status',
  'final_status',
  'last_updated_date',
  'vkyc_status',
  'core_non_core',
] as const;

export const OPTIONAL_COLUMNS = [
  'vkyc_eligible',
  'state',
  'product',
] as const;

export type RequiredColumn = typeof REQUIRED_COLUMNS[number];
export type OptionalColumn = typeof OPTIONAL_COLUMNS[number];

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: RequiredColumn | OptionalColumn | null;
  isRequired: boolean;
  isMapped: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  row?: number;
  column?: string;
  message: string;
  type: 'missing_required' | 'invalid_format' | 'duplicate_id' | 'schema_mismatch';
}

export interface ValidationWarning {
  row?: number;
  column?: string;
  message: string;
  type: 'unmapped_column' | 'empty_value' | 'date_format';
}

// Preview changes after applying overwrite logic
export interface ChangePreview {
  newRecords: PreviewRecord[];
  updatedRecords: PreviewRecord[];
  unchangedCount: number;
  totalIncoming: number;
}

export interface PreviewRecord {
  application_id: string;
  changeType: 'new' | 'updated';
  oldValues?: Record<string, string | number | null>;
  newValues: Record<string, string | number | null>;
  changedFields?: string[];
}

// Upload state machine
export type UploadStep = 'upload' | 'mapping' | 'validation' | 'preview' | 'complete';

export interface UploadState {
  step: UploadStep;
  parsedFile: ParsedMISFile | null;
  columnMappings: ColumnMapping[];
  validationResult: ValidationResult | null;
  changePreview: ChangePreview | null;
  isProcessing: boolean;
  error: string | null;
}
