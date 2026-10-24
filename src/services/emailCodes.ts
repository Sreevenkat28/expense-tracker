import { EMAIL_SERVICE, isEmailServiceConfigured } from '../config/emailConfig';

/**
 * Reset codes are created, emailed and checked by the Google Apps Script mailer
 * (google-apps-script/Code.gs), so the browser never sees the code. This module keeps
 * only the local bookkeeping: who the pending code was sent to, and the resend cooldown.
 */

const CHALLENGE_KEY = 'expense_tracker_email_challenge_v1'; // sessionStorage: one pending code per tab

export const CODE_TTL_MS = 10 * 60 * 1000; // matches CODE_TTL_SECONDS in Code.gs
export const RESEND_COOLDOWN_MS = 30 * 1000;

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(name.length - 1, 5)))}@${domain}`;
}

export type ChallengePurpose = 'reset';

interface Challenge {
  purpose: ChallengePurpose;
  subject: string; // user id
  email: string;
  sentAt: number;
}

function readChallenge(): Challenge | null {
  try {
    const raw = sessionStorage.getItem(CHALLENGE_KEY);
    return raw ? (JSON.parse(raw) as Challenge) : null;
  } catch {
    return null;
  }
}

function writeChallenge(c: Challenge | null): void {
  try {
    if (c) sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(c));
    else sessionStorage.removeItem(CHALLENGE_KEY);
  } catch {}
}

export function clearChallenge(): void {
  writeChallenge(null);
}

/** Seconds until another code may be requested (0 when allowed). */
export function resendWaitSeconds(now: number = Date.now()): number {
  const c = readChallenge();
  if (!c) return 0;
  return Math.max(0, Math.ceil((c.sentAt + RESEND_COOLDOWN_MS - now) / 1000));
}

type MailerReply = { ok: boolean; error?: string };

async function callMailer(payload: Record<string, string>, fetchImpl: typeof fetch): Promise<MailerReply> {
  try {
    // No custom headers: this keeps it a "simple" request, which Apps Script accepts from browsers
    const res = await fetchImpl(EMAIL_SERVICE.scriptUrl, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) return { ok: false, error: `The email service returned an error (${res.status}).` };
    return (await res.json()) as MailerReply;
  } catch {
    return { ok: false, error: 'Could not reach the email service. Check your internet connection and try again.' };
  }
}

export interface StartChallengeResult {
  ok: boolean;
  error?: string;
  notConfigured?: boolean; // the mailer URL is missing: no code can be sent
}

/** Asks the mailer to email a fresh random code. Replaces any pending code for that address. */
export async function startChallenge(
  params: { email: string; name: string; purpose: ChallengePurpose; subject: string },
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<StartChallengeResult> {
  if (!isEmailServiceConfigured()) {
    clearChallenge();
    return { ok: false, notConfigured: true, error: 'The email service is not set up yet, so a code cannot be sent.' };
  }
  const wait = resendWaitSeconds();
  const existing = readChallenge();
  if (wait > 0 && existing && existing.subject === params.subject) {
    return { ok: false, error: `Please wait ${wait}s before requesting another code.` };
  }

  const reply = await callMailer({ action: 'send', email: params.email, name: params.name }, fetchImpl);
  if (!reply.ok) return { ok: false, error: reply.error ?? 'The email could not be sent.' };

  writeChallenge({ purpose: params.purpose, subject: params.subject, email: params.email, sentAt: Date.now() });
  return { ok: true };
}

export async function verifyChallenge(
  params: { purpose: ChallengePurpose; subject: string },
  input: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<{ ok: boolean; error?: string }> {
  const c = readChallenge();
  if (!c || c.purpose !== params.purpose || c.subject !== params.subject) {
    return { ok: false, error: 'No code is pending. Request a new code.' };
  }
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 6) {
    return { ok: false, error: 'Enter the 6-digit code from your email.' };
  }
  const reply = await callMailer({ action: 'verify', email: c.email, code: digits }, fetchImpl);
  if (reply.ok) clearChallenge();
  return reply.ok ? { ok: true } : { ok: false, error: reply.error ?? 'Incorrect code.' };
}
