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
          
          // Note: Blank blaze_output is valid and results in 'Blank' quality
          // Only track core_non_core as missing field conflict
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

          // 🔒 CRITICAL: application_date = DATE column (2nd col in Axis MIS)
          // This is the SOURCE OF TRUTH for month aggregation
          // Month is DERIVED at query time from application_date, NOT frozen
          const applicationDateStr = r.newValues?.application_date 
            ? normalizeToISODate(String(r.newValues.application_date))
            : lastUpdatedDate; // Fallback to last_updated_date if application_date missing
          
          // Extract just the date part (YYYY-MM-DD) for the application_date column
          const applicationDateOnly = applicationDateStr.split('T')[0];
          
          // Keep legacy month field for backward compatibility, but aggregation uses application_date
          const month = getMonthFromDate(applicationDateStr);

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
            application_date: applicationDateOnly, // 🔒 SOURCE OF TRUTH for month aggregation
            month: month, // Legacy field, kept for backward compatibility
            // 🔒 MANDATORY COLUMNS - persisted from MIS
            name: r.newValues?.name ? String(r.newValues.name) : null,
            card_type: r.newValues?.card_type ? String(r.newValues.card_type) : null,
            ipa_status: r.newValues?.ipa_status ? String(r.newValues.ipa_status) : null,
            dip_ok_status: r.newValues?.dip_ok_status ? String(r.newValues.dip_ok_status) : null,
            ad_status: r.newValues?.ad_status ? String(r.newValues.ad_status) : null,
            bank_event_date: r.newValues?.bank_event_date 
              ? normalizeToISODate(String(r.newValues.bank_event_date)).split('T')[0] 
              : null,
            etcc: r.newValues?.etcc ? String(r.newValues.etcc) : null,
            existing_c: r.newValues?.existing_c ? String(r.newValues.existing_c) : null,
            mis_month: r.newValues?.mis_month ? String(r.newValues.mis_month) : null,
            vkyc_description: r.newValues?.vkyc_description ? String(r.newValues.vkyc_description) : null,
            pincode: r.newValues?.pincode ? String(r.newValues.pincode) : null,
            // Existing columns
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

          // 🔒 CRITICAL: application_date is the SOURCE OF TRUTH for month aggregation
          // We preserve existing application_date - it should never change once set
          // The legacy 'month' field is kept for backward compatibility but aggregation uses application_date
          const existingAppDate = record.oldValues?.application_date ? String(record.oldValues.application_date) : null;
          
          // Build upsert record
          const upsertRecord: Record<string, any> = {
            application_id: record.application_id,
            upload_id: upload.id,
            last_updated_date: lastUpdatedDate,
            // 🔒 MANDATORY COLUMNS - persisted from MIS
            name: record.newValues?.name ? String(record.newValues.name) : null,
            card_type: record.newValues?.card_type ? String(record.newValues.card_type) : null,
            ipa_status: record.newValues?.ipa_status ? String(record.newValues.ipa_status) : null,
            dip_ok_status: record.newValues?.dip_ok_status ? String(record.newValues.dip_ok_status) : null,
            ad_status: record.newValues?.ad_status ? String(record.newValues.ad_status) : null,
            bank_event_date: record.newValues?.bank_event_date 
              ? normalizeToISODate(String(record.newValues.bank_event_date)).split('T')[0] 
              : null,
            etcc: record.newValues?.etcc ? String(record.newValues.etcc) : null,
            existing_c: record.newValues?.existing_c ? String(record.newValues.existing_c) : null,
            // 🔒 PRESERVE existing mis_month - it's frozen at first insert
            mis_month: record.oldValues?.mis_month 
              ? String(record.oldValues.mis_month) 
              : (record.newValues?.mis_month ? String(record.newValues.mis_month) : null),
            vkyc_description: record.newValues?.vkyc_description ? String(record.newValues.vkyc_description) : null,
            pincode: record.newValues?.pincode ? String(record.newValues.pincode) : null,
            // Existing columns
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
          
          // 🔒 PRESERVE existing application_date - it's the immutable event time
          // If application already exists, keep its original application_date
          if (existingAppDate) {
            upsertRecord.application_date = existingAppDate.split('T')[0];
            upsertRecord.month = existingMonth || getMonthFromDate(existingAppDate);
          } else {
            // New record being updated - derive from incoming application_date
            const applicationDateStr = record.newValues?.application_date 
              ? normalizeToISODate(String(record.newValues.application_date))
              : lastUpdatedDate;
            upsertRecord.application_date = applicationDateStr.split('T')[0];
            upsertRecord.month = getMonthFromDate(applicationDateStr);
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