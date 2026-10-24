/**
 * Where the app sends PIN reset emails from.
 *
 * `scriptUrl` is the web app URL of the Google Apps Script in google-apps-script/Code.gs,
 * deployed from the Gmail account that should send the emails (see EMAIL_SETUP.md).
 * It is public by design; the script limits how often it can send.
 *
 * Leave it empty until the script is deployed: the reset screen then says emails are not set up.
 */
export const EMAIL_SERVICE = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbzTPdlt0ErgnPsXymjUp4DKncRcRPguG1tYgXA7Us66MTk_dH9jRMC_T9Us4LmAdUWAmg/exec',
};

export function isEmailServiceConfigured(): boolean {
  return Boolean(EMAIL_SERVICE.scriptUrl);
}
