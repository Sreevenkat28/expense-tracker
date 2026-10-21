# Expense Tracker — Personal Finance App

A modern, reliable personal finance application to record income and expenses, monitor budgets, track savings goals, and ask AI questions about spending.

- **Live Streamlit App**: [https://expense-tracker-zxq6spzzddnitv5c6pm4ry.streamlit.app/](https://expense-tracker-zxq6spzzddnitv5c6pm4ry.streamlit.app/)
- **GitHub Repository**: [https://github.com/Sreevenkat28/expense-tracker](https://github.com/Sreevenkat28/expense-tracker)

---

## 🌟 Features Overview

### 1. 📊 Dashboard
- **Four Summary Cards**:
  - **Total Income**: All deposits recorded in the selected period.
  - **Total Expenses**: All expenses incurred in the selected period.
  - **Net Amount**: Real-time cashflow surplus or deficit (Income minus Expenses).
  - **Budget Remaining**: Remaining amount left from your spending budget.
- **Monthly Spending Trajectory**: Daily spending bar timeline showing peak spending days and daily average.
- **Category Spending Chart**: Interactive proportional donut visualization.
- **Recent Transactions List**: Quick view with direct edit and delete actions.

### 2. 🧾 Transactions Ledger
- **Income & Expense Tracking**: Add, view, edit, and delete transactions.
- **Search & Filters**: Search descriptions/categories, filter by Type (Income/Expense), Category, or Date scope (Selected Month or All-Time).
- **Sort Options**: Sort by newest, oldest, highest, or lowest amount.
- **Export Formats**: One-click **CSV Spreadsheet** export, **JSON Data Backup**, and formatted printing.

### 3. 🎯 Budgets & Category Spending Limits
- **Monthly Budget Cap**: Set spending ceilings with real-time pacing alerts (80% warning and over-budget notices).
- **Category Spending Limits**: Set dedicated limits for categories such as Food & Groceries, Travel, Shopping, etc., with spent vs limit progress bars.
- **Opening Account Balance**: Baseline starting bank balance for tracking true account balance.

### 4. 🐷 Savings Goals
- Set target amounts, target dates, and custom categories for milestone savings.
- Track completion percentage with dynamic progress bars.
- One-click **Add Funds (Deposit)** or **Withdraw** actions.

### 5. 📈 Insights & Analytics
- Category expense breakdown with proportional percentages.
- Month-over-month percentage changes and category shift analysis.
- Daily spending velocity and automated transparent spending observations.

### 6. 🤖 AI Assistant & Smart Natural Language Entry
- **Smart Natural Language Entry**: Type inputs like *"Spent ₹250 on lunch"* or *"Earned $1200 freelance"*.
- **Review Before Saving**: In compliance with financial rules, parses amount, type, category, and date into an editable preview card requiring user confirmation before saving.
- **Grounded Spending Q&A**: Answers questions about spending, budgets, and savings targets calculated directly from real user data with zero hallucinations.

---

## 🛠️ Technology Stack

- **Client App**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Bundler**: Vite with `vite-plugin-singlefile`
- **Cloud Interface**: Streamlit (`streamlit_app.py`) for Streamlit Cloud deployment
- **Testing**: Vitest for financial calculations, parser logic, and input validation

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/Sreevenkat28/expense-tracker.git
cd expense-tracker

# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Run Vitest test suite
npm test

# Build singlefile bundle for Streamlit
npm run build
```

---

## ☁️ Streamlit Deployment

This repository runs seamlessly on [Streamlit Community Cloud](https://streamlit.io/cloud):
1. The app detects `dist/index.html` (the bundled React app) and renders it full-width with responsive height.
2. In environments where `dist/index.html` is not built, `streamlit_app.py` provides a pure Python Streamlit interface with 4 summary cards, income/expense tracking, category breakdown, and CSV export.
