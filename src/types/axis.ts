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

// KYC Completion check
// Conversion = KYC Completed when:
// - LOGIN STATUS is present (Login / Login 26) OR
// - FINAL STATUS is not equal to IPA
export function isKycCompleted(loginStatus: string | null, finalStatus: string): boolean {
  const hasLoginStatus = loginStatus !== null && 
    loginStatus !== '' && 
    (loginStatus.toLowerCase().includes('login'));
  
  const finalStatusNotIPA = finalStatus?.toUpperCase()?.trim() !== 'IPA';
  
  return hasLoginStatus || finalStatusNotIPA;
}

export function getKycStatusDisplay(kycCompleted: boolean): KycStatus {
  return kycCompleted ? 'KYC Completed' : 'KYC Pending';
}
