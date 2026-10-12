# Expense Calculator

A simple, clean web app to track your spending. Enter how much money you have, add your expenses, and instantly see what's left.

**Live App**: Deploy on [Streamlit Cloud](https://share.streamlit.io) using this repository.

---

## How it works

1. **Enter your money** — type in how much you have (e.g. $500)
2. **Add expenses** — description, amount, and category
3. **See what's left** — live remaining balance, category breakdown, and a spending progress bar

---

## Features

- ✅ Real-time remaining balance calculation
- ⚠️ Warning when 80%+ of money is spent
- 🚨 Alert when spending exceeds available money
- 📊 Spending breakdown by category with visual bars
- 🗑️ Delete individual expenses
- 💾 Data saved in browser (local storage)

---

## Run Locally

```bash
# Clone and install dependencies
git clone https://github.com/Sreevenkat28/expense-tracker.git
cd expense-tracker

# Install Node.js dependencies
npm install

# Start the dev server
npm run dev
# → open http://127.0.0.1:5173
```

## Run Tests

```bash
npm test
```

## Streamlit Deployment

1. Go to [share.streamlit.io](https://share.streamlit.io)
2. Connect your GitHub account
3. Choose `Sreevenkat28/expense-tracker`, branch `main`, file `streamlit_app.py`
4. Click **Deploy**

Requires: `pip install streamlit` (or handled automatically on Streamlit Cloud via `requirements.txt`)
