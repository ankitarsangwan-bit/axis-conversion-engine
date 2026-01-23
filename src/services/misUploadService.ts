import { supabase } from '@/integrations/supabase/client';
import { ChangePreview, PreviewRecord } from '@/types/misUpload';
import { 
  deriveLeadQuality, 
  isKycCompleted,
  isVkycDone,
  isCardApproved,
  getMonthFromDate,
  normalizeBlazeOutput,
  normalizeCoreNonCore,
  normalizeToISODate
} from '@/types/axis';
import { 
  calculateJourneyStage, 
  shouldUpdateRecord,
  JourneyStage 
} from '@/services/journeyStateMachine';

/**
 * Track skipped updates for logging/debugging
 */
interface SkippedUpdate {
  application_id: string;
  reason: string;
  incomingStage: JourneyStage;
  existingStage: JourneyStage;
}

export async function saveMISUpload(
  fileName: string,
  recordCount: number,
  changePreview: ChangePreview
): Promise<{ success: boolean; uploadId: string | null; error: string | null }> {
  try {
    // Generate upload ID
    const uploadId = `MIS-${new Date().toISOString().split('T')[0]}-${Date.now().toString(36)}`;
    
    // Mark all previous uploads as Historical
    await supabase
      .from('mis_uploads')
      .update({ status: 'Historical' })
      .eq('status', 'Current');

    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('mis_uploads')
      .insert({
        upload_id: uploadId,
        upload_date: new Date().toISOString().split('T')[0],
        upload_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        record_count: recordCount,
        new_records: changePreview.newRecords.length,
        updated_records: changePreview.updatedRecords.length,
        uploaded_by: 'Manual Upload',
        status: 'Current',
        file_name: fileName,
      })
      .select()
      .single();

    if (uploadError) {
      console.error('Error creating upload record:', uploadError);
      return { success: false, uploadId: null, error: uploadError.message };
    }

    // Track missing required fields as conflicts
    const missingFieldConflicts: Array<{
      application_id: string;
      field_name: string;
      old_value: string;
      new_value: string;
    }> = [];

    // Insert new records in batches to avoid hitting limits
    // 🔒 CRITICAL: Month is derived from application_date (MIS business date) - FROZEN at first insert
    if (changePreview.newRecords.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < changePreview.newRecords.length; i += batchSize) {
        const batch = changePreview.newRecords.slice(i, i + batchSize);
        const newRecordsToInsert = batch.map(r => {
          const rawBlazeOutput = r.newValues?.blaze_output as string;
          const rawCoreNonCore = r.newValues?.core_non_core as string;
          
          // Track missing required fields
          if (!rawBlazeOutput || rawBlazeOutput.trim() === '') {
            missingFieldConflicts.push({
              application_id: r.application_id,
              field_name: 'blaze_output',
              old_value: '',
              new_value: 'STPK (defaulted - missing in MIS)',
            });
          }
          if (!rawCoreNonCore || rawCoreNonCore.trim() === '') {
            missingFieldConflicts.push({
              application_id: r.application_id,
              field_name: 'core_non_core',
              old_value: '',
              new_value: 'Core (defaulted - missing in MIS)',
            });
          }

          // Normalize with defaults
          const blazeOutput = normalizeBlazeOutput(rawBlazeOutput);
          const loginStatus = r.newValues?.login_status ? String(r.newValues.login_status) : null;
          const finalStatus = String(r.newValues?.final_status || '');
          const vkycStatus = String(r.newValues?.vkyc_status || '');
          const coreNonCore = normalizeCoreNonCore(rawCoreNonCore);
          const lastUpdatedDate = r.newValues?.last_updated_date 
            ? normalizeToISODate(String(r.newValues.last_updated_date))
            : new Date().toISOString();

          // 🔒 CRITICAL: Month comes from application_date (MIS business date), NOT last_updated_date
          // This is the frozen application month that NEVER changes
          const applicationDate = r.newValues?.application_date 
            ? normalizeToISODate(String(r.newValues.application_date))
            : lastUpdatedDate; // Fallback to last_updated_date if application_date missing
          const month = getMonthFromDate(applicationDate);

          // Get decline reason (Reason column)
          const declineReason = r.newValues?.rejection_reason ? String(r.newValues.rejection_reason) : null;

          // Apply business logic with new VKYC_Done and KYC_Done flags
          const leadQuality = deriveLeadQuality(blazeOutput);
          const vkycDone = isVkycDone(vkycStatus);
          const kycCompleted = isKycCompleted(
            loginStatus, 
            finalStatus, 
            vkycStatus, 
            coreNonCore,
            declineReason
          );
          const cardApproved = isCardApproved(finalStatus);

          return {
            upload_id: upload.id,
            application_id: r.application_id,
            month: month,
            blaze_output: blazeOutput,
            login_status: loginStatus,
            final_status: finalStatus,
            vkyc_status: vkycStatus,
            core_non_core: coreNonCore,
            vkyc_eligible: r.newValues?.vkyc_eligible ? String(r.newValues.vkyc_eligible) : null,
            rejection_reason: r.newValues?.rejection_reason ? String(r.newValues.rejection_reason) : null,
            state: r.newValues?.state ? String(r.newValues.state) : null,
            product: r.newValues?.product ? String(r.newValues.product) : null,
            lead_quality: leadQuality,
            kyc_completed: kycCompleted,
            // Computed numeric fields
            applications: 1,
            dedupe_pass: leadQuality !== 'Rejected' ? 1 : 0,
            bureau_pass: leadQuality === 'Good' ? 1 : 0,
            vkyc_pass: kycCompleted ? 1 : 0,
            disbursed: cardApproved ? 1 : 0,
            last_updated_date: lastUpdatedDate,
          };
        });

        const { error: insertError } = await supabase
          .from('mis_records')
          .insert(newRecordsToInsert);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
        }
      }
    }

    // Update existing records in BATCHES using upsert
    // NOTE: State machine validation (temporal guard, forward-only journey, terminal states)
    // is enforced at the preview generation stage in useMISUpload.ts
    // Records that reach this point have already passed all guards
    // 🔒 CRITICAL: Month is NEVER updated on existing records - it's frozen at first insert
    if (changePreview.updatedRecords.length > 0) {
      const batchSize = 500;
      const allConflicts: Array<{
        application_id: string;
        field_name: string;
        old_value: string;
        new_value: string;
        upload_id: string;
        resolution: string;
        resolved_at: string;
      }> = [];
      
      for (let i = 0; i < changePreview.updatedRecords.length; i += batchSize) {
        const batch = changePreview.updatedRecords.slice(i, i + batchSize);
        
        const recordsToUpsert = batch.map(record => {
          const rawBlazeOutput = record.newValues?.blaze_output as string;
          const rawCoreNonCore = record.newValues?.core_non_core as string;
          
          // Track missing required fields
          if (!rawBlazeOutput || rawBlazeOutput.trim() === '') {
            missingFieldConflicts.push({
              application_id: record.application_id,
              field_name: 'blaze_output',
              old_value: '',
              new_value: 'STPK (defaulted - missing in MIS)',
            });
          }
          if (!rawCoreNonCore || rawCoreNonCore.trim() === '') {
            missingFieldConflicts.push({
              application_id: record.application_id,
              field_name: 'core_non_core',
              old_value: '',
              new_value: 'Core (defaulted - missing in MIS)',
            });
          }

          // Normalize with defaults
          const blazeOutput = normalizeBlazeOutput(rawBlazeOutput);
          const loginStatus = record.newValues?.login_status ? String(record.newValues.login_status) : null;
          const finalStatus = String(record.newValues?.final_status || '');
          const vkycStatus = String(record.newValues?.vkyc_status || '');
          const coreNonCore = normalizeCoreNonCore(rawCoreNonCore);
          const lastUpdatedDate = record.newValues?.last_updated_date 
            ? normalizeToISODate(String(record.newValues.last_updated_date))
            : new Date().toISOString();

          // Get decline reason (Reason column)
          const declineReason = record.newValues?.rejection_reason ? String(record.newValues.rejection_reason) : null;

          // Apply business logic with new VKYC_Done and KYC_Done flags
          const leadQuality = deriveLeadQuality(blazeOutput);
          const kycCompleted = isKycCompleted(
            loginStatus, 
            finalStatus, 
            vkycStatus, 
            coreNonCore,
            declineReason
          );
          const cardApproved = isCardApproved(finalStatus);
          
          // 🔒 CRITICAL: PRESERVE existing month - it's frozen at first insert
          // Use oldValues.month from the existing record, NOT from incoming MIS
          const existingMonth = record.oldValues?.month ? String(record.oldValues.month) : null;

          // Collect field change conflicts
          if (record.changedFields && record.oldValues && record.newValues) {
            for (const field of record.changedFields) {
              allConflicts.push({
                application_id: record.application_id,
                field_name: field,
                old_value: String(record.oldValues[field] ?? ''),
                new_value: String(record.newValues[field] ?? ''),
                upload_id: upload.id,
                resolution: 'auto-resolved',
                resolved_at: new Date().toISOString(),
              });
            }
          }

          // Build upsert record - EXCLUDE month field so it's not overwritten
          const upsertRecord: Record<string, any> = {
            application_id: record.application_id,
            upload_id: upload.id,
            last_updated_date: lastUpdatedDate,
            blaze_output: blazeOutput,
            login_status: loginStatus,
            final_status: finalStatus,
            vkyc_status: vkycStatus,
            core_non_core: coreNonCore,
            rejection_reason: record.newValues?.rejection_reason ? String(record.newValues.rejection_reason) : null,
            lead_quality: leadQuality,
            kyc_completed: kycCompleted,
            dedupe_pass: leadQuality !== 'Rejected' ? 1 : 0,
            bureau_pass: leadQuality === 'Good' ? 1 : 0,
            vkyc_pass: kycCompleted ? 1 : 0,
            disbursed: cardApproved ? 1 : 0,
            vkyc_eligible: record.newValues?.vkyc_eligible ? String(record.newValues.vkyc_eligible) : null,
            state: record.newValues?.state ? String(record.newValues.state) : null,
            product: record.newValues?.product ? String(record.newValues.product) : null,
            applications: 1,
          };
          
          // Only include month if we have the existing value (to preserve it)
          // If somehow existingMonth is null, we need to derive it from application_date
          if (existingMonth) {
            upsertRecord.month = existingMonth;
          } else {
            // Fallback: derive from application_date if available, otherwise last_updated_date
            const applicationDate = record.newValues?.application_date 
              ? normalizeToISODate(String(record.newValues.application_date))
              : lastUpdatedDate;
            upsertRecord.month = getMonthFromDate(applicationDate);
          }
          
          return upsertRecord;
        });

        // Use upsert with onConflict to batch update
        const { error: upsertError } = await supabase
          .from('mis_records')
          .upsert(recordsToUpsert as any[], { onConflict: 'application_id' });

        if (upsertError) {
          console.error('Error upserting batch:', upsertError);
        }
      }

      // Batch insert all conflicts at once
      if (allConflicts.length > 0) {
        for (let i = 0; i < allConflicts.length; i += batchSize) {
          const conflictBatch = allConflicts.slice(i, i + batchSize);
          const { error: conflictError } = await supabase
            .from('data_conflicts')
            .insert(conflictBatch);
          
          if (conflictError) {
            console.error('Error inserting conflicts batch:', conflictError);
          }
        }
      }
      
      console.log(`Batch updated ${changePreview.updatedRecords.length} records`);
    }

    // Insert missing field conflicts (pending resolution)
    if (missingFieldConflicts.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < missingFieldConflicts.length; i += batchSize) {
        const batch = missingFieldConflicts.slice(i, i + batchSize);
        await supabase.from('data_conflicts').insert(
          batch.map(c => ({
            application_id: c.application_id,
            field_name: c.field_name,
            old_value: c.old_value,
            new_value: c.new_value,
            upload_id: upload.id,
            resolution: 'pending', // Mark as pending - needs data from next MIS
          }))
        );
      }
      console.log(`Logged ${missingFieldConflicts.length} missing field conflicts`);
    }

    // Update data freshness
    await supabase.from('data_freshness').upsert({
      source_name: fileName,
      source_type: 'MIS',
      last_updated: new Date().toISOString(),
      record_count: recordCount,
      status: 'Fresh',
      latency_hours: 0,
    }, {
      onConflict: 'source_name',
    });

    console.log('MIS upload saved successfully:', uploadId);
    return { success: true, uploadId, error: null };
  } catch (err) {
    console.error('Error saving MIS upload:', err);
    return { 
      success: false, 
      uploadId: null, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function getMISUploadHistory() {
  const { data, error } = await supabase
    .from('mis_uploads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching upload history:', error);
    return [];
  }

  return data.map(u => ({
    uploadId: u.upload_id,
    uploadDate: u.upload_date,
    uploadTime: u.upload_time,
    recordCount: u.record_count,
    newRecords: u.new_records,
    updatedRecords: u.updated_records,
    status: u.status as 'Current' | 'Historical',
    uploadedBy: u.uploaded_by,
  }));
}