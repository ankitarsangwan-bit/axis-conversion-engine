import { 
  AxisApplication, 
  AxisSummaryRow,
  deriveLeadQuality, 
  isKycCompleted, 
  getKycStatus,
  isCardApproved,
  isRejectedPostKyc,
  getMonthFromDate
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
  // Additional data for Dec 2024
  { application_id: 'AXIS011', blaze_output: 'Good', login_status: 'Login', final_status: 'Approved', last_updated_date: '2024-12-20' },
  { application_id: 'AXIS012', blaze_output: 'STPT', login_status: 'Login', final_status: 'Rejected', last_updated_date: '2024-12-18' },
  { application_id: 'AXIS013', blaze_output: 'Good', login_status: null, final_status: 'IPA', last_updated_date: '2024-12-15' },
  { application_id: 'AXIS014', blaze_output: 'Reject', login_status: null, final_status: 'Declined', last_updated_date: '2024-12-22' },
  { application_id: 'AXIS015', blaze_output: 'Good', login_status: 'Login', final_status: 'Disbursed', last_updated_date: '2024-12-28' },
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

// Generate summary stats by month
export function getAxisSummaryByMonth(): AxisSummaryRow[] {
  const monthGroups = new Map<string, AxisApplication[]>();
  
  sampleAxisApplications.forEach(app => {
    const existing = monthGroups.get(app.month) || [];
    existing.push(app);
    monthGroups.set(app.month, existing);
  });

  const summaryRows: AxisSummaryRow[] = [];

  monthGroups.forEach((apps, month) => {
    const total = apps.length;
    const eligible = apps.filter(a => a.lead_quality !== 'Rejected');
    const eligibleCount = eligible.length;
    const kycDone = eligible.filter(a => a.kyc_completed).length;
    const kycPending = eligibleCount - kycDone;
    const kycConversion = eligibleCount > 0 ? (kycDone / eligibleCount) * 100 : 0;
    
    const cardsApproved = apps.filter(a => isCardApproved(a.final_status)).length;
    const approvalPercent = kycDone > 0 ? (cardsApproved / kycDone) * 100 : 0;
    
    const rejectedPostKyc = apps.filter(a => isRejectedPostKyc(a.final_status, a.kyc_completed)).length;
    const rejectionPercent = kycDone > 0 ? (rejectedPostKyc / kycDone) * 100 : 0;

    summaryRows.push({
      bank: 'Axis',
      month,
      quality: 'All',
      totalApplications: total,
      eligibleForKyc: eligibleCount,
      kycPending,
      kycDone,
      kycConversionPercent: Math.round(kycConversion * 10) / 10,
      cardsApproved,
      approvalPercent: Math.round(approvalPercent * 10) / 10,
      rejectedPostKyc,
      rejectionPercent: Math.round(rejectionPercent * 10) / 10,
    });
  });

  // Sort by month descending
  return summaryRows.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateB.getTime() - dateA.getTime();
  });
}

// Get overall totals
export function getAxisTotals(): AxisSummaryRow {
  const apps = sampleAxisApplications;
  const total = apps.length;
  const eligible = apps.filter(a => a.lead_quality !== 'Rejected');
  const eligibleCount = eligible.length;
  const kycDone = eligible.filter(a => a.kyc_completed).length;
  const kycPending = eligibleCount - kycDone;
  const kycConversion = eligibleCount > 0 ? (kycDone / eligibleCount) * 100 : 0;
  
  const cardsApproved = apps.filter(a => isCardApproved(a.final_status)).length;
  const approvalPercent = kycDone > 0 ? (cardsApproved / kycDone) * 100 : 0;
  
  const rejectedPostKyc = apps.filter(a => isRejectedPostKyc(a.final_status, a.kyc_completed)).length;
  const rejectionPercent = kycDone > 0 ? (rejectedPostKyc / kycDone) * 100 : 0;

  return {
    bank: 'Axis',
    month: 'All',
    quality: 'All',
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
