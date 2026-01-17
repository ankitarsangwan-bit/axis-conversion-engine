import { 
  AxisApplication, 
  AxisSummaryRow,
  QualitySummaryRow,
  DataFreshnessRow,
  ConflictRecord,
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
  const qualities: LeadQuality[] = ['Good', 'Average', 'Rejected'];
  
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
