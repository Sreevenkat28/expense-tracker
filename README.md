# Monthly Expense Tracker

A modern, responsive, and private personal finance web application built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**.

Designed to help users manage their monthly finances, track spending patterns, monitor budget utilization in real-time, understand remaining account balances, and identify practical ways to save money.

---

## Key Features

### 1. Home Dashboard
- **Ending Account Balance**: Displays true cumulative balance (`Opening Balance + All-time Deposits - All-time Withdrawals`).
- **Monthly Income & Expenses**: Instant totals for the selected month.
- **Net Monthly Savings & Savings Rate**: Real-time net savings and savings percentage when income is positive.
- **Monthly Budget Progress**: Dynamic progress bar with automatic warnings at **80% budget used** (amber) and **budget exceeded** (red).
- **Recent Transactions**: Instant snapshot of recent ledger activity with quick inline edit/delete.
- **Average Daily Spending**: Pacing metric calculated as `Month-to-date expenses / elapsed days in month`.

### 2. Transaction Management
- **Add, Edit, and Delete**: Quick modal supporting both Expense and Income items.
- **Input Validation**: Prevents invalid numbers, negative amounts, or blank descriptions.
- **Search & Filtering**: Search by description or category; filter by Type (Income / Expense) and Category.
- **Sorting**: Sort by date (newest/oldest) or amount (highest/lowest).
- **CSV Export**: One-click download of filtered or monthly transaction records.

### 3. Expense Categories
Default categories provided:
- 🥗 **Food and groceries**
- 🚗 **Transportation**
- 🛍️ **Shopping**
- 🎬 **Entertainment**
- 📄 **Bills and subscriptions**
- 🎓 **Education**
- 🏷️ **Other**

### 4. Monthly Budgeting
- Customizable monthly spending limit with quick presets ($1,500, $2,500, $3,200, $4,000, $5,000).
- Visual warning when spending crosses **80%** of the target budget.
- Clear warning banner when spending exceeds **100%** of the target budget.
- Category-level breakdown against overall monthly budget.
- Adjustable opening bank balance to align with real statements.

### 5. Spending Insights & Analytics
- **Category Breakdown Chart**: Interactive SVG donut chart with hover slice highlighting and proportion percentages.
- **Month-over-Month Comparison**: Compares the current month against the prior month, including total shift (+/- %) and category-by-category changes.
- **Spending Pattern Summaries**: Plain-English observations of dominant spending areas and pacing.
- **Practical Savings Suggestions**: Data-driven recommendations based on spending spikes, budget overruns, and subscription audits.
- **Proposed Spending Reduction Simulator**: Interactive slider to simulate how cutting 5%–50% in any category impacts monthly and annual cash reserves.

---

## Financial Calculation Rules & Precision

All arithmetic avoids floating-point precision flaws (`0.1 + 0.2 = 0.30000000000000004`) by computing strictly in **integer cents**:

1. **Ending Balance**:
   $$\text{Ending Balance} = \text{Opening Balance} + \sum \text{Income} - \sum \text{Expenses}$$
2. **Net Monthly Savings**:
   $$\text{Net Monthly Savings} = \text{Monthly Income} - \text{Monthly Expenses}$$
3. **Remaining Budget**:
   $$\text{Remaining Budget} = \text{Monthly Budget} - \text{Monthly Expenses}$$
4. **Savings Rate (%)**:
   $$\text{Savings Rate} = \begin{cases} \left(\frac{\text{Net Monthly Savings}}{\text{Monthly Income}}\right) \times 100 & \text{if Income} > 0 \\ 0\% & \text{if Income} \le 0 \end{cases}$$
5. **Average Daily Spending**:
   $$\text{Average Daily Spending} = \begin{cases} \frac{\text{Month-to-Date Expenses}}{\text{Elapsed Days}} & \text{if Elapsed Days} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

## Local Data Storage & Privacy

- All transaction records and budget settings persist in the browser's `localStorage`.
- No external banking APIs, telemetry, or third-party servers required.
- **JSON Export / Backup**: Export complete ledger history anytime with a single click.
- **Evaluation Mode / Sample Data**: Pre-loaded with realistic transactions across September & October 2026. Can be cleared to start with a blank account or reloaded at any time.

---

## Running the Application Locally

### Prerequisites
- Node.js (v20+ or v22 LTS)
- npm (v10+)

### Setup & Launch

1. **Navigate to project directory**:
   ```bash
   cd "/Users/sreevenkatadityasimisetty/Desktop/Expenses tracker "
   ```

2. **Install dependencies** (already installed in workspace):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://127.0.0.1:5173/`.

4. **Run the automated unit test suite**:
   ```bash
   npm test
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```
