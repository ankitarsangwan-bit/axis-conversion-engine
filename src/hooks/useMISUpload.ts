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
} from '@/types/misUpload';
import { sampleAxisApplications } from '@/data/sampleAxisData';

const initialState: UploadState = {
  step: 'upload',
  parsedFile: null,
  columnMappings: [],
  validationResult: null,
  changePreview: null,
  isProcessing: false,
  error: null,
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

    // Check required columns are mapped
    const mappedTargets = state.columnMappings
      .filter(m => m.isMapped)
      .map(m => m.targetColumn);

    REQUIRED_COLUMNS.forEach(col => {
      if (!mappedTargets.includes(col)) {
        errors.push({
          type: 'missing_required',
          message: `Required column "${col}" is not mapped`,
          column: col,
        });
      }
    });

    // Check for unmapped source columns
    state.columnMappings
      .filter(m => !m.isMapped)
      .forEach(m => {
        warnings.push({
          type: 'unmapped_column',
          message: `Column "${m.sourceColumn}" is not mapped and will be ignored`,
          column: m.sourceColumn,
        });
      });

    // Get the mapping for application_id
    const appIdMapping = state.columnMappings.find(m => m.targetColumn === 'application_id');

    if (appIdMapping) {
      const seenIds = new Set<string>();
      const duplicateIds = new Set<string>();

      state.parsedFile.rows.forEach((row, idx) => {
        const appId = String(row[appIdMapping.sourceColumn] || '').trim();
        
        if (!appId) {
          errors.push({
            type: 'invalid_format',
            message: `Empty application_id at row ${idx + 2}`,
            row: idx + 2,
            column: 'application_id',
          });
        } else if (seenIds.has(appId)) {
          duplicateIds.add(appId);
        } else {
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

    // Check date format
    const dateMapping = state.columnMappings.find(m => m.targetColumn === 'last_updated_date');
    if (dateMapping) {
      state.parsedFile.rows.forEach((row, idx) => {
        const dateVal = row[dateMapping.sourceColumn];
        if (dateVal && typeof dateVal === 'string') {
          const parsed = new Date(dateVal);
          if (isNaN(parsed.getTime())) {
            warnings.push({
              type: 'date_format',
              message: `Invalid date format at row ${idx + 2}`,
              row: idx + 2,
              column: 'last_updated_date',
            });
          }
        }
      });
    }

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    setState(prev => ({
      ...prev,
      validationResult,
      step: 'validation',
      isProcessing: false,
    }));
  }, [state.parsedFile, state.columnMappings]);

  const generatePreview = useCallback(() => {
    if (!state.parsedFile || !state.validationResult?.isValid) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    // Build a lookup of current data by application_id
    const currentDataMap = new Map(
      sampleAxisApplications.map(app => [app.application_id, app])
    );

    // Build column mapping lookup
    const mappingLookup = new Map(
      state.columnMappings
        .filter(m => m.isMapped && m.targetColumn)
        .map(m => [m.targetColumn!, m.sourceColumn])
    );

    // Apply Type-1 overwrite logic: dedupe incoming by application_id, keep latest
    const incomingMap = new Map<string, RawMISRow>();
    const appIdSource = mappingLookup.get('application_id')!;
    const dateSource = mappingLookup.get('last_updated_date');

    state.parsedFile.rows.forEach(row => {
      const appId = String(row[appIdSource] || '').trim();
      if (!appId) return;

      const existing = incomingMap.get(appId);
      if (!existing) {
        incomingMap.set(appId, row);
      } else if (dateSource) {
        // Keep the one with latest date
        const existingDate = new Date(String(existing[dateSource] || ''));
        const newDate = new Date(String(row[dateSource] || ''));
        if (newDate > existingDate) {
          incomingMap.set(appId, row);
        }
      }
    });

    const newRecords: PreviewRecord[] = [];
    const updatedRecords: PreviewRecord[] = [];
    let unchangedCount = 0;

    incomingMap.forEach((row, appId) => {
      const newValues: Record<string, string | number | null> = {};
      
      mappingLookup.forEach((source, target) => {
        newValues[target] = row[source] ?? null;
      });

      const existing = currentDataMap.get(appId);

      if (!existing) {
        newRecords.push({
          application_id: appId,
          changeType: 'new',
          newValues,
        });
      } else {
        // Compare values
        const changedFields: string[] = [];
        const oldValues: Record<string, string | number | null> = {
          application_id: existing.application_id,
          blaze_output: existing.blaze_output,
          login_status: existing.login_status,
          final_status: existing.final_status,
          last_updated_date: existing.last_updated_date,
        };

        if (String(newValues.blaze_output || '') !== existing.blaze_output) {
          changedFields.push('blaze_output');
        }
        if (String(newValues.login_status || '') !== (existing.login_status || '')) {
          changedFields.push('login_status');
        }
        if (String(newValues.final_status || '') !== existing.final_status) {
          changedFields.push('final_status');
        }

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

    const changePreview: ChangePreview = {
      newRecords,
      updatedRecords,
      unchangedCount,
      totalIncoming: incomingMap.size,
    };

    setState(prev => ({
      ...prev,
      changePreview,
      step: 'preview',
      isProcessing: false,
    }));
  }, [state.parsedFile, state.validationResult, state.columnMappings]);

  const applyChanges = useCallback(() => {
    setState(prev => ({ ...prev, isProcessing: true }));

    // Simulate applying changes (in a real app, this would update the data store)
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        step: 'complete',
        isProcessing: false,
      }));
    }, 1000);
  }, []);

  return {
    state,
    reset,
    setStep,
    parseFile,
    updateColumnMapping,
    validateData,
    generatePreview,
    applyChanges,
  };
}

function generateColumnMappings(sourceColumns: string[]): ColumnMapping[] {
  const allTargets = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

  return sourceColumns.map(source => {
    const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Try to find a matching target column
    const matchedTarget = allTargets.find(target => {
      const targetNorm = target.toLowerCase();
      return normalized === targetNorm || 
             normalized.includes(targetNorm) || 
             targetNorm.includes(normalized);
    });

    const isRequired = matchedTarget ? REQUIRED_COLUMNS.includes(matchedTarget as any) : false;

    return {
      sourceColumn: source,
      targetColumn: matchedTarget || null,
      isRequired,
      isMapped: !!matchedTarget,
    };
  });
}
