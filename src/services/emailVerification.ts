import { EMAIL_SERVICE, isEmailServiceConfigured } from '../config/emailConfig';

const CHALLENGE_KEY = 'expense_tracker_email_challenge_v1'; // sessionStorage: one pending code per tab
const TRUSTED_KEY = 'expense_tracker_trusted_devices_v1'; // localStorage: users who chose "remember me"

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 30 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

// ─── "Is this a real email?" ────────────────────────────────────────────────

// Throwaway-inbox providers: addresses that exist but are not a person's real email
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  'tempmailo.com', 'throwawaymail.com', 'yopmail.com', 'yopmail.net', 'trashmail.com',
  'getnada.com', 'nada.email', 'maildrop.cc', 'dispostable.com', 'fakeinbox.com',
  'mailnesia.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com', 'burnermail.io',
  'spamgourmet.com', 'moakt.com', 'mytemp.email', 'tmpmail.org', 'tmpmail.net',
  'discard.email', 'harakirimail.com', 'mailcatch.com', 'inboxkitten.com', 'example.com',
  'example.org', 'example.net', 'test.com', 'email.com',
]);

// Common typos of big providers, so "name@gmial.com" gets a helpful message
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com', 'hotmial.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com',
};

type DnsAnswer = { type: number; data: string };

async function dnsLookup(domain: string, type: 'MX' | 'A', fetchImpl: typeof fetch): Promise<{ status: number; answers: DnsAnswer[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetchImpl(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
    const json = (await res.json()) as { Status: number; Answer?: DnsAnswer[] };
    return { status: json.Status, answers: json.Answer ?? [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks the address is well-formed, not a disposable/typo domain, and that its domain
 * can actually receive mail (MX record via DNS-over-HTTPS). Whether the specific mailbox exists
 * can only be proven by the emailed code.
 */
export async function checkEmailIsReal(
  email: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<{ ok: boolean; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!isValidEmail(clean)) {
    return { ok: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  const domain = clean.split('@')[1];
  if (DOMAIN_TYPOS[domain]) {
    return { ok: false, error: `Did you mean ${clean.split('@')[0]}@${DOMAIN_TYPOS[domain]}?` };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, error: 'Disposable or placeholder email addresses are not allowed. Use your real email.' };
  }

  try {
    const mx = await dnsLookup(domain, 'MX', fetchImpl);
    if (mx.status === 3) {
      return { ok: false, error: `The domain "${domain}" does not exist. Check the spelling of your email.` };
    }
    // "0 ." is a null MX: the domain explicitly accepts no mail
    const mailServers = mx.answers.filter((a) => a.type === 15 && !/^\d+\s+\.?$/.test(a.data.trim()));
    if (mailServers.length > 0) return { ok: true };
    // No MX: mail can still be delivered to the domain's A record
    const a = await dnsLookup(domain, 'A', fetchImpl);
    if (a.answers.some((r) => r.type === 1)) return { ok: true };
    return { ok: false, error: `"${domain}" cannot receive email. Use a real email address.` };
  } catch {
    return { ok: false, error: 'Could not check that email address right now. Check your internet connection and try again.' };
  }
}

// ─── Codes ──────────────────────────────────────────────────────────────────

/** Uniformly random 6-digit code ("004821" is possible), from the browser's secure RNG. */
export function generateVerificationCode(): string {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000; // avoid modulo bias
  const buf = new Uint32Array(1);
  try {
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return String(buf[0] % 1_000_000).padStart(6, '0');
  } catch {
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  }
}

async function hashCode(code: string, salt: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(`${salt}:${code}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `plain:${salt}:${code}`; // insecure contexts without SubtleCrypto
  }
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(name.length - 1, 5)))}@${domain}`;
}

export type ChallengePurpose = 'register' | 'login';

interface Challenge {
  purpose: ChallengePurpose;
  subject: string; // email (register) or user id (login)
  email: string;
  salt: string;
  hash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
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

async function sendCodeEmail(
  email: string,
  name: string,
  code: string,
  fetchImpl: typeof fetch
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchImpl('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAIL_SERVICE.serviceId,
        template_id: EMAIL_SERVICE.templateId,
        user_id: EMAIL_SERVICE.publicKey,
        template_params: {
          to_email: email,
          to_name: name || 'there',
          passcode: code,
          time: `${CODE_TTL_MS / 60000} minutes`,
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `The email could not be sent (${res.status}). Check the email address and try again.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the email service. Check your internet connection and try again.' };
  }
}

export interface StartChallengeResult {
  ok: boolean;
  error?: string;
  notConfigured?: boolean; // email service keys are missing: no code can be sent
}

/** Generates a fresh random code, stores only its hash, and emails it. Replaces any pending code. */
export async function startChallenge(
  params: { email: string; name: string; purpose: ChallengePurpose; subject: string },
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<StartChallengeResult> {
  const wait = resendWaitSeconds();
  const existing = readChallenge();
  if (wait > 0 && existing && existing.subject === params.subject && existing.purpose === params.purpose) {
    return { ok: false, error: `Please wait ${wait}s before requesting another code.` };
  }
  if (!isEmailServiceConfigured()) {
    clearChallenge();
    return { ok: false, notConfigured: true, error: 'The email service is not set up yet, so a code cannot be sent.' };
  }

  const code = generateVerificationCode();
  const salt = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const sent = await sendCodeEmail(params.email, params.name, code, fetchImpl);
  if (!sent.ok) return sent;

  writeChallenge({
    purpose: params.purpose,
    subject: params.subject,
    email: params.email,
    salt,
    hash: await hashCode(code, salt),
    expiresAt: now + CODE_TTL_MS,
    sentAt: now,
    attempts: 0,
  });
  return { ok: true };
}

export async function verifyChallenge(
  params: { purpose: ChallengePurpose; subject: string },
  input: string,
  now: number = Date.now()
): Promise<{ ok: boolean; error?: string }> {
  const c = readChallenge();
  if (!c || c.purpose !== params.purpose || c.subject !== params.subject) {
    return { ok: false, error: 'No code is pending. Request a new code.' };
  }
  if (now > c.expiresAt) {
    clearChallenge();
    return { ok: false, error: 'That code has expired. Request a new one.' };
  }
  if (c.attempts >= MAX_ATTEMPTS) {
    clearChallenge();
    return { ok: false, error: 'Too many wrong attempts. Request a new code.' };
  }
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 6) {
    return { ok: false, error: 'Enter the 6-digit code from your email.' };
  }
  if ((await hashCode(digits, c.salt)) !== c.hash) {
    const attempts = c.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      clearChallenge();
      return { ok: false, error: 'Too many wrong attempts. Request a new code.' };
    }
    writeChallenge({ ...c, attempts });
    return { ok: false, error: `Incorrect code. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? '' : 's'} left.` };
  }
  clearChallenge();
  return { ok: true };
}

// ─── "Remember this account" (trusted device) ───────────────────────────────

function readTrusted(): string[] {
  try {
    const raw = localStorage.getItem(TRUSTED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isDeviceTrusted(userId: string): boolean {
  return readTrusted().includes(userId);
}

export function trustDevice(userId: string): void {
  try {
    const list = readTrusted();
    if (!list.includes(userId)) localStorage.setItem(TRUSTED_KEY, JSON.stringify([...list, userId]));
  } catch {}
}

export function untrustDevice(userId: string): void {
  try {
    const list = readTrusted();
    if (!list.includes(userId)) return;
    const rest = list.filter((id) => id !== userId);
    if (rest.length > 0) localStorage.setItem(TRUSTED_KEY, JSON.stringify(rest));
    else localStorage.removeItem(TRUSTED_KEY);
  } catch {}
}

/**
 * Log-in needs an emailed code unless the user ticked "remember" AND already proved
 * they own this device with an earlier code. Accounts with no email on file are not asked.
 */
export function loginNeedsCode(user: { id: string; email?: string }, remember: boolean): boolean {
  if (!user.email) return false;
  return !(remember && isDeviceTrusted(user.id));
}
