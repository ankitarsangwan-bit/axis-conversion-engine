import { supabase } from '@/integrations/supabase/client';
import { ChangePreview, PreviewRecord } from '@/types/misUpload';
import { 
  deriveLeadQuality, 
  isKycCompleted,
  isVkycDone,
  isCardApproved,
  getMonthFromDate,
  normalizeBlazeOutput,
  normalizeCoreNonCore
} from '@/types/axis';

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
            ? String(r.newValues.last_updated_date) 
            : new Date().toISOString();

          // Get rejection reason if available
          const rejectionReason = r.newValues?.rejection_reason ? String(r.newValues.rejection_reason) : null;

          // Apply business logic with new VKYC_Done and KYC_Done flags
          const leadQuality = deriveLeadQuality(blazeOutput);
          const vkycDone = isVkycDone(vkycStatus);
          const kycCompleted = isKycCompleted(
            loginStatus, 
            finalStatus, 
            vkycStatus, 
            coreNonCore, 
            rejectionReason
          );
          const cardApproved = isCardApproved(finalStatus);
          const month = getMonthFromDate(lastUpdatedDate);

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

    // Update existing records
    for (const record of changePreview.updatedRecords) {
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
        ? String(record.newValues.last_updated_date) 
        : new Date().toISOString();

      // Get rejection reason if available
      const rejectionReason = record.newValues?.rejection_reason ? String(record.newValues.rejection_reason) : null;

      // Apply business logic with new VKYC_Done and KYC_Done flags
      const leadQuality = deriveLeadQuality(blazeOutput);
      const vkycDone = isVkycDone(vkycStatus);
      const kycCompleted = isKycCompleted(
        loginStatus, 
        finalStatus, 
        vkycStatus, 
        coreNonCore, 
        rejectionReason
      );
      const cardApproved = isCardApproved(finalStatus);
      const month = getMonthFromDate(lastUpdatedDate);

      const updateData: Record<string, any> = {
        upload_id: upload.id,
        last_updated_date: lastUpdatedDate,
        blaze_output: blazeOutput,
        login_status: loginStatus,
        final_status: finalStatus,
        vkyc_status: vkycStatus,
        core_non_core: coreNonCore,
        lead_quality: leadQuality,
        kyc_completed: kycCompleted,
        month: month,
        dedupe_pass: leadQuality !== 'Rejected' ? 1 : 0,
        bureau_pass: leadQuality === 'Good' ? 1 : 0,
        vkyc_pass: kycCompleted ? 1 : 0,
        disbursed: cardApproved ? 1 : 0,
      };

      if (record.newValues?.vkyc_eligible) {
        updateData.vkyc_eligible = String(record.newValues.vkyc_eligible);
      }

      const { error: updateError } = await supabase
        .from('mis_records')
        .update(updateData)
        .eq('application_id', record.application_id);

      if (updateError) {
        console.error('Error updating record:', updateError);
      }

      // Create conflict records for field changes
      if (record.changedFields && record.oldValues && record.newValues) {
        for (const field of record.changedFields) {
          await supabase.from('data_conflicts').insert({
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