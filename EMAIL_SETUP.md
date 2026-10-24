# Reset PIN emails from your own Gmail (Google Apps Script)

When someone clicks **Forgot PIN? Reset it by email** and enters their email, a random 6-digit code is
emailed to them **from your Gmail account**. No third-party email service is used: a small script runs inside
your Google account (free) and sends the mail. The script also creates and checks the code.

Sign in to Google as **simisetty.sreevenkat@gmail.com** for all steps below.

## 1. Create the script
1. Go to https://script.google.com and click **New project**.
2. Delete the sample code, then paste the entire contents of `google-apps-script/Code.gs`.
3. Click the project name (top left) and rename it, e.g. `Expense Tracker mailer`. Save (Ctrl/Cmd+S).

## 2. Give it permission to send mail
1. In the function dropdown at the top, choose **authorizeOnce** and click **Run**.
2. Google asks for permission: **Review permissions** → choose your Gmail → if it says
   "Google hasn't verified this app", click **Advanced → Go to Expense Tracker mailer (unsafe)**
   (it is your own script) → **Allow**.
3. You should receive an email "Expense Tracker mailer is ready".

## 3. Publish it as a web app
1. Click **Deploy → New deployment**. Click the gear icon and pick **Web app**.
2. Set **Execute as: Me (simisetty.sreevenkat@gmail.com)** and **Who has access: Anyone**.
3. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
4. Check it: open that URL in a browser. You should see `{"ok":true,...}`.

## 4. Put the URL in the app
Edit `src/config/emailConfig.ts`:

```ts
export const EMAIL_SERVICE = {
  scriptUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
};
```

Then rebuild and push (Streamlit serves the built file):

```bash
npm run build
git add -A && git commit -m "Enable reset emails" && git push
```

## 5. Test it
1. Create an account with an email you can read, then sign out.
2. Click **Forgot PIN? Reset it by email**, enter the email, then **Email Me a Reset Code**.
3. Check the inbox (and spam) for the 6-digit code, enter it with a new PIN, and log in.

## If you change Code.gs later
Click **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same.
(Saving the file alone does not update the live web app.)

## Safety limits built into the script
- Each code: random, hashed in storage, single use, expires in 10 minutes, 5 wrong tries allowed.
- 30 seconds between sends and at most 3 per hour for any one email address.
- At most 80 emails per day in total (Gmail allows about 100 for script emails), so the script cannot
  be used to send unlimited mail from your account.
- The email text is fixed (the code only), so it cannot carry custom messages.

## Limits
- Anyone who knows the web app URL can ask it to email a code to any address (within the limits above).
  The URL is in the public app, so treat this as a convenience feature, not high security.
- Accounts still live in each person's browser. The email only proves the person can read the inbox
  before the PIN on that browser is changed.
- Accounts with no email on file cannot use it; the admin resets their PIN.
