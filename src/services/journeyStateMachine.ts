/**
 * Journey State Machine for MIS Ingestion
 * 
 * Implements forward-only state machine with:
 * - Status ranking (monotonic progression)
 * - Terminal state protection (Approved/Final Reject are immutable)
 * - Temporal guards (only accept newer records)
 * 
 * This ensures:
 * - No backward state transitions
 * - Terminal states are final
 * - Stale data is ignored
 */

import { normalizeToISODate } from '@/types/axis';

/**
 * Journey stages in order of progression
 * Higher rank = more advanced in journey
 */
export enum JourneyStage {
  // Pre-KYC stages
  NEW = 0,
  IPA = 10,
  DEDUPE_PASS = 20,
  BUREAU_PASS = 30,
  
  // KYC stages
  VKYC_ELIGIBLE = 40,
  VKYC_INITIATED = 50,
  VKYC_ATTEMPTED = 55,
  VKYC_REJECTED = 60,   // VKYC rejected but can still do physical
  VKYC_APPROVED = 65,   // VKYC approved
  LOGIN = 70,           // Physical/login achieved
  
  // Post-KYC stages
  UNDERWRITING = 80,
  SANCTIONED = 85,
  
  // Terminal states (cannot be changed once reached)
  APPROVED = 90,
  DISBURSED = 95,
  CARD_DISPATCHED = 96,
  
  // Terminal rejection (cannot be changed)
  FINAL_REJECT = 100,
}

/**
 * Terminal states - once reached, application is FROZEN
 * Any future updates to these applications are IGNORED
 */
const TERMINAL_STAGES: JourneyStage[] = [
  JourneyStage.APPROVED,
  JourneyStage.DISBURSED,
  JourneyStage.CARD_DISPATCHED,
  JourneyStage.FINAL_REJECT,
];

/**
 * Calculate the journey stage (rank) from application status fields
 */
export function calculateJourneyStage(
  finalStatus: string | null | undefined,
  loginStatus: string | null | undefined,
  vkycStatus: string | null | undefined,
  blazeOutput: string | null | undefined
): JourneyStage {
  const normalizedFinal = (finalStatus || '').toUpperCase().trim();
  const normalizedLogin = (loginStatus || '').toUpperCase().trim();
  const normalizedVkyc = (vkycStatus || '').toUpperCase().trim();
  const normalizedBlaze = (blazeOutput || '').toUpperCase().trim();
  
  // Check terminal states first
  if (normalizedFinal.includes('DISBURSED')) {
    return JourneyStage.DISBURSED;
  }
  if (normalizedFinal.includes('CARD DISPATCH')) {
    return JourneyStage.CARD_DISPATCHED;
  }
  if (normalizedFinal === 'APPROVED' || normalizedFinal.includes('APPROVED')) {
    return JourneyStage.APPROVED;
  }
  if (normalizedFinal === 'REJECTED' || normalizedFinal.includes('REJECTED') || normalizedFinal === 'DECLINED') {
    // Only count as final reject if we've passed the KYC stage
    // Check if KYC was attempted
    const hasLogin = normalizedLogin.includes('LOGIN');
    const hasVkycOutcome = normalizedVkyc === 'APPROVED' || normalizedVkyc === 'REJECTED' || 
                           normalizedVkyc === 'HARD_ACCEPT' || normalizedVkyc === 'HARD_REJECT';
    if (hasLogin || hasVkycOutcome) {
      return JourneyStage.FINAL_REJECT;
    }
  }
  
  // Check post-KYC stages
  if (normalizedFinal === 'SANCTIONED' || normalizedFinal.includes('SANCTION')) {
    return JourneyStage.SANCTIONED;
  }
  if (normalizedFinal === 'LOGGED' || normalizedFinal.includes('UNDERWRITING')) {
    return JourneyStage.UNDERWRITING;
  }
  
  // Check KYC stages - Login
  if (normalizedLogin.includes('LOGIN')) {
    return JourneyStage.LOGIN;
  }
  
  // Check VKYC stages
  if (normalizedVkyc === 'APPROVED' || normalizedVkyc === 'HARD_ACCEPT') {
    return JourneyStage.VKYC_APPROVED;
  }
  if (normalizedVkyc === 'REJECTED' || normalizedVkyc === 'HARD_REJECT') {
    return JourneyStage.VKYC_REJECTED;
  }
  if (normalizedVkyc === 'ATTEMPTED' || normalizedVkyc === 'IN_PROGRESS') {
    return JourneyStage.VKYC_ATTEMPTED;
  }
  if (normalizedVkyc === 'INITIATED' || normalizedVkyc === 'PENDING') {
    return JourneyStage.VKYC_INITIATED;
  }
  if (normalizedVkyc !== '' && normalizedVkyc !== 'NOT_ELIGIBLE' && normalizedVkyc !== 'DROPOFF' && normalizedVkyc !== 'DROPPED') {
    return JourneyStage.VKYC_ELIGIBLE;
  }
  
  // Pre-KYC stages based on blaze output
  if (normalizedBlaze === 'STPK') {
    return JourneyStage.BUREAU_PASS;
  }
  if (normalizedBlaze === 'STPT' || normalizedBlaze === 'STPI') {
    return JourneyStage.DEDUPE_PASS;
  }
  if (normalizedBlaze === 'REJECT') {
    return JourneyStage.DEDUPE_PASS; // Rejected at blaze but still progressed from IPA
  }
  
  // Check IPA status
  if (normalizedFinal === 'IPA') {
    return JourneyStage.IPA;
  }
  
  return JourneyStage.NEW;
}

/**
 * Check if a stage is terminal (application journey is complete)
 */
export function isTerminalStage(stage: JourneyStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

/**
 * Check if a stage transition is allowed (forward-only)
 * 
 * Rules:
 * 1. Terminal stages cannot be changed
 * 2. Can only move forward (higher rank) or stay same
 * 3. Never move backward
 */
export function isTransitionAllowed(
  currentStage: JourneyStage,
  newStage: JourneyStage
): boolean {
  // Terminal stages are frozen
  if (isTerminalStage(currentStage)) {
    return false;
  }
  
  // Only allow forward or equal progression
  return newStage >= currentStage;
}

/**
 * Compare two dates and determine if incoming is newer or equal
 * Returns true if incoming should be considered (>= existing)
 */
export function isNewerOrEqual(
  incomingDate: string | null | undefined,
  existingDate: string | null | undefined
): boolean {
  if (!existingDate) return true; // No existing date, always accept
  if (!incomingDate) return false; // No incoming date, reject
  
  try {
    const incoming = new Date(normalizeToISODate(incomingDate));
    const existing = new Date(normalizeToISODate(existingDate));
    
    // >= comparison (accept same date updates)
    return incoming.getTime() >= existing.getTime();
  } catch {
    // If date parsing fails, be conservative and reject
    console.warn('Date comparison failed:', { incomingDate, existingDate });
    return false;
  }
}

/**
 * Decision result for whether to update a record
 */
export interface UpdateDecision {
  shouldUpdate: boolean;
  reason: string;
  incomingStage: JourneyStage;
  existingStage: JourneyStage;
}

/**
 * Determine if an incoming record should update an existing record
 * 
 * Implements the full state machine logic:
 * 1. Temporal guard: incoming.last_updated_date >= existing.last_updated_date
 * 2. Stage guard: incoming.stage >= existing.stage
 * 3. Terminal guard: existing terminal stages are immutable
 */
export function shouldUpdateRecord(
  incoming: {
    finalStatus: string | null | undefined;
    loginStatus: string | null | undefined;
    vkycStatus: string | null | undefined;
    blazeOutput: string | null | undefined;
    lastUpdatedDate: string | null | undefined;
  },
  existing: {
    finalStatus: string | null | undefined;
    loginStatus: string | null | undefined;
    vkycStatus: string | null | undefined;
    blazeOutput: string | null | undefined;
    lastUpdatedDate: string | null | undefined;
  }
): UpdateDecision {
  const incomingStage = calculateJourneyStage(
    incoming.finalStatus,
    incoming.loginStatus,
    incoming.vkycStatus,
    incoming.blazeOutput
  );
  
  const existingStage = calculateJourneyStage(
    existing.finalStatus,
    existing.loginStatus,
    existing.vkycStatus,
    existing.blazeOutput
  );
  
  // Terminal guard: existing terminal stages are immutable
  if (isTerminalStage(existingStage)) {
    return {
      shouldUpdate: false,
      reason: `Application in terminal state (${JourneyStage[existingStage]}). No updates allowed.`,
      incomingStage,
      existingStage,
    };
  }
  
  // Temporal guard: incoming date must be >= existing date
  if (!isNewerOrEqual(incoming.lastUpdatedDate, existing.lastUpdatedDate)) {
    return {
      shouldUpdate: false,
      reason: `Incoming date (${incoming.lastUpdatedDate}) is older than existing (${existing.lastUpdatedDate}). Stale update ignored.`,
      incomingStage,
      existingStage,
    };
  }
  
  // Stage guard: can only move forward
  if (!isTransitionAllowed(existingStage, incomingStage)) {
    return {
      shouldUpdate: false,
      reason: `Backward transition not allowed: ${JourneyStage[existingStage]} → ${JourneyStage[incomingStage]}. State regression ignored.`,
      incomingStage,
      existingStage,
    };
  }
  
  // All guards passed - allow update
  return {
    shouldUpdate: true,
    reason: `Update allowed: ${JourneyStage[existingStage]} → ${JourneyStage[incomingStage]}`,
    incomingStage,
    existingStage,
  };
}

/**
 * Select the best record from duplicates within same file
 * Picks the one with most advanced journey stage, using date as tiebreaker
 */
export function selectBestRecord<T extends {
  final_status?: string | null;
  login_status?: string | null;
  vkyc_status?: string | null;
  blaze_output?: string | null;
  last_updated_date?: string | null;
}>(records: T[]): T {
  if (records.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  if (records.length === 1) {
    return records[0];
  }
  
  return records.reduce((best, current) => {
    const bestStage = calculateJourneyStage(
      best.final_status,
      best.login_status,
      best.vkyc_status,
      best.blaze_output
    );
    
    const currentStage = calculateJourneyStage(
      current.final_status,
      current.login_status,
      current.vkyc_status,
      current.blaze_output
    );
    
    // Higher stage wins
    if (currentStage > bestStage) {
      return current;
    }
    
    // Same stage - use date as tiebreaker
    if (currentStage === bestStage) {
      if (isNewerOrEqual(current.last_updated_date, best.last_updated_date)) {
        return current;
      }
    }
    
    return best;
  });
}
