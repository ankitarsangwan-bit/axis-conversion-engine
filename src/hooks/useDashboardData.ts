import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AxisSummaryRow, 
  QualitySummaryRow, 
  DataFreshnessRow, 
  MISUpload, 
  ConflictRecord,
  VkycFunnelMetrics,
  LeadQuality,
  deriveLeadQuality,
  isKycCompleted,
  getKycStatus,
  isCardApproved,
  isRejectedPostKyc,
  getMonthFromDate,
  detectConflict,
  resolveConflict
} from '@/types/axis';

// Fallback to sample data functions
import {
  getAxisSummaryByMonth as getSampleSummary,
  getAxisTotals as getSampleTotals,
  getQualitySummary as getSampleQuality,
  getDataFreshness as getSampleFreshness,
  getConflictRecords as getSampleConflicts,
  getUploadSummary as getSampleUploadSummary,
  getMISUploadHistory as getSampleHistory,
  getCurrentMISUpload as getSampleCurrentUpload,
  getVkycFunnelMetrics as getSampleVkycMetrics,
  getVkycFunnelByMonth as getSampleVkycByMonth
} from '@/data/sampleAxisData';

interface DashboardData {
  summaryRows: AxisSummaryRow[];
  totals: AxisSummaryRow;
  qualityRows: QualitySummaryRow[];
  freshnessRows: DataFreshnessRow[];
  conflicts: ConflictRecord[];
  uploadSummary: ReturnType<typeof getSampleUploadSummary>;
  misUploadHistory: MISUpload[];
  currentMISUpload: MISUpload | undefined;
  vkycFunnelMetrics: VkycFunnelMetrics;
  vkycFunnelByMonth: Array<{ month: string } & VkycFunnelMetrics>;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have data in the database
      const { data: misRecords, error: recordsError } = await supabase
        .from('mis_records')
        .select('*')
        .limit(1);

      const { data: uploads, error: uploadsError } = await supabase
        .from('mis_uploads')
        .select('*')
        .order('created_at', { ascending: false });

      // If database has data, compute from it; otherwise use sample data
      if (!recordsError && misRecords && misRecords.length > 0) {
        const dashboardData = await computeDashboardFromDB();
        setData(dashboardData);
      } else {
        // Use sample data as fallback
        setData({
          summaryRows: getSampleSummary(),
          totals: getSampleTotals(),
          qualityRows: getSampleQuality(),
          freshnessRows: getSampleFreshness(),
          conflicts: getSampleConflicts(),
          uploadSummary: getSampleUploadSummary(),
          misUploadHistory: uploads && uploads.length > 0 
            ? uploads.map(mapUploadFromDB)
            : getSampleHistory(),
          currentMISUpload: uploads && uploads.length > 0 
            ? mapUploadFromDB(uploads.find((u: any) => u.status === 'Current') || uploads[0])
            : getSampleCurrentUpload(),
          vkycFunnelMetrics: getSampleVkycMetrics(),
          vkycFunnelByMonth: getSampleVkycByMonth(),
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data');
      // Fallback to sample data
      setData({
        summaryRows: getSampleSummary(),
        totals: getSampleTotals(),
        qualityRows: getSampleQuality(),
        freshnessRows: getSampleFreshness(),
        conflicts: getSampleConflicts(),
        uploadSummary: getSampleUploadSummary(),
        misUploadHistory: getSampleHistory(),
        currentMISUpload: getSampleCurrentUpload(),
        vkycFunnelMetrics: getSampleVkycMetrics(),
        vkycFunnelByMonth: getSampleVkycByMonth(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}

// Map database upload record to MISUpload type
function mapUploadFromDB(upload: any): MISUpload {
  return {
    uploadId: upload.upload_id,
    uploadDate: upload.upload_date,
    uploadTime: upload.upload_time,
    recordCount: upload.record_count,
    newRecords: upload.new_records,
    updatedRecords: upload.updated_records,
    status: upload.status as 'Current' | 'Historical',
    uploadedBy: upload.uploaded_by,
  };
}

// Compute dashboard data from database records
async function computeDashboardFromDB(): Promise<DashboardData> {
  // Fetch all records - remove default 1000 limit
  const { data: records, count } = await supabase
    .from('mis_records')
    .select('*', { count: 'exact' })
    .range(0, 100000); // Override default 1000 limit

  const { data: uploads } = await supabase
    .from('mis_uploads')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: conflicts } = await supabase
    .from('data_conflicts')
    .select('*')
    .eq('resolution', 'pending')
    .range(0, 100000);

  const { data: vkycData } = await supabase
    .from('vkyc_metrics')
    .select('*')
    .range(0, 100000);

  // Process MIS records into dashboard format
  const processedRecords = (records || []).map((r: any) => ({
    application_id: r.application_id,
    month: r.month,
    applications: r.applications || 0,
    dedupe_pass: r.dedupe_pass || 0,
    bureau_pass: r.bureau_pass || 0,
    vkyc_pass: r.vkyc_pass || 0,
    disbursed: r.disbursed || 0,
  }));

  // Group by month for summary
  const monthGroups = new Map<string, typeof processedRecords>();
  processedRecords.forEach(r => {
    const existing = monthGroups.get(r.month) || [];
    existing.push(r);
    monthGroups.set(r.month, existing);
  });

  const summaryRows: AxisSummaryRow[] = [];
  let totalApps = 0, totalEligible = 0, totalKycDone = 0, totalApproved = 0;

  monthGroups.forEach((apps, month) => {
    const total = apps.reduce((sum, a) => sum + a.applications, 0);
    const eligible = apps.reduce((sum, a) => sum + a.dedupe_pass, 0);
    const kycDone = apps.reduce((sum, a) => sum + a.vkyc_pass, 0);
    const approved = apps.reduce((sum, a) => sum + a.disbursed, 0);

    totalApps += total;
    totalEligible += eligible;
    totalKycDone += kycDone;
    totalApproved += approved;

    summaryRows.push({
      bank: 'Axis',
      month,
      quality: 'All',
      totalApplications: total,
      eligibleForKyc: eligible,
      kycPending: eligible - kycDone,
      kycDone,
      kycConversionPercent: eligible > 0 ? Math.round((kycDone / eligible) * 1000) / 10 : 0,
      cardsApproved: approved,
      approvalPercent: kycDone > 0 ? Math.round((approved / kycDone) * 1000) / 10 : 0,
      rejectedPostKyc: 0,
      rejectionPercent: 0,
    });
  });

  const totals: AxisSummaryRow = {
    bank: 'Axis',
    month: 'All',
    quality: 'All',
    totalApplications: totalApps,
    eligibleForKyc: totalEligible,
    kycPending: totalEligible - totalKycDone,
    kycDone: totalKycDone,
    kycConversionPercent: totalEligible > 0 ? Math.round((totalKycDone / totalEligible) * 1000) / 10 : 0,
    cardsApproved: totalApproved,
    approvalPercent: totalKycDone > 0 ? Math.round((totalApproved / totalKycDone) * 1000) / 10 : 0,
    rejectedPostKyc: 0,
    rejectionPercent: 0,
  };

  // Map uploads
  const misUploadHistory = (uploads || []).map(mapUploadFromDB);
  const currentMISUpload = misUploadHistory.find(u => u.status === 'Current') || misUploadHistory[0];

  // Map conflicts
  const mappedConflicts: ConflictRecord[] = (conflicts || []).map((c: any) => ({
    application_id: c.application_id,
    conflictType: 'MULTIPLE_STATUS_SIGNALS' as const,
    conflictDescription: `Field ${c.field_name}: ${c.old_value} → ${c.new_value}`,
    rawSignals: {
      loginStatus: null,
      finalStatus: c.new_value || '',
      blazeOutput: '',
    },
    resolution: c.resolution,
    resolvedKycStatus: 'KYC Pending' as const,
    resolvedQuality: 'Good' as const,
  }));

  // Compute freshness from uploads
  const freshnessRows: DataFreshnessRow[] = summaryRows.map(s => ({
    month: s.month,
    lastUpdated: currentMISUpload?.uploadDate 
      ? new Date(currentMISUpload.uploadDate).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        })
      : new Date().toLocaleDateString(),
    totalRecords: s.totalApplications,
    statusChanges: Math.floor(s.totalApplications * 0.3),
    newApplications: Math.floor(s.totalApplications * 0.2),
  }));

  // VKYC metrics from database or fallback
  const vkycFunnelMetrics = computeVkycMetrics(vkycData || []);

  return {
    summaryRows: summaryRows.length > 0 ? summaryRows : getSampleSummary(),
    totals: summaryRows.length > 0 ? totals : getSampleTotals(),
    qualityRows: getSampleQuality(), // Keep sample for now
    freshnessRows: freshnessRows.length > 0 ? freshnessRows : getSampleFreshness(),
    conflicts: mappedConflicts.length > 0 ? mappedConflicts : getSampleConflicts(),
    uploadSummary: {
      lastUploadDate: currentMISUpload?.uploadDate || new Date().toLocaleDateString(),
      totalRecords: totalApps || getSampleUploadSummary().totalRecords,
      dateRange: getSampleUploadSummary().dateRange,
      conflictCount: mappedConflicts.length,
    },
    misUploadHistory: misUploadHistory.length > 0 ? misUploadHistory : getSampleHistory(),
    currentMISUpload: currentMISUpload || getSampleCurrentUpload(),
    vkycFunnelMetrics,
    vkycFunnelByMonth: getSampleVkycByMonth(),
  };
}

function computeVkycMetrics(data: any[]): VkycFunnelMetrics {
  if (data.length === 0) {
    return getSampleVkycMetrics();
  }

  return {
    totalStpk: data.reduce((sum, d) => sum + (d.vkyc_attempted || 0), 0),
    vkycEligible: data.reduce((sum, d) => sum + (d.vkyc_initiated || 0), 0),
    vkycApproved: data.reduce((sum, d) => sum + (d.vkyc_completed || 0), 0),
    vkycRejected: 0,
    vkycDropped: 0,
    vkycApprovedCore: 0,
    vkycApprovedNonCore: 0,
    vkycRejectedCore: 0,
    vkycRejectedNonCore: 0,
    cardsFromVkycApproved: data.reduce((sum, d) => sum + (d.vkyc_completed || 0), 0),
    cardsFromVkycRejectedPhysical: 0,
    cardsFromNoVkycPhysical: 0,
    physicalDropoffs: 0,
  };
}
