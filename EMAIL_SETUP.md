# Email confirmation codes (EmailJS + Gmail)

The app emails a random 6-digit code when someone **registers**, and when someone **logs in without
"Remember this account"**. Codes are sent from your Gmail through EmailJS (free tier: ~200 emails/month).

## 1. Connect Gmail
1. Create a free account at https://www.emailjs.com
2. **Email Services → Add New Service → Gmail**, sign in, and allow sending. Copy the **Service ID**.

## 2. Create the email template
**Email Templates → Create New Template**, then set:

- **To Email:** `{{to_email}}`
- **Subject:** `Your Expense Tracker code: {{passcode}}`
- **Content:**

```
Hi {{to_name}},

Your Expense Tracker confirmation code is:

    {{passcode}}

It expires in {{time}}. If you did not request this, ignore this email.
```

Save and copy the **Template ID**.

## 3. Get your public key
**Account → General → Public Key**.

## 4. Add the three values
Edit `src/config/emailConfig.ts`:

```ts
export const EMAIL_SERVICE = {
  serviceId: 'service_...',
  templateId: 'template_...',
  publicKey: '...',
};
```

Then rebuild and push (Streamlit serves the built file):

```bash
npm run build
git add -A && git commit -m "Enable email confirmation codes" && git push
```

## 5. Recommended: lock it down
In EmailJS **Account → Security**, restrict allowed origins to your Streamlit URL
(and `localhost` for testing) so others cannot spend your monthly quota.

## How it behaves
- **Register:** email must be well-formed, not a disposable/placeholder or mistyped domain, and its domain
  must be able to receive mail (DNS MX check). A random code is then emailed; the account is created only
  after the code is entered. Codes expire in 10 minutes, allow 5 attempts, and can be resent every 30 seconds.
- **Log in:** after the correct username/email + PIN, a code is emailed unless the box
  **Remember this account on this device** is ticked *and* this device was already confirmed once.
  Ticking it the first time still requires one code; after that, no emails are sent.
- Accounts created before email existed (no email on file) are not asked for a code.
- Until the keys are added, the code screen appears but no code can be sent.

## Limits (this is a browser-only app)
The check happens in the browser, so it deters casual misuse but is not server-grade security.
The only way to prove an address is real is that the person receives the code. For stronger guarantees,
use a backend (e.g. Supabase) that sends and verifies codes server-side.
