import { canonicalEmail } from './emailCheck';
import { startChallenge, verifyChallenge, StartChallengeResult } from './emailCodes';

/** Sign-up email proof: a random 6-digit code is emailed, and the account is only created once it is entered. */

export function sendSignupCode(email: string, name: string, fetchImpl?: typeof fetch): Promise<StartChallengeResult> {
  return startChallenge({ email, name, purpose: 'signup', subject: canonicalEmail(email) }, fetchImpl);
}

export const resendSignupCode = sendSignupCode;

export function verifySignupCode(email: string, code: string, fetchImpl?: typeof fetch): Promise<{ ok: boolean; error?: string }> {
  return verifyChallenge({ purpose: 'signup', subject: canonicalEmail(email) }, code, fetchImpl);
}
