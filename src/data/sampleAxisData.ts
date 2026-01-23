import { 
  AxisApplication, 
  AxisSummaryRow,
  QualitySummaryRow,
  DataFreshnessRow,
  ConflictRecord,
  LeadQuality,
  MISUpload,
  StpkApplication,
  VkycFunnelMetrics,
  deriveLeadQuality, 
  isKycCompleted, 
  getKycStatus,
  isCardApproved,
  isRejectedPostKyc,
  getMonthFromDate,
  detectConflict,
  resolveConflict
} from '@/types/axis';

// Raw sample data simulating Axis MIS upload
const rawAxisData = [
  { application_id: 'AXIS001', blaze_output: 'Approved', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-17' },
  { application_id: 'AXIS002', blaze_output: 'STPT', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-17' },
  { application_id: 'AXIS003', blaze_output: 'Good', login_status: 'Login 26', final_status: 'Pending', last_updated_date: '2025-01-16' },
  { application_id: 'AXIS004', blaze_output: 'Reject', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-17' },
  { application_id: 'AXIS005', blaze_output: 'STPI', login_status: null, final_status: 'Declined', last_updated_date: '2025-01-15' },
  { application_id: 'AXIS006', blaze_output: 'Approved', login_status: 'Login', final_status: 'Disbursed', last_updated_date: '2025-01-17' },
  { application_id: 'AXIS007', blaze_output: 'Good', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-16' },
  { application_id: 'AXIS008', blaze_output: 'STPT', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-17' },
  { application_id: 'AXIS009', blaze_output: 'Good', login_status: null, final_status: 'Pending Review', last_updated_date: '2025-01-14' },
  { application_id: 'AXIS010', blaze_output: 'Reject', login_status: null, final_status: 'Declined', last_updated_date: '2025-01-17' },
  // Conflict cases for demonstration
  { application_id: 'AXIS011', blaze_output: 'Good', login_status: 'Login', final_status: 'IPA', last_updated_date: '2025-01-17' },
  { application_id: 'AXIS012', blaze_output: 'STPT', login_status: null, final_status: 'Approved', last_updated_date: '2025-01-18' },
  { application_id: 'AXIS013', blaze_output: 'Reject', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-15' },
  // December 2024 data
  { application_id: 'AXIS014', blaze_output: 'Good', login_status: 'Login', final_status: 'Approved', last_updated_date: '2024-12-20' },
  { application_id: 'AXIS015', blaze_output: 'STPT', login_status: 'Login', final_status: 'Rejected', last_updated_date: '2024-12-18' },
  { application_id: 'AXIS016', blaze_output: 'Good', login_status: null, final_status: 'IPA', last_updated_date: '2024-12-15' },
  { application_id: 'AXIS017', blaze_output: 'Reject', login_status: null, final_status: 'Declined', last_updated_date: '2024-12-22' },
  { application_id: 'AXIS018', blaze_output: 'Good', login_status: 'Login', final_status: 'Disbursed', last_updated_date: '2024-12-28' },
  { application_id: 'AXIS019', blaze_output: 'STPI', login_status: 'Login', final_status: 'Approved', last_updated_date: '2024-12-25' },
  { application_id: 'AXIS020', blaze_output: 'Good', login_status: null, final_status: 'IPA', last_updated_date: '2024-12-10' },
];

// STPK sample data for VKYC Deep-Dive
const rawStpkData = [
  // VKYC Approved - Pure Digital (Card Approved)
  { application_id: 'STPK001', vkyc_eligible: true, vkyc_status: 'Approved', core_non_core: 'Core', login_status: null, final_status: 'Approved', last_updated_date: '2025-01-17' },
  { application_id: 'STPK002', vkyc_eligible: true, vkyc_status: 'Approved', core_non_core: 'Core', login_status: null, final_status: 'Disbursed', last_updated_date: '2025-01-16' },
  { application_id: 'STPK003', vkyc_eligible: true, vkyc_status: 'Approved', core_non_core: 'Non-Core', login_status: null, final_status: 'Approved', last_updated_date: '2025-01-15' },
  { application_id: 'STPK004', vkyc_eligible: true, vkyc_status: 'Approved', core_non_core: 'Core', login_status: null, final_status: 'Pending', last_updated_date: '2025-01-14' },
  
  // VKYC Rejected - Some went to Physical
  { application_id: 'STPK005', vkyc_eligible: true, vkyc_status: 'Rejected', core_non_core: 'Core', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-17' },
  { application_id: 'STPK006', vkyc_eligible: true, vkyc_status: 'Rejected', core_non_core: 'Non-Core', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-16' },
  { application_id: 'STPK007', vkyc_eligible: true, vkyc_status: 'Rejected', core_non_core: 'Core', login_status: null, final_status: 'Pending', last_updated_date: '2025-01-15' },
  { application_id: 'STPK008', vkyc_eligible: true, vkyc_status: 'Rejected', core_non_core: 'Non-Core', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-14' },
  
  // VKYC Dropped (neither approved nor rejected)
  { application_id: 'STPK009', vkyc_eligible: true, vkyc_status: 'Dropped', core_non_core: 'Core', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-17' },
  { application_id: 'STPK010', vkyc_eligible: true, vkyc_status: 'Dropped', core_non_core: 'Non-Core', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-16' },
  { application_id: 'STPK011', vkyc_eligible: true, vkyc_status: 'Dropped', core_non_core: 'Core', login_status: null, final_status: 'Pending', last_updated_date: '2025-01-15' },
  
  // Not VKYC Eligible - Some went to Physical
  { application_id: 'STPK012', vkyc_eligible: false, vkyc_status: 'Not Eligible', core_non_core: 'Core', login_status: 'Login', final_status: 'Approved', last_updated_date: '2025-01-17' },
  { application_id: 'STPK013', vkyc_eligible: false, vkyc_status: 'Not Eligible', core_non_core: 'Non-Core', login_status: 'Login', final_status: 'Disbursed', last_updated_date: '2025-01-16' },
  { application_id: 'STPK014', vkyc_eligible: false, vkyc_status: 'Not Eligible', core_non_core: 'Core', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-15' },
  
  // December 2024 STPK data
  { application_id: 'STPK015', vkyc_eligible: true, vkyc_status: 'Approved', core_non_core: 'Core', login_status: null, final_status: 'Approved', last_updated_date: '2024-12-20' },
  { application_id: 'STPK016', vkyc_eligible: true, vkyc_status: 'Approved', core_non_core: 'Non-Core', login_status: null, final_status: 'Disbursed', last_updated_date: '2024-12-18' },
  { application_id: 'STPK017', vkyc_eligible: true, vkyc_status: 'Rejected', core_non_core: 'Core', login_status: 'Login', final_status: 'Approved', last_updated_date: '2024-12-22' },
  { application_id: 'STPK018', vkyc_eligible: true, vkyc_status: 'Dropped', core_non_core: 'Non-Core', login_status: null, final_status: 'Pending', last_updated_date: '2024-12-25' },
  { application_id: 'STPK019', vkyc_eligible: false, vkyc_status: 'Not Eligible', core_non_core: 'Core', login_status: 'Login', final_status: 'Approved', last_updated_date: '2024-12-28' },
  { application_id: 'STPK020', vkyc_eligible: true, vkyc_status: 'Rejected', core_non_core: 'Non-Core', login_status: null, final_status: 'IPA', last_updated_date: '2024-12-10' },
];

// MIS Upload History
const misUploadHistory: MISUpload[] = [
  {
    uploadId: 'MIS-2025-01-18-001',
    uploadDate: '2025-01-18',
    uploadTime: '09:30 AM',
    recordCount: 20,
    newRecords: 3,
    updatedRecords: 17,
    status: 'Current',
    uploadedBy: 'System Auto-Sync',
  },
  {
    uploadId: 'MIS-2025-01-17-001',
    uploadDate: '2025-01-17',
    uploadTime: '09:15 AM',
    recordCount: 18,
    newRecords: 2,
    updatedRecords: 16,
    status: 'Historical',
    uploadedBy: 'System Auto-Sync',
  },
  {
    uploadId: 'MIS-2025-01-16-001',
    uploadDate: '2025-01-16',
    uploadTime: '09:22 AM',
    recordCount: 16,
    newRecords: 4,
    updatedRecords: 12,
    status: 'Historical',
    uploadedBy: 'System Auto-Sync',
  },
  {
    uploadId: 'MIS-2025-01-15-001',
    uploadDate: '2025-01-15',
    uploadTime: '09:18 AM',
    recordCount: 12,
    newRecords: 5,
    updatedRecords: 7,
    status: 'Historical',
    uploadedBy: 'Manual Upload',
  },
  {
    uploadId: 'MIS-2024-12-28-001',
    uploadDate: '2024-12-28',
    uploadTime: '10:00 AM',
    recordCount: 7,
    newRecords: 7,
    updatedRecords: 0,
    status: 'Historical',
    uploadedBy: 'System Auto-Sync',
  },
];

// Process raw data with Axis business logic
export const sampleAxisApplications: AxisApplication[] = rawAxisData.map((raw) => {
  const lead_quality = deriveLeadQuality(raw.blaze_output);
  const kycCompleted = isKycCompleted(raw.login_status, raw.final_status);
  
  return {
    application_id: raw.application_id,
    blaze_output: raw.blaze_output,
    login_status: raw.login_status,
    final_status: raw.final_status,
    lead_quality,
    kyc_completed: kycCompleted,
    kyc_status: getKycStatus(kycCompleted),
    last_updated_date: raw.last_updated_date,
    month: getMonthFromDate(raw.last_updated_date),
  };
});

// Process STPK data
export const sampleStpkApplications: StpkApplication[] = rawStpkData.map((raw) => {
  const hasLogin = raw.login_status !== null && raw.login_status.toLowerCase().includes('login');
  const cardApproved = isCardApproved(raw.final_status);
  
  return {
    application_id: raw.application_id,
    blaze_output: 'STPK',
    login_status: raw.login_status,
    final_status: raw.final_status,
    vkyc_eligible: raw.vkyc_eligible,
    vkyc_status: raw.vkyc_status as StpkApplication['vkyc_status'],
    core_non_core: raw.core_non_core as StpkApplication['core_non_core'],
    physical_login_achieved: hasLogin,
    card_approved: cardApproved,
    last_updated_date: raw.last_updated_date,
  };
});

// Helper to calculate summary metrics
function calculateMetrics(apps: AxisApplication[]) {
  const total = apps.length;
  const eligible = apps.filter(a => a.lead_quality !== 'Rejected');
  const eligibleCount = eligible.length;
  const kycDone = eligible.filter(a => a.kyc_completed).length;
  const kycPending = eligibleCount - kycDone;
  const kycConversion = eligibleCount > 0 ? (kycDone / eligibleCount) * 100 : 0;
  
  const cardsApproved = apps.filter(a => a.kyc_completed && isCardApproved(a.final_status)).length;
  const approvalPercent = kycDone > 0 ? (cardsApproved / kycDone) * 100 : 0;
  
  const rejectedPostKyc = apps.filter(a => isRejectedPostKyc(a.final_status, a.kyc_completed)).length;
  const rejectionPercent = kycDone > 0 ? (rejectedPostKyc / kycDone) * 100 : 0;

  return {
    totalApplications: total,
    eligibleForKyc: eligibleCount,
    kycPending,
    kycDone,
    kycConversionPercent: Math.round(kycConversion * 10) / 10,
    cardsApproved,
    approvalPercent: Math.round(approvalPercent * 10) / 10,
    rejectedPostKyc,
    rejectionPercent: Math.round(rejectionPercent * 10) / 10,
  };
}

// Full View - Leadership Summary by Month
export function getAxisSummaryByMonth(): AxisSummaryRow[] {
  const monthGroups = new Map<string, AxisApplication[]>();
  
  sampleAxisApplications.forEach(app => {
    const existing = monthGroups.get(app.month) || [];
    existing.push(app);
    monthGroups.set(app.month, existing);
  });

  const summaryRows: AxisSummaryRow[] = [];

  monthGroups.forEach((apps, month) => {
    const metrics = calculateMetrics(apps);
    summaryRows.push({
      bank: 'Axis',
      month,
      quality: 'All',
      ...metrics,
    });
  });

  return summaryRows.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateB.getTime() - dateA.getTime();
  });
}

// Get overall totals for Full View
export function getAxisTotals(): AxisSummaryRow {
  const metrics = calculateMetrics(sampleAxisApplications);
  return {
    bank: 'Axis',
    month: 'All',
    quality: 'All',
    ...metrics,
  };
}

// Quality-Level View - Breakdown by Lead Quality
export function getQualitySummary(): QualitySummaryRow[] {
  // 🔒 LOCKED: 4 quality buckets derived ONLY from blaze_output
  const qualities: LeadQuality[] = ['Good', 'Average', 'Rejected', 'Blank'];
  
  return qualities.map(quality => {
    const qualityApps = sampleAxisApplications.filter(a => a.lead_quality === quality);
    const metrics = calculateMetrics(qualityApps);
    
    return {
      quality,
      ...metrics,
    };
  });
}

// Quality totals (excluding Rejected from conversion)
export function getQualityTotals(): QualitySummaryRow {
  const eligibleApps = sampleAxisApplications.filter(a => a.lead_quality !== 'Rejected');
  const metrics = calculateMetrics(eligibleApps);
  
  return {
    quality: 'Good', // placeholder, represents total
    ...metrics,
  };
}

// Data Freshness View
export function getDataFreshness(): DataFreshnessRow[] {
  const monthGroups = new Map<string, AxisApplication[]>();
  
  sampleAxisApplications.forEach(app => {
    const existing = monthGroups.get(app.month) || [];
    existing.push(app);
    monthGroups.set(app.month, existing);
  });

  const freshnessRows: DataFreshnessRow[] = [];

  monthGroups.forEach((apps, month) => {
    const dates = apps.map(a => new Date(a.last_updated_date).getTime());
    const latestDate = new Date(Math.max(...dates));
    
    // Simulate status changes (in real app, would track historical changes)
    const statusChanges = Math.floor(apps.length * 0.3);
    const newApplications = Math.floor(apps.length * 0.2);
    
    freshnessRows.push({
      month,
      lastUpdated: latestDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      totalRecords: apps.length,
      statusChanges,
      newApplications,
    });
  });

  return freshnessRows.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateB.getTime() - dateA.getTime();
  });
}

// MIS Upload History
export function getMISUploadHistory(): MISUpload[] {
  return misUploadHistory;
}

export function getCurrentMISUpload(): MISUpload | undefined {
  return misUploadHistory.find(u => u.status === 'Current');
}

// Conflict Resolution View
export function getConflictRecords(): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];

  rawAxisData.forEach(raw => {
    const conflictType = detectConflict(raw.login_status, raw.final_status, raw.blaze_output);
    
    if (conflictType) {
      const { resolution, kycCompleted } = resolveConflict(conflictType);
      const quality = deriveLeadQuality(raw.blaze_output);
      
      conflicts.push({
        application_id: raw.application_id,
        conflictType,
        conflictDescription: getConflictDescription(conflictType),
        rawSignals: {
          loginStatus: raw.login_status,
          finalStatus: raw.final_status,
          blazeOutput: raw.blaze_output,
        },
        resolution,
        resolvedKycStatus: getKycStatus(kycCompleted),
        resolvedQuality: quality,
      });
    }
  });

  return conflicts;
}

function getConflictDescription(conflictType: string): string {
  switch (conflictType) {
    case 'LOGIN_IPA_CONFLICT':
      return 'Login status present but Final Status shows IPA (pre-approval stage)';
    case 'POST_KYC_NO_LOGIN':
      return 'Post-KYC outcome recorded without Login status';
    case 'REJECT_WITH_LOGIN':
      return 'Rejected quality lead has Login recorded';
    case 'MULTIPLE_STATUS_SIGNALS':
      return 'Multiple contradictory status signals detected';
    default:
      return 'Unknown conflict';
  }
}

// Get summary of last upload
export function getUploadSummary() {
  const dates = sampleAxisApplications.map(a => new Date(a.last_updated_date).getTime());
  const latestDate = new Date(Math.max(...dates));
  const earliestDate = new Date(Math.min(...dates));
  
  return {
    lastUploadDate: latestDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }),
    totalRecords: sampleAxisApplications.length,
    dateRange: {
      from: earliestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      to: latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    conflictCount: getConflictRecords().length,
  };
}

// STPK / VKYC Deep-Dive Metrics
export function getVkycFunnelMetrics(): VkycFunnelMetrics {
  const apps = sampleStpkApplications;
  
  const totalStpk = apps.length;
  const vkycEligible = apps.filter(a => a.vkyc_eligible).length;
  
  // VKYC Outcomes
  const vkycApproved = apps.filter(a => a.vkyc_status === 'Approved').length;
  const vkycRejected = apps.filter(a => a.vkyc_status === 'Rejected').length;
  const vkycDropped = apps.filter(a => a.vkyc_status === 'Dropped').length;
  
  // Core vs Non-Core split
  const vkycApprovedCore = apps.filter(a => a.vkyc_status === 'Approved' && a.core_non_core === 'Core').length;
  const vkycApprovedNonCore = apps.filter(a => a.vkyc_status === 'Approved' && a.core_non_core === 'Non-Core').length;
  const vkycRejectedCore = apps.filter(a => a.vkyc_status === 'Rejected' && a.core_non_core === 'Core').length;
  const vkycRejectedNonCore = apps.filter(a => a.vkyc_status === 'Rejected' && a.core_non_core === 'Non-Core').length;
  
  // Cards approved paths
  const cardsFromVkycApproved = apps.filter(a => 
    a.vkyc_status === 'Approved' && a.card_approved
  ).length;
  
  const cardsFromVkycRejectedPhysical = apps.filter(a => 
    a.vkyc_status === 'Rejected' && a.physical_login_achieved && a.card_approved
  ).length;
  
  const cardsFromNoVkycPhysical = apps.filter(a => 
    (a.vkyc_status === 'Not Eligible' || a.vkyc_status === 'Dropped') && 
    a.physical_login_achieved && a.card_approved
  ).length;
  
  // Physical drop-offs: VKYC not approved/rejected AND no login achieved
  const physicalDropoffs = apps.filter(a => 
    (a.vkyc_status === 'Dropped' || a.vkyc_status === 'Rejected') && 
    !a.physical_login_achieved
  ).length;
  
  return {
    totalStpk,
    vkycEligible,
    vkycApproved,
    vkycRejected,
    vkycDropped,
    vkycApprovedCore,
    vkycApprovedNonCore,
    vkycRejectedCore,
    vkycRejectedNonCore,
    cardsFromVkycApproved,
    cardsFromVkycRejectedPhysical,
    cardsFromNoVkycPhysical,
    physicalDropoffs,
  };
}

// VKYC Funnel by Month
export function getVkycFunnelByMonth(): Array<VkycFunnelMetrics & { month: string }> {
  const monthGroups = new Map<string, StpkApplication[]>();
  
  sampleStpkApplications.forEach(app => {
    const month = getMonthFromDate(app.last_updated_date);
    const existing = monthGroups.get(month) || [];
    existing.push(app);
    monthGroups.set(month, existing);
  });
  
  const results: Array<VkycFunnelMetrics & { month: string }> = [];
  
  monthGroups.forEach((apps, month) => {
    const totalStpk = apps.length;
    const vkycEligible = apps.filter(a => a.vkyc_eligible).length;
    const vkycApproved = apps.filter(a => a.vkyc_status === 'Approved').length;
    const vkycRejected = apps.filter(a => a.vkyc_status === 'Rejected').length;
    const vkycDropped = apps.filter(a => a.vkyc_status === 'Dropped').length;
    
    const vkycApprovedCore = apps.filter(a => a.vkyc_status === 'Approved' && a.core_non_core === 'Core').length;
    const vkycApprovedNonCore = apps.filter(a => a.vkyc_status === 'Approved' && a.core_non_core === 'Non-Core').length;
    const vkycRejectedCore = apps.filter(a => a.vkyc_status === 'Rejected' && a.core_non_core === 'Core').length;
    const vkycRejectedNonCore = apps.filter(a => a.vkyc_status === 'Rejected' && a.core_non_core === 'Non-Core').length;
    
    const cardsFromVkycApproved = apps.filter(a => a.vkyc_status === 'Approved' && a.card_approved).length;
    const cardsFromVkycRejectedPhysical = apps.filter(a => a.vkyc_status === 'Rejected' && a.physical_login_achieved && a.card_approved).length;
    const cardsFromNoVkycPhysical = apps.filter(a => (a.vkyc_status === 'Not Eligible' || a.vkyc_status === 'Dropped') && a.physical_login_achieved && a.card_approved).length;
    const physicalDropoffs = apps.filter(a => (a.vkyc_status === 'Dropped' || a.vkyc_status === 'Rejected') && !a.physical_login_achieved).length;
    
    results.push({
      month,
      totalStpk,
      vkycEligible,
      vkycApproved,
      vkycRejected,
      vkycDropped,
      vkycApprovedCore,
      vkycApprovedNonCore,
      vkycRejectedCore,
      vkycRejectedNonCore,
      cardsFromVkycApproved,
      cardsFromVkycRejectedPhysical,
      cardsFromNoVkycPhysical,
      physicalDropoffs,
    });
  });
  
  return results.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateB.getTime() - dateA.getTime();
  });
}
