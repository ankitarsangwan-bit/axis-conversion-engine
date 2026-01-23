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
// 🔒 AUTHORITATIVE MANDATORY COLUMNS (as of final spec)
// If ANY of these are missing, NULL, or unparsable at row level,
// the row MUST fail ingestion and move to Conflicts with a clear reason.
// NO silent drops allowed.
export const REQUIRED_COLUMNS = [
  'application_id',       // Application no
  'application_date',     // DATE (2nd column) - MIS business date, frozen at first insert
  'blaze_output',         // BLAZE_OUTPUT
  'name',                 // Name
  'card_type',            // CARD TYPE
  'ipa_status',           // IPA Status
  'login_status',         // LOGIN STATUS
  'dip_ok_status',        // DIP OK STATUS
  'ad_status',            // A/D STATUS
  'bank_event_date',      // DATE (Date 2 - bank event date)
  'rejection_reason',     // Reason
  'final_status',         // FINAL STATUS
  'etcc',                 // ETCC
  'existing_c',           // EXISTING_C
  'mis_month',            // Month (present in MIS, not used for derivation)
  'vkyc_status',          // vkyc Status
  'vkyc_description',     // VKYC DESCR
  'core_non_core',        // Core/Noncore
] as const;

// Optional columns - may be NULL without failing the row
export const OPTIONAL_COLUMNS = [
  'pincode',              // PINCODE (may be NULL)
  'state',
  'product',
  'vkyc_eligible',
  'last_updated_date',    // For state machine date comparisons
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
  /** Total rows in file */
  totalRows: number;
  /** Rows that passed validation */
  validRows: number;
  /** Rows that failed validation */
  invalidRows: number;
  /** Summary of errors by column for quick display */
  errorSummary: ColumnErrorSummary[];
}

export interface ColumnErrorSummary {
  column: string;
  errorCount: number;
  errorType: 'missing' | 'blank' | 'invalid_format' | 'unmapped';
  sampleErrors: { row: number; value?: string }[];
  fixAction: 'remap' | 'reupload' | 'drop';
}

export interface ValidationError {
  row?: number;
  column?: string;
  message: string;
  value?: string; // The actual value that failed
  type: 'missing_required' | 'invalid_format' | 'duplicate_id' | 'schema_mismatch' | 'blank_value';
}

export interface ValidationWarning {
  row?: number;
  column?: string;
  message: string;
  type: 'unmapped_column' | 'empty_value' | 'date_format';
}

/** Rows marked for dropping during validation */
export interface DroppedRow {
  rowNumber: number;
  applicationId?: string;
  reason: string;
  columns: string[];
}

// Preview changes after applying overwrite logic
export interface ChangePreview {
  newRecords: PreviewRecord[];
  updatedRecords: PreviewRecord[];
  unchangedCount: number;
  totalIncoming: number;
  /** Records skipped due to state machine constraints (terminal state, backward transition, stale date) */
  skippedRecords?: SkippedRecord[];
}

export interface SkippedRecord {
  application_id: string;
  reason: string;
  /** Human-readable description of why update was rejected */
  details?: string;
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
  /** Rows explicitly marked for dropping (user confirmed) */
  droppedRows: Set<number>;
}
