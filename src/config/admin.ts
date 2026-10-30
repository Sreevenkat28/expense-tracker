/**
 * Only accounts registered with one of these emails can be an admin. Everyone else is a standard user
 * and never sees the Admin tab. Matching is case-insensitive.
 */
export const ADMIN_EMAILS: string[] = ['simisetty.sreevenkat@gmail.com', 'anantum2026@gmail.com'];

export const isAdminEmail = (email?: string): boolean =>
  !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
