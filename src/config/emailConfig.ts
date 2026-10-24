/**
 * EmailJS settings used to email 6-digit confirmation codes (sent from your Gmail).
 * See EMAIL_SETUP.md for the 5-minute setup. These three values are public by design:
 * EmailJS expects them in browser code. Restrict allowed origins in the EmailJS dashboard.
 *
 * Leave them empty until you have them; the app then shows the code screen but cannot send codes.
 */
export const EMAIL_SERVICE = {
  serviceId: '', // e.g. 'service_abc123'
  templateId: '', // e.g. 'template_xyz789'
  publicKey: '', // e.g. 'AbCdEfGhIjKlMnOp'
};

export function isEmailServiceConfigured(): boolean {
  return Boolean(EMAIL_SERVICE.serviceId && EMAIL_SERVICE.templateId && EMAIL_SERVICE.publicKey);
}
