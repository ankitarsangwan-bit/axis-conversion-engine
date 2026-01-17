export type LeadQuality = 'Good' | 'Average' | 'Rejected';

export type KycStatus = 'KYC Done' | 'KYC Pending';

export interface AxisApplication {
  application_id: string;
  blaze_output: string;
  login_status: string | null;
  final_status: string;
  lead_quality: LeadQuality;
  kyc_completed: boolean;
  kyc_status: KycStatus;
  last_updated_date: string;
  month: string;
}

// Summary row for dashboard display
export interface AxisSummaryRow {
  bank: string;
  month: string;
  quality: LeadQuality | 'All';
  totalApplications: number;
  eligibleForKyc: number;
  kycPending: number;
  kycDone: number;
  kycConversionPercent: number;
  cardsApproved: number;
  approvalPercent: number;
  rejectedPostKyc: number;
  rejectionPercent: number;
}

// Lead Quality derivation from BLAZE_OUTPUT
export function deriveLeadQuality(blazeOutput: string): LeadQuality {
  const normalized = blazeOutput?.toUpperCase()?.trim() || '';
  
  if (normalized === 'STPT' || normalized === 'STPI') {
    return 'Average';
  }
  
  if (normalized === 'REJECT') {
    return 'Rejected';
  }
  
  return 'Good';
}

// Genuine post-KYC outcomes (can ONLY happen after KYC completion)
const POST_KYC_OUTCOMES = ['APPROVED', 'DISBURSED', 'LOGGED', 'CARD DISPATCHED', 'SANCTIONED'];

// Post-KYC rejection outcomes
const POST_KYC_REJECTIONS = ['REJECTED', 'DECLINED'];

// Card approved outcomes
const CARD_APPROVED_OUTCOMES = ['APPROVED', 'DISBURSED', 'CARD DISPATCHED', 'SANCTIONED'];

// KYC Completion check
export function isKycCompleted(loginStatus: string | null, finalStatus: string): boolean {
  const hasLoginStatus = loginStatus !== null && 
    loginStatus !== '' && 
    loginStatus.toLowerCase().includes('login');
  
  if (hasLoginStatus) {
    return true;
  }
  
  const normalizedFinalStatus = finalStatus?.toUpperCase()?.trim() || '';
  const isPostKycOutcome = POST_KYC_OUTCOMES.some(outcome => 
    normalizedFinalStatus.includes(outcome)
  );
  
  return isPostKycOutcome;
}

export function getKycStatus(kycCompleted: boolean): KycStatus {
  return kycCompleted ? 'KYC Done' : 'KYC Pending';
}

export function isCardApproved(finalStatus: string): boolean {
  const normalized = finalStatus?.toUpperCase()?.trim() || '';
  return CARD_APPROVED_OUTCOMES.some(outcome => normalized.includes(outcome));
}

export function isRejectedPostKyc(finalStatus: string, kycCompleted: boolean): boolean {
  if (!kycCompleted) return false;
  const normalized = finalStatus?.toUpperCase()?.trim() || '';
  return POST_KYC_REJECTIONS.some(outcome => normalized.includes(outcome));
}

export function getMonthFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
