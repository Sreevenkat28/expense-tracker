# Turn on real AI replies for the assistant

The chat assistant already works without any setup: it answers money questions from your data and chats about
simple things (hi, its name, thanks, jokes). To make it talk like ChatGPT, Claude or Gemini (answer anything, in
a natural way), connect an AI service. The AI key stays **inside your Google script**, never in the website.

## What is sent
- The question you type and the last few messages of the chat.
- The app's calculated answer for that question, and a short summary of your totals (income, expenses, budget,
  category totals, savings goals).
- **Never** your individual transactions, descriptions, email or PIN.

## Steps (about 5 minutes)

### 1. Get a key
- **Gemini (has a free tier, recommended to start):** go to https://aistudio.google.com/apikey → **Create API key**.
- **Claude:** create a key at https://console.anthropic.com (paid).

### 2. Update the script
1. Open your script at https://script.google.com (the "Expense Tracker mailer" project).
2. Replace the code with the latest `google-apps-script/Code.gs` from this project and save.
3. Click **Project Settings (gear icon) → Script properties → Add script property** and add:
   | Property | Value |
   |---|---|
   | `AI_API_KEY` | your key |
   | `AI_PROVIDER` | `gemini` (or `anthropic`) |
   | `AI_MODEL` | optional, e.g. `gemini-2.5-flash` or `claude-haiku-5-5`; leave out to use the default |
4. Back in the editor run `authorizeOnce` once and allow the new permission (it now needs to call the AI service).
5. **Deploy → Manage deployments → pencil icon → Version: New version → Deploy.** The web app URL stays the same.

That's it. Open the AI Assistant and say "Hi" or "What's your name?".

## Safety limits built into the script
- 30 questions per hour per browser, 300 per day in total (change `AI_MAX_PER_CLIENT_PER_HOUR` / `AI_MAX_PER_DAY`).
- Questions, summaries and chat history are size-limited. Replies are capped at about 600 tokens.
- If the limit is reached, or the AI is down or offline, the assistant falls back to its built-in answers.

## Notes
- Anyone who has your script URL could call it, within those limits. Treat the daily cap as your cost ceiling.
- If you see the built-in replies even after setup, the model name may be wrong for your account: set `AI_MODEL`.
- To switch the AI off, delete the `AI_API_KEY` property.
