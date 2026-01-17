export type LeadQuality = 'Good' | 'Average' | 'Rejected';

export type KycStatus = 'KYC Completed' | 'KYC Pending';

export interface AxisApplication {
  application_id: string;
  blaze_output: string;
  login_status: string | null;
  final_status: string;
  lead_quality: LeadQuality;
  kyc_completed: 'Y' | 'N';
  kyc_status_display: KycStatus;
  last_updated_date: string;
  lead_expired?: boolean;
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

// KYC Completion check
// Conversion = KYC Completed when:
// - LOGIN STATUS is present (Login / Login 26) OR
// - FINAL STATUS is a genuine post-KYC outcome (Approved, Disbursed, etc.)
// 
// IMPORTANT: Bank auto-declines (Declined, Pending, Pending Review) WITHOUT login
// are NOT KYC completions - they remain KYC Pending
export function isKycCompleted(loginStatus: string | null, finalStatus: string): boolean {
  // Check if login status is present
  const hasLoginStatus = loginStatus !== null && 
    loginStatus !== '' && 
    loginStatus.toLowerCase().includes('login');
  
  if (hasLoginStatus) {
    return true;
  }
  
  // Check if final status is a genuine post-KYC outcome
  const normalizedFinalStatus = finalStatus?.toUpperCase()?.trim() || '';
  const isPostKycOutcome = POST_KYC_OUTCOMES.some(outcome => 
    normalizedFinalStatus.includes(outcome)
  );
  
  return isPostKycOutcome;
}

export function getKycStatusDisplay(kycCompleted: boolean): KycStatus {
  return kycCompleted ? 'KYC Completed' : 'KYC Pending';
}
