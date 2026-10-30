const LOCAL_CHARS = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/** Why an address is malformed, or null if the format is fine. */
export function emailFormatError(email: string): string | null {
  const value = email.trim();
  const generic = 'Please enter a valid email address (e.g. name@example.com).';
  if (!value) return 'Enter your email address.';
  if (value.length > 254 || /\s/.test(value)) return generic;
  const parts = value.split('@');
  if (parts.length !== 2) return generic;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !LOCAL_CHARS.test(local)) return generic;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return generic;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((l) => DOMAIN_LABEL.test(l))) return generic;
  const tld = labels[labels.length - 1];
  if (!/^(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})$/.test(tld)) return generic;
  return null;
}

export function isValidEmail(email: string): boolean {
  return emailFormatError(email) === null;
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
 * can actually receive mail (MX record via DNS-over-HTTPS). It cannot prove the specific
 * mailbox exists.
 */
export async function checkEmailIsReal(
  email: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): Promise<{ ok: boolean; error?: string; unverified?: boolean }> {
  const clean = email.trim().toLowerCase();
  const formatError = emailFormatError(clean);
  if (formatError) {
    return { ok: false, error: formatError };
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
    if (mx.status === 1) {
      return { ok: false, error: `"${domain}" is not a valid email domain. Check the spelling of your email.` };
    }
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
    // The lookup itself failed (offline / blocked): the format is fine, so don't lock people out
    return { ok: true, unverified: true };
  }
}

/** One mailbox, one form: lowercases, and for Gmail ignores dots and "+tags" (a.b+x@gmail.com == ab@gmail.com). */
export function canonicalEmail(email: string): string {
  const [local = '', domain = ''] = email.trim().toLowerCase().split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return `${local}@${domain}`;
}
