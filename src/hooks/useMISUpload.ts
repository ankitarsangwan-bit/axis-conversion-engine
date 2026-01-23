import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadState,
  UploadStep,
  ParsedMISFile,
  ColumnMapping,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ChangePreview,
  PreviewRecord,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  RawMISRow,
  ColumnErrorSummary,
} from '@/types/misUpload';
import { supabase } from '@/integrations/supabase/client';
import { saveMISUpload } from '@/services/misUploadService';
import { 
  calculateJourneyStage, 
  isNewerOrEqual, 
  selectBestRecord,
  shouldUpdateRecord,
  JourneyStage 
} from '@/services/journeyStateMachine';

const initialState: UploadState = {
  step: 'upload',
  parsedFile: null,
  columnMappings: [],
  validationResult: null,
  changePreview: null,
  isProcessing: false,
  error: null,
  droppedRows: new Set<number>(),
};

export function useMISUpload() {
  const [state, setState] = useState<UploadState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const setStep = useCallback((step: UploadStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<RawMISRow>(worksheet, { defval: null });

      if (jsonData.length === 0) {
        throw new Error('File is empty or has no data rows');
      }

      const columns = Object.keys(jsonData[0]);

      const parsedFile: ParsedMISFile = {
        fileName: file.name,
        fileSize: file.size,
        rows: jsonData,
        columns,
        parseDate: new Date(),
      };

      // Auto-generate column mappings with smart matching
      const columnMappings = generateColumnMappings(columns);

      setState(prev => ({
        ...prev,
        parsedFile,
        columnMappings,
        step: 'mapping',
        isProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to parse file',
      }));
    }
  }, []);

  const updateColumnMapping = useCallback((sourceColumn: string, targetColumn: string | null) => {
    setState(prev => ({
      ...prev,
      columnMappings: prev.columnMappings.map(mapping =>
        mapping.sourceColumn === sourceColumn
          ? { ...mapping, targetColumn: targetColumn as ColumnMapping['targetColumn'], isMapped: !!targetColumn }
          : mapping
      ),
    }));
  }, []);

  const validateData = useCallback(() => {
    if (!state.parsedFile) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const totalRows = state.parsedFile.rows.length;

    // Check required columns are mapped (schema-level validation)
    const mappedTargets = state.columnMappings
      .filter(m => m.isMapped)
      .map(m => m.targetColumn);

    const unmappedRequired: string[] = [];
    REQUIRED_COLUMNS.forEach(col => {
      if (!mappedTargets.includes(col)) {
        unmappedRequired.push(col);
        errors.push({
          type: 'missing_required',
          message: `Required column "${col}" is not mapped`,
          column: col,
        });
      }
    });

    // Build error summary for unmapped columns
    const errorSummary: ColumnErrorSummary[] = unmappedRequired.map(col => ({
      column: col,
      errorCount: totalRows, // Affects all rows
      errorType: 'unmapped' as const,
      sampleErrors: [],
      fixAction: 'remap' as const,
    }));

    // If schema-level validation fails, stop here (no row-level checks)
    if (unmappedRequired.length > 0) {
      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings,
        totalRows,
        validRows: 0,
        invalidRows: totalRows,
        errorSummary,
      };
      setState(prev => ({
        ...prev,
        validationResult,
        step: 'validation',
        isProcessing: false,
      }));
      return;
    }

    // Build mapping lookup for row-level validation (typed as string for flexibility)
    const mappingLookup = new Map<string, string>(
      state.columnMappings
        .filter(m => m.isMapped && m.targetColumn)
        .map(m => [m.targetColumn!, m.sourceColumn])
    );

    // 🔒 STRICT NON-EMPTY COLUMNS — only these require non-empty values at row level
    // Other required columns just need to be MAPPED, but can have blank values
    const STRICT_NON_EMPTY: string[] = ['application_id', 'application_date'];
    
    // Row-level validation: track failures by column for summary
    const columnFailures: Map<string, { rows: number[]; values: (string | undefined)[]; errorType: 'blank' | 'invalid_format' }> = new Map();
    const invalidRowSet = new Set<number>();

    state.parsedFile.rows.forEach((row, idx) => {
      const rowNum = idx + 2; // Excel row number (1-indexed + header)

      // Check STRICT columns for non-empty values (only application_id and application_date)
      STRICT_NON_EMPTY.forEach(col => {
        const sourceCol = mappingLookup.get(col);
        if (!sourceCol) return;

        const value = row[sourceCol];
        const isEmpty = value === null || value === undefined || String(value).trim() === '';

        if (isEmpty) {
          invalidRowSet.add(rowNum);
          const existing = columnFailures.get(col) || { rows: [], values: [], errorType: 'blank' as const };
          existing.rows.push(rowNum);
          existing.values.push(undefined);
          columnFailures.set(col, existing);

          errors.push({
            type: 'blank_value',
            message: `Row ${rowNum}: ${col} is NULL or empty`,
            row: rowNum,
            column: col,
          });
        }
      });

      // Special validation: application_date must be parseable as a date
      const appDateSource = mappingLookup.get('application_date');
      if (appDateSource) {
        const dateVal = row[appDateSource];
        if (dateVal && typeof dateVal !== 'object') { // Not already a Date
          const parsed = new Date(String(dateVal));
          if (isNaN(parsed.getTime())) {
            invalidRowSet.add(rowNum);
            const existing = columnFailures.get('application_date') || { rows: [], values: [], errorType: 'invalid_format' as const };
            existing.rows.push(rowNum);
            existing.values.push(String(dateVal));
            existing.errorType = 'invalid_format';
            columnFailures.set('application_date', existing);

            errors.push({
              type: 'invalid_format',
              message: `Row ${rowNum}: application_date - Invalid date format`,
              row: rowNum,
              column: 'application_date',
              value: String(dateVal),
            });
          }
        }
      }

      // bank_event_date: CAN be NULL — only validate format if value is present
      const bankDateSource = mappingLookup.get('bank_event_date');
      if (bankDateSource) {
        const dateVal = row[bankDateSource];
        // Only validate if non-empty (NULL is allowed for bank_event_date)
        if (dateVal && String(dateVal).trim() !== '' && typeof dateVal !== 'object') {
          const parsed = new Date(String(dateVal));
          if (isNaN(parsed.getTime())) {
            invalidRowSet.add(rowNum);
            const existing = columnFailures.get('bank_event_date') || { rows: [], values: [], errorType: 'invalid_format' as const };
            existing.rows.push(rowNum);
            existing.values.push(String(dateVal));
            existing.errorType = 'invalid_format';
            columnFailures.set('bank_event_date', existing);

            errors.push({
              type: 'invalid_format',
              message: `Row ${rowNum}: bank_event_date - Invalid date format`,
              row: rowNum,
              column: 'bank_event_date',
              value: String(dateVal),
            });
          }
        }
      }
    });

    // Build column error summary for UI display
    columnFailures.forEach((failures, column) => {
      errorSummary.push({
        column,
        errorCount: failures.rows.length,
        errorType: failures.errorType === 'blank' ? 'blank' : 'invalid_format',
        sampleErrors: failures.rows.slice(0, 5).map((row, i) => ({
          row,
          value: failures.values[i],
        })),
        fixAction: failures.errorType === 'blank' ? 'reupload' : 'reupload',
      });
    });

    // Sort summary by error count descending
    errorSummary.sort((a, b) => b.errorCount - a.errorCount);

    // Check for duplicate application_ids within file
    const appIdMapping = state.columnMappings.find(m => m.targetColumn === 'application_id');
    if (appIdMapping) {
      const seenIds = new Set<string>();
      const duplicateIds = new Set<string>();

      state.parsedFile.rows.forEach((row, idx) => {
        const appId = String(row[appIdMapping.sourceColumn] || '').trim();
        
        if (appId && seenIds.has(appId)) {
          duplicateIds.add(appId);
        } else if (appId) {
          seenIds.add(appId);
        }
      });

      if (duplicateIds.size > 0) {
        warnings.push({
          type: 'empty_value',
          message: `${duplicateIds.size} duplicate application_id(s) found in file. Latest row will be used per Type-1 overwrite logic.`,
        });
      }
    }

    // Check date format for last_updated_date (optional but should warn if malformed)
    const dateMapping = state.columnMappings.find(m => m.targetColumn === 'last_updated_date');
    if (dateMapping) {
      let invalidDateCount = 0;
      state.parsedFile.rows.forEach((row, idx) => {
        const dateVal = row[dateMapping.sourceColumn];
        if (dateVal && typeof dateVal === 'string') {
          const parsed = new Date(dateVal);
          if (isNaN(parsed.getTime())) {
            invalidDateCount++;
          }
        }
      });
      if (invalidDateCount > 0) {
        warnings.push({
          type: 'date_format',
          message: `${invalidDateCount} row(s) have invalid last_updated_date format`,
        });
      }
    }

    const invalidRows = invalidRowSet.size;
    const validRows = totalRows - invalidRows;

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalRows,
      validRows,
      invalidRows,
      errorSummary,
    };

    setState(prev => ({
      ...prev,
      validationResult,
      step: 'validation',
      isProcessing: false,
    }));
  }, [state.parsedFile, state.columnMappings]);

  const generatePreview = useCallback(async () => {
    if (!state.parsedFile || !state.validationResult?.isValid) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    // Fetch existing records from database - fetch in batches to avoid limits
    let allExistingRecords: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('mis_records')
        .select('application_id, blaze_output, login_status, final_status, vkyc_status, core_non_core, vkyc_eligible, last_updated_date, month')
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Error fetching records batch:', error);
        break;
      }

      if (batch && batch.length > 0) {
        allExistingRecords = [...allExistingRecords, ...batch];
        from += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allExistingRecords.length} existing records for comparison`);

    // Build a lookup of current data by application_id
    const currentDataMap = new Map(
      allExistingRecords.map((app: any) => [app.application_id, app])
    );

    // Build column mapping lookup
    const mappingLookup = new Map(
      state.columnMappings
        .filter(m => m.isMapped && m.targetColumn)
        .map(m => [m.targetColumn!, m.sourceColumn])
    );

    // Apply Type-1 overwrite logic: dedupe incoming by application_id
    // Use state machine to select best record (most advanced journey stage)
    const incomingMap = new Map<string, RawMISRow[]>();
    const appIdSource = mappingLookup.get('application_id')!;
    const dateSource = mappingLookup.get('last_updated_date');
    const finalStatusSource = mappingLookup.get('final_status');
    const loginStatusSource = mappingLookup.get('login_status');
    const vkycStatusSource = mappingLookup.get('vkyc_status');
    const blazeOutputSource = mappingLookup.get('blaze_output');

    // Group all rows by application_id (to handle duplicates)
    state.parsedFile.rows.forEach(row => {
      const appId = String(row[appIdSource] || '').trim();
      if (!appId) return;

      const existing = incomingMap.get(appId) || [];
      existing.push(row);
      incomingMap.set(appId, existing);
    });

    // Collapse duplicates: select best record per application_id
    const deduplicatedIncoming = new Map<string, RawMISRow>();
    let duplicatesCollapsed = 0;
    
    incomingMap.forEach((rows, appId) => {
      if (rows.length > 1) {
        duplicatesCollapsed += rows.length - 1;
        // Convert to format expected by selectBestRecord
        const normalizedRows = rows.map(row => ({
          final_status: finalStatusSource ? String(row[finalStatusSource] || '') : null,
          login_status: loginStatusSource ? String(row[loginStatusSource] || '') : null,
          vkyc_status: vkycStatusSource ? String(row[vkycStatusSource] || '') : null,
          blaze_output: blazeOutputSource ? String(row[blazeOutputSource] || '') : null,
          last_updated_date: dateSource ? String(row[dateSource] || '') : null,
          _originalRow: row,
        }));
        
        const best = selectBestRecord(normalizedRows);
        deduplicatedIncoming.set(appId, (best as any)._originalRow);
      } else {
        deduplicatedIncoming.set(appId, rows[0]);
      }
    });

    if (duplicatesCollapsed > 0) {
      console.log(`Collapsed ${duplicatesCollapsed} duplicate rows within file (kept most advanced state)`);
    }

    const newRecords: PreviewRecord[] = [];
    const updatedRecords: PreviewRecord[] = [];
    const skippedRecords: { appId: string; reason: string }[] = [];
    let unchangedCount = 0;

    deduplicatedIncoming.forEach((row, appId) => {
      const newValues: Record<string, string | number | null> = {};
      
      mappingLookup.forEach((source, target) => {
        newValues[target] = row[source] ?? null;
      });

      const existing = currentDataMap.get(appId);

      if (!existing) {
        // New record - always insert
        newRecords.push({
          application_id: appId,
          changeType: 'new',
          newValues,
        });
      } else {
        // Existing record - apply state machine logic
        const updateDecision = shouldUpdateRecord(
          {
            finalStatus: finalStatusSource ? String(row[finalStatusSource] || '') : null,
            loginStatus: loginStatusSource ? String(row[loginStatusSource] || '') : null,
            vkycStatus: vkycStatusSource ? String(row[vkycStatusSource] || '') : null,
            blazeOutput: blazeOutputSource ? String(row[blazeOutputSource] || '') : null,
            lastUpdatedDate: dateSource ? String(row[dateSource] || '') : null,
          },
          {
            finalStatus: existing.final_status,
            loginStatus: existing.login_status,
            vkycStatus: existing.vkyc_status,
            blazeOutput: existing.blaze_output,
            lastUpdatedDate: existing.last_updated_date,
          }
        );

        if (!updateDecision.shouldUpdate) {
          // Skip this update - state machine rejected it
          skippedRecords.push({ appId, reason: updateDecision.reason });
          unchangedCount++;
          return; // Skip to next iteration (forEach callback)
        }

        // Compare values - compare all mapped fields
        const changedFields: string[] = [];
        const oldValues: Record<string, string | number | null> = {};

        // Build oldValues from existing record
        Object.keys(existing).forEach(key => {
          oldValues[key] = existing[key];
        });

        // Compare each mapped field
        mappingLookup.forEach((source, target) => {
          const newVal = String(newValues[target] ?? '');
          const oldVal = String(existing[target] ?? '');
          if (newVal !== oldVal) {
            changedFields.push(target);
          }
        });

        if (changedFields.length > 0) {
          updatedRecords.push({
            application_id: appId,
            changeType: 'updated',
            oldValues,
            newValues,
            changedFields,
          });
        } else {
          unchangedCount++;
        }
      }
    });

    if (skippedRecords.length > 0) {
      console.log(`Skipped ${skippedRecords.length} records due to state machine constraints:`);
      skippedRecords.slice(0, 10).forEach(({ appId, reason }) => {
        console.log(`  - ${appId}: ${reason}`);
      });
      if (skippedRecords.length > 10) {
        console.log(`  ... and ${skippedRecords.length - 10} more`);
      }
    }

    const changePreview: ChangePreview = {
      newRecords,
      updatedRecords,
      unchangedCount,
      totalIncoming: deduplicatedIncoming.size,
      skippedRecords: skippedRecords.map(({ appId, reason }) => ({
        application_id: appId,
        reason: reason.split(':')[0] || reason, // Extract just the type
        details: reason,
      })),
    };

    setState(prev => ({
      ...prev,
      changePreview,
      step: 'preview',
      isProcessing: false,
    }));
  }, [state.parsedFile, state.validationResult, state.columnMappings]);

  const applyChanges = useCallback(async () => {
    if (!state.parsedFile || !state.changePreview) return;
    
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Save to database
      const result = await saveMISUpload(
        state.parsedFile.fileName,
        state.parsedFile.rows.length,
        state.changePreview
      );

      if (result.success) {
        console.log('Upload saved with ID:', result.uploadId);
      } else {
        console.error('Upload failed:', result.error);
      }

      setState(prev => ({
        ...prev,
        step: 'complete',
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Error applying changes:', error);
      setState(prev => ({
        ...prev,
        step: 'complete',
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to save upload',
      }));
    }
  }, [state.parsedFile, state.changePreview]);

  // Drop invalid rows (requires explicit confirmation)
  const dropInvalidRows = useCallback((rowNumbers: number[]) => {
    setState(prev => {
      const newDroppedRows = new Set(prev.droppedRows);
      rowNumbers.forEach(r => newDroppedRows.add(r));
      return { ...prev, droppedRows: newDroppedRows };
    });
  }, []);

  // Clear dropped rows (undo)
  const clearDroppedRows = useCallback(() => {
    setState(prev => ({ ...prev, droppedRows: new Set<number>() }));
  }, []);

  // Revalidate after dropping rows
  const revalidateWithDropped = useCallback(() => {
    if (!state.parsedFile || !state.validationResult) return;

    // Filter out dropped rows from error count
    const droppedSet = state.droppedRows;
    const filteredErrors = state.validationResult.errors.filter(
      e => !e.row || !droppedSet.has(e.row)
    );

    // Recalculate summary
    const errorSummary: ColumnErrorSummary[] = [];
    const columnFailures: Map<string, { rows: number[]; values: (string | undefined)[]; errorType: 'blank' | 'invalid_format' | 'missing' | 'unmapped' }> = new Map();

    filteredErrors.forEach(error => {
      if (error.column) {
        const existing = columnFailures.get(error.column) || {
          rows: [],
          values: [],
          errorType: (error.type === 'blank_value' ? 'blank' : error.type === 'missing_required' ? 'unmapped' : 'invalid_format') as any,
        };
        if (error.row) existing.rows.push(error.row);
        if (error.value) existing.values.push(error.value);
        columnFailures.set(error.column, existing);
      }
    });

    columnFailures.forEach((failures, column) => {
      errorSummary.push({
        column,
        errorCount: failures.rows.length,
        errorType: failures.errorType,
        sampleErrors: failures.rows.slice(0, 5).map((row, i) => ({
          row,
          value: failures.values[i],
        })),
        fixAction: 'reupload',
      });
    });

    const totalRows = state.parsedFile.rows.length;
    const droppedCount = droppedSet.size;
    const invalidRows = new Set(filteredErrors.filter(e => e.row).map(e => e.row!)).size;
    const validRows = totalRows - invalidRows - droppedCount;

    const updatedResult: ValidationResult = {
      isValid: filteredErrors.length === 0,
      errors: filteredErrors,
      warnings: state.validationResult.warnings,
      totalRows,
      validRows,
      invalidRows,
      errorSummary,
    };

    setState(prev => ({
      ...prev,
      validationResult: updatedResult,
    }));
  }, [state.parsedFile, state.validationResult, state.droppedRows]);

  return {
    state,
    reset,
    setStep,
    parseFile,
    updateColumnMapping,
    validateData,
    generatePreview,
    applyChanges,
    dropInvalidRows,
    clearDroppedRows,
    revalidateWithDropped,
  };
}

// 🔒 COLUMN ALIASES — LOCKED
// Maps target column names to possible Excel header variations
// application_date = "DATE" column (2nd col, position-based in Axis MIS)
// bank_event_date = "DATE 2" or second DATE column (status/bank event date)
// DO NOT MODIFY without explicit approval.
const COLUMN_ALIASES: Record<string, string[]> = {
  // 🔒 MANDATORY COLUMNS (18 total — all must be mapped)
  'application_id': ['application no', 'Application no', 'APPLICATION NO', 'application_id', 'app_id', 'applicationid', 'appid', 'application id', 'app id'],
  'application_date': ['date', 'DATE', 'Date', 'application_date', 'applicationdate', 'application date'],
  'blaze_output': ['blaze_output', 'BLAZE_OUTPUT', 'Blaze_Output', 'blazeoutput', 'blaze output', 'blaze'],
  'name': ['name', 'Name', 'NAME', 'applicant_name', 'applicantname', 'applicant name'],
  'card_type': ['card type', 'CARD TYPE', 'Card Type', 'card_type', 'cardtype'],
  'ipa_status': ['ipa status', 'IPA Status', 'IPA STATUS', 'ipa_status', 'ipastatus'],
  'login_status': ['login status', 'LOGIN STATUS', 'Login Status', 'login_status', 'loginstatus', 'login'],
  'dip_ok_status': ['dip ok status', 'DIP OK STATUS', 'DIP_OK_STATUS', 'dip_ok_status', 'dipokstatus'],
  'ad_status': ['a/d status', 'A/D STATUS', 'A/D Status', 'ad_status', 'adstatus', 'a_d_status'],
  'bank_event_date': ['date 2', 'Date 2', 'DATE 2', 'date2', 'bank_event_date', 'bankeventdate', 'bank event date'],
  'rejection_reason': ['reason', 'Reason', 'REASON', 'rejection_reason', 'rejectionreason', 'rejection reason', 'reject_reason', 'decline_reason'],
  'final_status': ['final status', 'FINAL STATUS', 'Final Status', 'final_status', 'finalstatus'],
  'etcc': ['etcc', 'ETCC', 'Etcc'],
  'existing_c': ['existing_c', 'EXISTING_C', 'Existing_C', 'existingc', 'existing c'],
  'mis_month': ['month', 'Month', 'MONTH', 'mis_month'],
  'vkyc_status': ['vkyc status', 'vkyc Status', 'VKYC STATUS', 'vkyc_status', 'vkycstatus'],
  'vkyc_description': ['vkyc descr', 'VKYC DESCR', 'VKYC_DESCR', 'vkyc_description', 'vkycdescription', 'vkyc description'],
  'core_non_core': ['core/noncore', 'Core/Noncore', 'CORE/NONCORE', 'core_non_core', 'corenoncore', 'core non core', 'core/non-core'],
  
  // OPTIONAL COLUMNS
  'pincode': ['pincode', 'PINCODE', 'Pincode', 'pin_code', 'pin code'],
  'vkyc_eligible': ['vkyc_eligible', 'vkyceligible', 'vkyc eligible', 'vkyc_elig', 'eligibility'],
  'state': ['state', 'State', 'STATE', 'location_state'],
  'product': ['product', 'Product', 'PRODUCT', 'product_name', 'productname'],
  'last_updated_date': ['last_updated_date', 'lastupdateddate', 'last updated date', 'update_date', 'updatedate'],
};

function generateColumnMappings(sourceColumns: string[]): ColumnMapping[] {
  const allTargets = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

  return sourceColumns.map(source => {
    const normalizedSource = source.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try to find a matching target column using aliases
    let matchedTarget: string | null = null;
    
    for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
      const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (normalizedAliases.includes(normalizedSource)) {
        matchedTarget = target;
        break;
      }
    }
    
    // Fallback: try substring matching if no alias match
    if (!matchedTarget) {
      matchedTarget = allTargets.find(target => {
        const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedSource === targetNorm || 
               normalizedSource.includes(targetNorm) || 
               targetNorm.includes(normalizedSource);
      }) || null;
    }

    const isRequired = matchedTarget ? REQUIRED_COLUMNS.includes(matchedTarget as any) : false;

    return {
      sourceColumn: source,
      targetColumn: matchedTarget as ColumnMapping['targetColumn'],
      isRequired,
      isMapped: !!matchedTarget,
    };
  });
}
