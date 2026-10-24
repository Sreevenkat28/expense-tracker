/**
 * Expense Tracker: PIN reset emails, sent from the Gmail account that owns this script.
 *
 * The app calls this web app two ways (POST, JSON body):
 *   { action: 'send',   email, name }   -> emails a random 6-digit code to `email`
 *   { action: 'verify', email, code }   -> checks the code; { ok: true } if correct
 * The code is generated, stored (hashed) and checked here, so the browser never sees it.
 * See EMAIL_SETUP.md for the 5-minute deployment steps.
 */

var APP_NAME = 'Expense Tracker';
var CODE_TTL_SECONDS = 600; // 10 minutes
var MAX_ATTEMPTS = 5;
var RESEND_COOLDOWN_SECONDS = 30;
var MAX_SENDS_PER_EMAIL_PER_HOUR = 3;
var MAX_SENDS_PER_DAY = 80; // Gmail allows about 100 script emails/day on a normal account

function doGet() {
  return json_({ ok: true, service: APP_NAME + ' reset mailer' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad request.' });
  }

  var email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return json_({ ok: false, error: 'Enter a valid email address.' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === 'send') return handleSend_(email, body.name);
    if (body.action === 'verify') return handleVerify_(email, String(body.code || ''));
    return json_({ ok: false, error: 'Unknown action.' });
  } finally {
    lock.releaseLock();
  }
}

function handleSend_(email, name) {
  var cache = CacheService.getScriptCache();

  if (cache.get('cool:' + email)) {
    return json_({ ok: false, error: 'Please wait ' + RESEND_COOLDOWN_SECONDS + ' seconds before requesting another code.' });
  }
  var hourly = Number(cache.get('hour:' + email) || 0);
  if (hourly >= MAX_SENDS_PER_EMAIL_PER_HOUR) {
    return json_({ ok: false, error: 'Too many codes requested for this email. Try again in an hour.' });
  }
  var props = PropertiesService.getScriptProperties();
  var dayKey = 'day:' + Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  var today = Number(props.getProperty(dayKey) || 0);
  if (today >= MAX_SENDS_PER_DAY) {
    return json_({ ok: false, error: 'The daily email limit was reached. Try again tomorrow or ask the admin to reset your PIN.' });
  }

  var code = randomCode_();
  var salt = Utilities.getUuid();
  var safeName = String(name || 'there').replace(/[\r\n<>]/g, ' ').trim().slice(0, 40) || 'there';

  try {
    MailApp.sendEmail({
      to: email,
      name: APP_NAME,
      subject: 'Your ' + APP_NAME + ' PIN reset code: ' + code,
      body:
        'Hi ' + safeName + ',\n\n' +
        'Your ' + APP_NAME + ' PIN reset code is:\n\n    ' + code + '\n\n' +
        'It expires in ' + CODE_TTL_SECONDS / 60 + ' minutes. If you did not ask to reset your PIN, ignore this email.'
    });
  } catch (err) {
    return json_({ ok: false, error: 'The email could not be sent. Check the address and try again.' });
  }

  cache.put('code:' + email, JSON.stringify({ salt: salt, hash: hash_(salt, code), attempts: 0 }), CODE_TTL_SECONDS);
  cache.put('cool:' + email, '1', RESEND_COOLDOWN_SECONDS);
  cache.put('hour:' + email, String(hourly + 1), 3600);
  props.setProperty(dayKey, String(today + 1));
  return json_({ ok: true });
}

function handleVerify_(email, rawCode) {
  var cache = CacheService.getScriptCache();
  var stored = cache.get('code:' + email);
  if (!stored) return json_({ ok: false, error: 'That code has expired. Request a new one.' });

  var digits = rawCode.replace(/\D/g, '');
  if (digits.length !== 6) return json_({ ok: false, error: 'Enter the 6-digit code from your email.' });

  var record = JSON.parse(stored);
  if (record.attempts >= MAX_ATTEMPTS) {
    cache.remove('code:' + email);
    return json_({ ok: false, error: 'Too many wrong attempts. Request a new code.' });
  }
  if (hash_(record.salt, digits) !== record.hash) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      cache.remove('code:' + email);
      return json_({ ok: false, error: 'Too many wrong attempts. Request a new code.' });
    }
    cache.put('code:' + email, JSON.stringify(record), CODE_TTL_SECONDS);
    var left = MAX_ATTEMPTS - record.attempts;
    return json_({ ok: false, error: 'Incorrect code. ' + left + ' attempt' + (left === 1 ? '' : 's') + ' left.' });
  }

  cache.remove('code:' + email); // single use
  return json_({ ok: true });
}

function randomCode_() {
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 1000000;
  return ('000000' + n).slice(-6);
}

function hash_(salt, code) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + code));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor (Run button) to grant permission to send email. */
function authorizeOnce() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), APP_NAME + ' mailer is ready', 'Permission granted. You can deploy the web app now.');
}
