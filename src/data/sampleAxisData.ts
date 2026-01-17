import { AxisApplication, deriveLeadQuality, isKycCompleted, getKycStatusDisplay } from '@/types/axis';

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
  { application_id: 'AXIS009', blaze_output: 'Approved', login_status: null, final_status: 'Pending Review', last_updated_date: '2025-01-14' },
  { application_id: 'AXIS010', blaze_output: 'Reject', login_status: null, final_status: 'IPA', last_updated_date: '2025-01-17' },
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
    kyc_completed: kycCompleted ? 'Y' : 'N',
    kyc_status_display: getKycStatusDisplay(kycCompleted),
    last_updated_date: raw.last_updated_date,
  };
});

// Summary stats
export const getAxisStats = () => {
  const total = sampleAxisApplications.length;
  const kycCompleted = sampleAxisApplications.filter(a => a.kyc_completed === 'Y').length;
  const kycPending = total - kycCompleted;
  const conversionRate = total > 0 ? ((kycCompleted / total) * 100).toFixed(1) : '0';
  
  const qualityBreakdown = {
    good: sampleAxisApplications.filter(a => a.lead_quality === 'Good').length,
    average: sampleAxisApplications.filter(a => a.lead_quality === 'Average').length,
    rejected: sampleAxisApplications.filter(a => a.lead_quality === 'Rejected').length,
  };

  return { total, kycCompleted, kycPending, conversionRate, qualityBreakdown };
};
