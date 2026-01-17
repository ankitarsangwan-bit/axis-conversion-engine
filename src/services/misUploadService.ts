import { supabase } from '@/integrations/supabase/client';
import { ChangePreview, PreviewRecord } from '@/types/misUpload';

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

    // Insert new records
    if (changePreview.newRecords.length > 0) {
      const newRecordsToInsert = changePreview.newRecords.map(r => ({
        upload_id: upload.id,
        application_id: r.application_id,
        month: String(r.newValues?.month || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })),
        state: r.newValues?.state ? String(r.newValues.state) : null,
        product: r.newValues?.product ? String(r.newValues.product) : null,
        applications: Number(r.newValues?.applications) || 1,
        dedupe_pass: Number(r.newValues?.dedupe_pass) || 0,
        bureau_pass: Number(r.newValues?.bureau_pass) || 0,
        vkyc_pass: Number(r.newValues?.vkyc_pass) || 0,
        disbursed: Number(r.newValues?.disbursed) || 0,
        disbursement_amount: Number(r.newValues?.disbursement_amount) || 0,
        rejection_reason: r.newValues?.rejection_reason ? String(r.newValues.rejection_reason) : null,
      }));

      const { error: insertError } = await supabase
        .from('mis_records')
        .insert(newRecordsToInsert);

      if (insertError) {
        console.error('Error inserting new records:', insertError);
      }
    }

    // Update existing records
    for (const record of changePreview.updatedRecords) {
      const updateData: Record<string, any> = {
        upload_id: upload.id,
        last_updated_date: new Date().toISOString(),
      };

      // Apply changed fields from newValues
      if (record.changedFields && record.newValues) {
        record.changedFields.forEach(field => {
          updateData[field] = record.newValues[field];
        });
      }

      const { error: updateError } = await supabase
        .from('mis_records')
        .update(updateData)
        .eq('application_id', record.application_id);

      if (updateError) {
        console.error('Error updating record:', updateError);
      }

      // Create conflict records for tracking
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
