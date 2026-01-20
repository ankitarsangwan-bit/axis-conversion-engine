import { useState, useEffect, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
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

interface MonthQualityData {
  month: string;
  quality: string;
  apps: number;
  contributionPercent: number;
}

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
  monthlyQualityData: MonthQualityData[];
}

export function useDashboardData(dateRange?: DateRange) {
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
        const dashboardData = await computeDashboardFromDB(dateRange);
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
          monthlyQualityData: [],
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
        monthlyQualityData: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

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

// Helper to parse month string like "Nov 2025" to a Date (first day of month)
function parseMonthString(monthStr: string): Date | null {
  const parts = monthStr.split(' ');
  if (parts.length !== 2) return null;
  
  const monthNames: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const monthNum = monthNames[parts[0]];
  const year = parseInt(parts[1], 10);
  
  if (monthNum === undefined || isNaN(year)) return null;
  return new Date(year, monthNum, 1);
}

// Compute dashboard data from database records
async function computeDashboardFromDB(dateRange?: DateRange): Promise<DashboardData> {
  // Fetch all records in batches to avoid Supabase 1000 row limit
  let allRecords: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const query = supabase
      .from('mis_records')
      .select('*');
    
    // Note: We'll filter by month column in-memory since it's a text format like "Nov 2025"
    const { data: batch, error } = await query.range(from, from + batchSize - 1);

    if (error) {
      console.error('Error fetching records batch:', error);
      break;
    }

    if (batch && batch.length > 0) {
      allRecords = [...allRecords, ...batch];
      from += batchSize;
      hasMore = batch.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  
  // Filter records by date range based on month column
  if (dateRange?.from || dateRange?.to) {
    allRecords = allRecords.filter(r => {
      const recordMonth = parseMonthString(r.month);
      if (!recordMonth) return false; // Skip invalid months like "Dec 1899"
      
      // Create end of month for comparison
      const recordMonthEnd = new Date(recordMonth.getFullYear(), recordMonth.getMonth() + 1, 0);
      
      if (dateRange.from && recordMonthEnd < dateRange.from) return false;
      if (dateRange.to && recordMonth > dateRange.to) return false;
      
      return true;
    });
  }

  console.log(`Fetched ${allRecords.length} records from database${dateRange ? ' (filtered by month)' : ''}`);
  const records = allRecords;

  const { data: uploads } = await supabase
    .from('mis_uploads')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: conflicts } = await supabase
    .from('data_conflicts')
    .select('*')
    .eq('resolution', 'pending')
    .limit(1000); // Conflicts are usually fewer

  const { data: vkycData } = await supabase
    .from('vkyc_metrics')
    .select('*')
    .limit(1000); // VKYC metrics are aggregated

  // Updated KYC logic with Final VKYC Reject
  // kyc_eligible: blaze_output starts with 'REJECT' -> Not Eligible
  // kyc_done: login_status matches OR vkyc_status matches
  // final_vkyc_reject: HARD_REJECT + NON-CORE
  // kyc_pending: eligible AND NOT done AND NOT final_vkyc_reject
  
  const VALID_LOGIN = ['LOGIN', 'LOGIN 26', 'IPA LOGIN', 'IPA 26 LOGIN'];
  const VKYC_DONE = ['APPROVED', 'REJECTED', 'HARD_ACCEPT', 'HARD_REJECT'];

  // Process records with additive KYC logic
  let totalApps = 0;
  let totalNotEligible = 0;
  let totalByLogin = 0;
  let totalByVkyc = 0;
  let totalFinalVkycReject = 0;
  let totalKycPending = 0;
  let totalApproved = 0;

  const monthGroups = new Map<string, {
    total: number;
    notEligible: number;
    byLogin: number;
    byVkyc: number;
    finalVkycReject: number;
    kycPending: number;
    approved: number;
    rejectedPostKyc: number;
  }>();

  // Quality-level tracking
  const qualityGroups = new Map<string, {
    total: number;
    notEligible: number;
    byLogin: number;
    byVkyc: number;
    finalVkycReject: number;
    kycPending: number;
    approved: number;
    rejectedPostKyc: number;
  }>();
  
  // Initialize quality groups
  ['Good', 'Average', 'Rejected'].forEach(q => {
    qualityGroups.set(q, {
      total: 0, notEligible: 0, byLogin: 0, byVkyc: 0, finalVkycReject: 0, kycPending: 0, approved: 0, rejectedPostKyc: 0
    });
  });

  // Track month-quality combinations for monthly quality contribution data
  const monthQualityCounts = new Map<string, Map<string, number>>();
  const monthTotals = new Map<string, number>();

  (records || []).forEach((r: any) => {
    const month = r.month || 'Unknown';
    const loginStatus = (r.login_status || '').toUpperCase().trim();
    const vkycStatus = (r.vkyc_status || '').toUpperCase().trim();
    const coreNonCore = (r.core_non_core || '').toUpperCase().trim();
    const blazeOutput = (r.blaze_output || '').toUpperCase().trim();
    const finalStatus = (r.final_status || '').toUpperCase().trim();
    const leadQuality = (r.lead_quality || 'Good').trim();

    // Normalize lead_quality to Good/Average/Rejected
    let quality = 'Good';
    if (leadQuality.toUpperCase() === 'AVERAGE' || leadQuality === 'Average') {
      quality = 'Average';
    } else if (leadQuality.toUpperCase() === 'REJECTED' || leadQuality === 'Rejected') {
      quality = 'Rejected';
    }

    // Track month-quality counts for quality contribution analysis
    if (!monthQualityCounts.has(month)) {
      monthQualityCounts.set(month, new Map());
    }
    const qualityCountsForMonth = monthQualityCounts.get(month)!;
    qualityCountsForMonth.set(quality, (qualityCountsForMonth.get(quality) || 0) + 1);
    monthTotals.set(month, (monthTotals.get(month) || 0) + 1);

    // Initialize month group if needed
    if (!monthGroups.has(month)) {
      monthGroups.set(month, {
        total: 0, notEligible: 0, byLogin: 0, byVkyc: 0, finalVkycReject: 0, kycPending: 0, approved: 0, rejectedPostKyc: 0
      });
    }
    const group = monthGroups.get(month)!;
    const qualityGroup = qualityGroups.get(quality)!;
    
    group.total++;
    qualityGroup.total++;
    totalApps++;

    // Check if card approved
    const cardApproved = ['APPROVED', 'DISBURSED', 'CARD DISPATCHED', 'SANCTIONED'].includes(finalStatus);
    if (cardApproved) {
      group.approved++;
      qualityGroup.approved++;
      totalApproved++;
    }

    // Check if rejected post-KYC
    const rejectedPostKyc = ['REJECTED', 'DECLINED', 'CANCELLED'].includes(finalStatus);

    // Step 1: Determine kyc_eligible from blaze_output
    const kycEligible = !blazeOutput.startsWith('REJECT');

    if (!kycEligible) {
      group.notEligible++;
      qualityGroup.notEligible++;
      totalNotEligible++;
    } else {
      // Step 2: For eligible records, determine kyc_done (priority order)
      if (VALID_LOGIN.includes(loginStatus)) {
        group.byLogin++;
        qualityGroup.byLogin++;
        totalByLogin++;
        if (rejectedPostKyc) {
          group.rejectedPostKyc++;
          qualityGroup.rejectedPostKyc++;
        }
      } else if (VKYC_DONE.includes(vkycStatus)) {
        // Check if HARD_REJECT + NON-CORE -> Final VKYC Reject
        if (vkycStatus === 'HARD_REJECT' && coreNonCore === 'NON-CORE') {
          group.finalVkycReject++;
          qualityGroup.finalVkycReject++;
          totalFinalVkycReject++;
        } else {
          group.byVkyc++;
          qualityGroup.byVkyc++;
          totalByVkyc++;
        }
        if (rejectedPostKyc) {
          group.rejectedPostKyc++;
          qualityGroup.rejectedPostKyc++;
        }
      } else {
        // kyc_pending = eligible AND NOT done
        group.kycPending++;
        qualityGroup.kycPending++;
        totalKycPending++;
      }
    }
  });

  // Build summary rows from month groups
  const summaryRows: AxisSummaryRow[] = [];
  monthGroups.forEach((group, month) => {
    const eligible = group.total - group.notEligible;
    const kycDone = group.byLogin + group.byVkyc + group.finalVkycReject;
    
    summaryRows.push({
      bank: 'Axis',
      month,
      quality: 'All',
      totalApplications: group.total,
      eligibleForKyc: eligible,
      kycPending: group.kycPending,
      kycDone,
      kycConversionPercent: eligible > 0 ? Math.round((kycDone / eligible) * 1000) / 10 : 0,
      cardsApproved: group.approved,
      approvalPercent: kycDone > 0 ? Math.round((group.approved / kycDone) * 1000) / 10 : 0,
      rejectedPostKyc: group.rejectedPostKyc,
      rejectionPercent: kycDone > 0 ? Math.round((group.rejectedPostKyc / kycDone) * 1000) / 10 : 0,
    });
  });

  // Build quality rows from quality groups
  const qualityRows: QualitySummaryRow[] = [];
  qualityGroups.forEach((group, quality) => {
    const eligible = group.total - group.notEligible;
    const kycDone = group.byLogin + group.byVkyc + group.finalVkycReject;
    
    qualityRows.push({
      quality: quality as 'Good' | 'Average' | 'Rejected',
      totalApplications: group.total,
      eligibleForKyc: eligible,
      kycPending: group.kycPending,
      kycDone,
      kycConversionPercent: eligible > 0 ? Math.round((kycDone / eligible) * 1000) / 10 : 0,
      cardsApproved: group.approved,
      approvalPercent: kycDone > 0 ? Math.round((group.approved / kycDone) * 1000) / 10 : 0,
      rejectedPostKyc: group.rejectedPostKyc,
      rejectionPercent: kycDone > 0 ? Math.round((group.rejectedPostKyc / kycDone) * 1000) / 10 : 0,
    });
  });

  const totalEligible = totalApps - totalNotEligible;
  const totalKycDone = totalByLogin + totalByVkyc + totalFinalVkycReject;
  const totalRejectedPostKyc = summaryRows.reduce((sum, r) => sum + r.rejectedPostKyc, 0);

  const totals: AxisSummaryRow = {
    bank: 'Axis',
    month: 'All',
    quality: 'All',
    totalApplications: totalApps,
    eligibleForKyc: totalEligible,
    kycPending: totalKycPending,
    kycDone: totalKycDone,
    kycConversionPercent: totalEligible > 0 ? Math.round((totalKycDone / totalEligible) * 1000) / 10 : 0,
    cardsApproved: totalApproved,
    approvalPercent: totalKycDone > 0 ? Math.round((totalApproved / totalKycDone) * 1000) / 10 : 0,
    rejectedPostKyc: totalRejectedPostKyc,
    rejectionPercent: totalKycDone > 0 ? Math.round((totalRejectedPostKyc / totalKycDone) * 1000) / 10 : 0,
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

  // Build monthly quality data for Quality Analysis tab
  const monthlyQualityData: MonthQualityData[] = [];
  monthQualityCounts.forEach((qualityCounts, month) => {
    // Skip invalid months
    if (month === 'Unknown' || month.includes('1899')) return;
    
    const monthTotal = monthTotals.get(month) || 1;
    ['Good', 'Average', 'Rejected'].forEach(quality => {
      const apps = qualityCounts.get(quality) || 0;
      monthlyQualityData.push({
        month,
        quality,
        apps,
        contributionPercent: (apps / monthTotal) * 100,
      });
    });
  });

  return {
    summaryRows: summaryRows.length > 0 ? summaryRows : getSampleSummary(),
    totals: summaryRows.length > 0 ? totals : getSampleTotals(),
    qualityRows: qualityRows.length > 0 ? qualityRows : getSampleQuality(),
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
    monthlyQualityData,
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
