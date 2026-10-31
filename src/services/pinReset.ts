import { authService, isValidEmail } from './authService';
import { canonicalEmail } from './emailCheck';
import { cloudEnabled, cloudResetPin } from './cloud';
import { startChallenge, verifyChallenge, clearChallenge, StartChallengeResult } from './emailCodes';

/**
 * Forgotten-PIN recovery through the email address given at sign-up.
 * Step 1 emails a random 6-digit code to that address; step 2 checks the code and sets the new PIN.
 */
export async function requestPinReset(
  identifier: string,
  fetchImpl?: typeof fetch
): Promise<StartChallengeResult & { email?: string; name?: string }> {
  const user = authService.findUser(identifier);
  if (!user) {
    // The account may have been made on another device: the online copy decides when the code is checked
    const typed = identifier.trim().toLowerCase();
    if (cloudEnabled() && isValidEmail(typed)) {
      const result = await startChallenge({ email: typed, name: 'there', purpose: 'reset-online', subject: canonicalEmail(typed) }, fetchImpl);
      return { ...result, email: typed };
    }
    return { ok: false, error: 'No account found with that email. Check the spelling or create an account.' };
  }
  if (user.disabled) {
    return { ok: false, error: 'This account has been disabled by an admin.' };
  }
  if (!user.email) {
    return {
      ok: false,
      error: 'This account has no email on file, so a reset email cannot be sent. Ask the admin to reset your PIN.',
    };
  }
  const result = await startChallenge({ email: user.email, name: user.name, purpose: 'reset', subject: user.id }, fetchImpl);
  return { ...result, email: user.email, name: user.name };
}

export async function completePinReset(
  identifier: string,
  code: string,
  newPin: string,
  fetchImpl?: typeof fetch
): Promise<{ ok: boolean; error?: string }> {
  const user = authService.findUser(identifier);
  const typed = identifier.trim().toLowerCase();
  if (!user && !(cloudEnabled() && isValidEmail(typed))) return { ok: false, error: 'Account not found.' };
  if (!newPin.trim() || newPin.trim().length < 4) {
    return { ok: false, error: 'PIN / Password must be at least 4 characters.' };
  }
  const check = await verifyChallenge({ purpose: user ? 'reset' : 'reset-online', subject: user ? user.id : canonicalEmail(typed) }, code, fetchImpl);
  if (!check.ok) return check;
  // Change it online first (so every device gets the new PIN), then on this device
  const online = await cloudResetPin(user?.email ?? typed, newPin, fetchImpl);
  if (!online.ok && !(online.notFound && user)) {
    return { ok: false, error: online.notFound ? 'No account found with that email. Check the spelling or create an account.' : online.error };
  }
  if (user) {
    const res = authService.setPin(user.id, newPin);
    if (!res.success) return { ok: false, error: res.error };
  }
  clearChallenge();
  return { ok: true };
}
