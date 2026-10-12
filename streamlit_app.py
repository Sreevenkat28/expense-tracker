import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path
import json
from datetime import datetime, date
import calendar

# ---------------------------------------------------------
# Page Configuration
# ---------------------------------------------------------
st.set_page_config(
    page_title="Monthly Expense Tracker",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------
# Default Categories & Sample Data (Stored in Integer Cents)
# ---------------------------------------------------------
EXPENSE_CATEGORIES = [
    "Food and groceries",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills and subscriptions",
    "Education",
    "Other",
]

INCOME_CATEGORIES = [
    "Salary",
    "Freelance",
    "Investments",
    "Refunds",
    "Gifts & Other",
]

INITIAL_TRANSACTIONS = [
    # September 2026
    {"id": "tx-sep-01", "type": "income", "amount_cents": 385000, "description": "TechCorp Bi-Weekly Salary", "category": "Salary", "date": "2026-09-01"},
    {"id": "tx-sep-02", "type": "expense", "amount_cents": 125000, "description": "Apartment Rent & Management", "category": "Bills and subscriptions", "date": "2026-09-02"},
    {"id": "tx-sep-03", "type": "expense", "amount_cents": 14250, "description": "Whole Foods Grocery Run", "category": "Food and groceries", "date": "2026-09-04"},
    {"id": "tx-sep-04", "type": "expense", "amount_cents": 4500, "description": "Chevron Gas Station Fill-up", "category": "Transportation", "date": "2026-09-06"},
    {"id": "tx-sep-05", "type": "expense", "amount_cents": 1899, "description": "Netflix Premium Subscription", "category": "Bills and subscriptions", "date": "2026-09-08"},
    {"id": "tx-sep-06", "type": "expense", "amount_cents": 8520, "description": "Downtown Bistro Dinner", "category": "Food and groceries", "date": "2026-09-11"},
    {"id": "tx-sep-07", "type": "income", "amount_cents": 385000, "description": "TechCorp Bi-Weekly Salary", "category": "Salary", "date": "2026-09-15"},
    {"id": "tx-sep-08", "type": "expense", "amount_cents": 12000, "description": "Electricity & High-speed Internet", "category": "Bills and subscriptions", "date": "2026-09-16"},
    {"id": "tx-sep-09", "type": "expense", "amount_cents": 11500, "description": "New Autumn Running Shoes", "category": "Shopping", "date": "2026-09-18"},
    {"id": "tx-sep-10", "type": "expense", "amount_cents": 6500, "description": "Monthly Metro Pass", "category": "Transportation", "date": "2026-09-20"},
    {"id": "tx-sep-11", "type": "expense", "amount_cents": 4999, "description": "TypeScript Masterclass Course", "category": "Education", "date": "2026-09-22"},
    {"id": "tx-sep-12", "type": "expense", "amount_cents": 6800, "description": "Cinema Tickets & IMAX Popcorn", "category": "Entertainment", "date": "2026-09-25"},
    {"id": "tx-sep-13", "type": "expense", "amount_cents": 18530, "description": "Trader Joes Restock", "category": "Food and groceries", "date": "2026-09-28"},

    # October 2026
    {"id": "tx-oct-01", "type": "income", "amount_cents": 385000, "description": "TechCorp Bi-Weekly Salary", "category": "Salary", "date": "2026-10-01"},
    {"id": "tx-oct-02", "type": "income", "amount_cents": 62000, "description": "Web Development Client Freelance", "category": "Freelance", "date": "2026-10-02"},
    {"id": "tx-oct-03", "type": "expense", "amount_cents": 125000, "description": "Apartment Rent & Management", "category": "Bills and subscriptions", "date": "2026-10-02"},
    {"id": "tx-oct-04", "type": "expense", "amount_cents": 16840, "description": "Costco Wholesale Grocery Bulk", "category": "Food and groceries", "date": "2026-10-03"},
    {"id": "tx-oct-05", "type": "expense", "amount_cents": 5200, "description": "Shell Gas Station Fill-up", "category": "Transportation", "date": "2026-10-05"},
    {"id": "tx-oct-06", "type": "expense", "amount_cents": 1899, "description": "Netflix Premium Subscription", "category": "Bills and subscriptions", "date": "2026-10-08"},
    {"id": "tx-oct-07", "type": "expense", "amount_cents": 1199, "description": "Spotify Family Plan", "category": "Bills and subscriptions", "date": "2026-10-08"},
    {"id": "tx-oct-08", "type": "expense", "amount_cents": 24500, "description": "Warm Winter Jacket & Apparel", "category": "Shopping", "date": "2026-10-09"},
    {"id": "tx-oct-09", "type": "expense", "amount_cents": 9450, "description": "Italian Trattoria Family Dinner", "category": "Food and groceries", "date": "2026-10-10"},
    {"id": "tx-oct-10", "type": "expense", "amount_cents": 3500, "description": "Concert Livestream Ticket", "category": "Entertainment", "date": "2026-10-11"},
    {"id": "tx-oct-11", "type": "expense", "amount_cents": 4500, "description": "Audiobook Library Subscription", "category": "Education", "date": "2026-10-11"},
]

# ---------------------------------------------------------
# Helper Functions (Precise Currency Formatting)
# ---------------------------------------------------------
def format_currency(cents: int, show_sign: bool = False) -> str:
    dollars = abs(cents) / 100.0
    formatted = f"${dollars:,.2f}"
    if cents < 0:
        return f"-{formatted}"
    if show_sign and cents > 0:
        return f"+{formatted}"
    return formatted

def dollars_to_cents(dollars: float) -> int:
    return int(round(dollars * 100))

# ---------------------------------------------------------
# Initialize Session State
# ---------------------------------------------------------
if "transactions" not in st.session_state:
    st.session_state.transactions = [dict(t) for t in INITIAL_TRANSACTIONS]

if "opening_balance_cents" not in st.session_state:
    st.session_state.opening_balance_cents = 450000  # $4,500.00

if "monthly_budget_cents" not in st.session_state:
    st.session_state.monthly_budget_cents = 320000  # $3,200.00

if "selected_month" not in st.session_state:
    st.session_state.selected_month = "2026-10"

# ---------------------------------------------------------
# Sidebar Controls & View Mode
# ---------------------------------------------------------
with st.sidebar:
    st.title("💳 Expense Tracker")
    st.caption("Personal Finance & Budget Pacing Suite")
    
    # View mode switcher (React App vs Native Streamlit)
    app_mode = st.radio(
        "Application View:",
        ["🚀 React Web App", "📊 Native Streamlit Interface"],
        index=0,
        help="Switch between the high-performance React application and the Python Streamlit dashboard.",
    )
    
    st.divider()
    
    # Month Selection
    available_months = sorted(
        list(set(["2026-09", "2026-10", "2026-11"] + [t["date"][:7] for t in st.session_state.transactions])),
        reverse=True
    )
    st.session_state.selected_month = st.selectbox(
        "📅 Selected Month",
        available_months,
        index=available_months.index(st.session_state.selected_month) if st.session_state.selected_month in available_months else 0
    )
    
    st.divider()
    
    # Quick Ledger Reset
    col_reset1, col_reset2 = st.columns(2)
    with col_reset1:
        if st.button("🔄 Reset Sample", use_container_width=True, help="Reload sample dataset"):
            st.session_state.transactions = [dict(t) for t in INITIAL_TRANSACTIONS]
            st.session_state.opening_balance_cents = 450000
            st.session_state.monthly_budget_cents = 320000
            st.session_state.selected_month = "2026-10"
            st.rerun()
    with col_reset2:
        if st.button("🧹 Clean Ledger", use_container_width=True, help="Wipe all transactions to start fresh"):
            st.session_state.transactions = []
            st.rerun()

    st.info("🔒 **Data Privacy**: Transactions persist in memory during your active session. Use CSV Export to save records.")

# ---------------------------------------------------------
# Mode 1: React Application Embedded View
# ---------------------------------------------------------
dist_index = Path(__file__).parent / "dist" / "index.html"

if app_mode == "🚀 React Web App":
    if dist_index.exists():
        html_code = dist_index.read_text(encoding="utf-8")
        st.markdown(
            """
            <style>
            .block-container {
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
            }
            header[data-testid="stHeader"] {
                display: none !important;
            }
            iframe {
                border: none !important;
                width: 100% !important;
                min-height: 100vh !important;
            }
            </style>
            """,
            unsafe_allow_html=True
        )
        components.html(html_code, height=1200, scrolling=True)
        st.stop()
    else:
        st.warning("Production build artifact `dist/index.html` not found. Switching to Native Streamlit View.")

# ---------------------------------------------------------
# Mode 2: Native Streamlit Interface
# ---------------------------------------------------------
curr_month = st.session_state.selected_month
prev_month = "2026-09" if curr_month == "2026-10" else f"{int(curr_month[:4])}-{int(curr_month[5:7])-1:02d}"

# Filter transactions
month_tx = [t for t in st.session_state.transactions if t["date"].startswith(curr_month)]
prev_tx = [t for t in st.session_state.transactions if t["date"].startswith(prev_month)]

# Calculate core metrics
income_cents = sum(t["amount_cents"] for t in month_tx if t["type"] == "income")
expenses_cents = sum(t["amount_cents"] for t in month_tx if t["type"] == "expense")
net_savings_cents = income_cents - expenses_cents

# Ending balance (cumulative up to current month)
cum_tx = [t for t in st.session_state.transactions if t["date"][:7] <= curr_month]
cum_income = sum(t["amount_cents"] for t in cum_tx if t["type"] == "income")
cum_expense = sum(t["amount_cents"] for t in cum_tx if t["type"] == "expense")
ending_balance_cents = st.session_state.opening_balance_cents + cum_income - cum_expense

# Budget pacing
budget_cents = st.session_state.monthly_budget_cents
remaining_budget_cents = budget_cents - expenses_cents
budget_usage_pct = (expenses_cents / budget_cents * 100) if budget_cents > 0 else 0
savings_rate_pct = (net_savings_cents / income_cents * 100) if income_cents > 0 else 0

# Elapsed days calculation
year, month = map(int, curr_month.split("-"))
total_days_in_month = calendar.monthrange(year, month)[1]
today = datetime.now()
if year == today.year and month == today.month:
    elapsed_days = min(today.day, total_days_in_month)
elif year < today.year or (year == today.year and month < today.month):
    elapsed_days = total_days_in_month
else:
    elapsed_days = 0

daily_avg_cents = int(round(expenses_cents / elapsed_days)) if elapsed_days > 0 else 0

# App Tabs
tab_dash, tab_tx, tab_insights, tab_budget = st.tabs([
    "🏠 Dashboard", "📋 Transactions", "📈 Insights", "🎯 Budget"
])

# ---------------------------------------------------------
# Tab 1: Dashboard
# ---------------------------------------------------------
with tab_dash:
    st.subheader(f"{calendar.month_name[month]} {year} Overview")
    
    # KPI Metric Cards
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    kpi1.metric("Ending Account Balance", format_currency(ending_balance_cents), help="Cumulative balance after all income and expenses")
    kpi2.metric("Total Income", format_currency(income_cents), f"{len([t for t in month_tx if t['type'] == 'income'])} deposits")
    kpi3.metric("Total Expenses", format_currency(expenses_cents), f"{len([t for t in month_tx if t['type'] == 'expense'])} transactions", delta_color="inverse")
    kpi4.metric("Net Savings", format_currency(net_savings_cents, True), f"{savings_rate_pct:.1f}% savings rate")

    st.markdown("---")

    # Budget Health & Warnings
    st.markdown("### 🎯 Monthly Budget Progress")
    if budget_usage_pct >= 100:
        st.error(f"🚨 **Budget Exceeded Alert**: You have spent {format_currency(expenses_cents)}, exceeding your {format_currency(budget_cents)} budget by **{format_currency(abs(remaining_budget_cents))}**!")
    elif budget_usage_pct >= 80:
        st.warning(f"⚠️ **80% Budget Warning**: You have used {budget_usage_pct:.1f}% of your budget. Only **{format_currency(remaining_budget_cents)}** remains for this month.")
    else:
        st.success(f"✅ **On Track**: {budget_usage_pct:.1f}% used. **{format_currency(remaining_budget_cents)}** remaining in your spending budget.")

    st.progress(min(1.0, max(0.0, budget_usage_pct / 100.0)))
    
    col_binfo1, col_binfo2, col_binfo3 = st.columns(3)
    col_binfo1.caption(f"Target Budget: **{format_currency(budget_cents)}**")
    col_binfo2.caption(f"Spent so far: **{format_currency(expenses_cents)}**")
    col_binfo3.caption(f"Average Daily Spending: **{format_currency(daily_avg_cents)}/day**")

    st.markdown("---")

    # Recent Transactions List
    st.markdown("### 🕒 Recent Transactions")
    recent = sorted(month_tx, key=lambda x: x["date"], reverse=True)[:5]
    if recent:
        for r in recent:
            c1, c2, c3, c4 = st.columns([2, 4, 2, 2])
            c1.text(r["date"])
            c2.write(f"**{r['description']}** ({r['category']})")
            c3.write(f"{'+' if r['type'] == 'income' else '-'} {r['type'].capitalize()}")
            c4.write(f"**{format_currency(r['amount_cents'], show_sign=True)}**")
    else:
        st.info("No transactions logged for this month yet.")

# ---------------------------------------------------------
# Tab 2: Transactions Management
# ---------------------------------------------------------
with tab_tx:
    st.subheader("Transaction Management")
    
    with st.expander("➕ Add New Transaction", expanded=False):
        with st.form("add_tx_form", clear_on_submit=True):
            f_col1, f_col2 = st.columns(2)
            with f_col1:
                tx_type = st.radio("Type", ["expense", "income"], horizontal=True, format_func=lambda x: x.capitalize())
                tx_amount = st.number_input("Amount ($)", min_value=0.01, step=1.00, format="%.2f")
                tx_desc = st.text_input("Description", placeholder="e.g. Blue Bottle Coffee, Salary")
            with f_col2:
                categories = EXPENSE_CATEGORIES if tx_type == "expense" else INCOME_CATEGORIES
                tx_cat = st.selectbox("Category", categories)
                tx_date = st.date_input("Date", value=date.today())
            
            submit_btn = st.form_submit_button("Record Transaction", use_container_width=True)
            if submit_btn:
                if not tx_desc.strip():
                    st.error("Description is required.")
                else:
                    new_item = {
                        "id": f"tx-{int(datetime.now().timestamp() * 1000)}",
                        "type": tx_type,
                        "amount_cents": dollars_to_cents(tx_amount),
                        "description": tx_desc.strip(),
                        "category": tx_cat,
                        "date": tx_date.strftime("%Y-%m-%d"),
                    }
                    st.session_state.transactions.insert(0, new_item)
                    st.success("Transaction recorded successfully!")
                    st.rerun()

    # Filters & Search
    f_search, f_type, f_cat = st.columns([3, 2, 2])
    with f_search:
        search_query = st.text_input("🔍 Search description or category", placeholder="Type to filter...")
    with f_type:
        filter_type = st.selectbox("Filter Type", ["All", "Expenses Only", "Income Only"])
    with f_cat:
        all_cats = ["All"] + sorted(list(set(EXPENSE_CATEGORIES + INCOME_CATEGORIES)))
        filter_cat = st.selectbox("Filter Category", all_cats)

    # Filtered dataset
    filtered_tx = [t for t in month_tx]
    if search_query:
        q = search_query.lower()
        filtered_tx = [t for t in filtered_tx if q in t["description"].lower() or q in t["category"].lower()]
    if filter_type == "Expenses Only":
        filtered_tx = [t for t in filtered_tx if t["type"] == "expense"]
    elif filter_type == "Income Only":
        filtered_tx = [t for t in filtered_tx if t["type"] == "income"]
    if filter_cat != "All":
        filtered_tx = [t for t in filtered_tx if t["category"] == filter_cat]

    st.write(f"Showing **{len(filtered_tx)}** transactions:")

    # Table view
    if filtered_tx:
        import pandas as pd
        df = pd.DataFrame([
            {
                "Date": t["date"],
                "Description": t["description"],
                "Category": t["category"],
                "Type": t["type"].capitalize(),
                "Amount ($)": (t["amount_cents"] / 100.0) if t["type"] == "income" else -(t["amount_cents"] / 100.0),
            }
            for t in filtered_tx
        ])
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        # CSV Export
        csv_data = df.to_csv(index=False).encode('utf-8')
        st.download_button(
            "📥 Download Transactions CSV",
            data=csv_data,
            file_name=f"transactions_{curr_month}.csv",
            mime="text/csv",
        )
    else:
        st.info("No matching transactions found.")

# ---------------------------------------------------------
# Tab 3: Insights & Savings Suggestions
# ---------------------------------------------------------
with tab_insights:
    st.subheader("Spending Insights & Practical Savings")
    
    col_chart, col_mom = st.columns([1, 1])
    
    # Category Breakdown Chart
    with col_chart:
        st.markdown("#### 🍩 Category Breakdown")
        cat_expenses = {}
        for c in EXPENSE_CATEGORIES:
            cat_expenses[c] = sum(t["amount_cents"] for t in month_tx if t["type"] == "expense" and t["category"] == c)
        
        active_cat_expenses = {k: v / 100.0 for k, v in cat_expenses.items() if v > 0}
        
        if active_cat_expenses:
            try:
                import plotly.express as px
                fig = px.pie(
                    names=list(active_cat_expenses.keys()),
                    values=list(active_cat_expenses.values()),
                    hole=0.45,
                    color_discrete_sequence=px.colors.qualitative.Prism
                )
                fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=320)
                st.plotly_chart(fig, use_container_width=True)
            except ImportError:
                st.bar_chart(active_cat_expenses)
        else:
            st.info("No expense transactions logged to chart.")

    # Month-over-Month Comparison
    with col_mom:
        st.markdown(f"#### 📊 Comparison: {curr_month} vs {prev_month}")
        prev_expense_cents = sum(t["amount_cents"] for t in prev_tx if t["type"] == "expense")
        diff_cents = expenses_cents - prev_expense_cents
        
        if prev_expense_cents > 0:
            pct_change = (diff_cents / prev_expense_cents) * 100
            if diff_cents > 0:
                st.warning(f"🔺 Expenses increased by **{pct_change:.1f}%** (+{format_currency(diff_cents)}) compared to last month.")
            else:
                st.success(f"🔻 Expenses decreased by **{abs(pct_change):.1f}%** ({format_currency(diff_cents)}) compared to last month.")
        else:
            st.info(f"No transactions recorded for {prev_month} to calculate baseline.")

        # Top category callout
        if active_cat_expenses:
            top_cat = max(active_cat_expenses.items(), key=lambda x: x[1])
            st.markdown(f"**Highest Spending Category**: {top_cat[0]} ({format_currency(int(top_cat[1] * 100))})")
        st.markdown(f"**Average Daily Spending**: {format_currency(daily_avg_cents)} / day")

    st.markdown("---")

    # Practical Savings Suggestions (Transparent Rule-Based)
    st.markdown("### 💡 Practical Savings Suggestions")
    suggestions = []
    
    if budget_usage_pct >= 100:
        suggestions.append({
            "title": "Monthly Budget Exceeded",
            "desc": f"Spending has exceeded the monthly budget limit by {format_currency(abs(remaining_budget_cents))}. Trimming discretionary items will prevent cash depletion.",
            "impact": abs(remaining_budget_cents)
        })
    elif budget_usage_pct >= 80:
        suggestions.append({
            "title": "Approaching Budget Threshold",
            "desc": f"80%+ of budget reached with {format_currency(remaining_budget_cents)} remaining. Slow down non-essential purchases.",
            "impact": None
        })

    # High Category Share
    if expenses_cents > 0:
        for cat, cents in cat_expenses.items():
            if (cents / expenses_cents) >= 0.30 and cents > 15000 and cat != "Bills and subscriptions":
                est_savings = int(round(cents * 0.15))
                suggestions.append({
                    "title": f"High Concentration in {cat}",
                    "desc": f"{cat} accounts for {(cents / expenses_cents * 100):.1f}% of total spend. A modest 15% reduction would yield estimated savings.",
                    "impact": est_savings
                })

    for s in suggestions:
        with st.container():
            st.write(f"**{s['title']}**")
            st.caption(s["desc"])
            if s["impact"]:
                st.markdown(f"💰 *Potential Estimated Monthly Savings*: **+{format_currency(s['impact'])}/mo**")
            st.markdown("---")

    # Interactive Proposed Spending Reduction Simulator
    st.markdown("### 🎛️ Interactive Spending Reduction Simulator")
    sim_col1, sim_col2 = st.columns(2)
    with sim_col1:
        sim_cat = st.selectbox("Category to optimize", EXPENSE_CATEGORIES)
        sim_pct = st.slider("Target reduction percentage (%)", 5, 50, 15, step=5)
    with sim_col2:
        cat_spend = cat_expenses.get(sim_cat, 0)
        sim_monthly = int(round(cat_spend * (sim_pct / 100.0)))
        sim_annual = sim_monthly * 12
        st.metric("Projected Monthly Savings", f"+{format_currency(sim_monthly)}")
        st.metric("Projected Annual Reserve Growth", f"+{format_currency(sim_annual)}")
        st.caption("*Projections are estimates based on your current month's logged spending.*")

# ---------------------------------------------------------
# Tab 4: Budget & Account Settings
# ---------------------------------------------------------
with tab_budget:
    st.subheader("Budget & Account Preferences")
    
    b_col1, b_col2 = st.columns(2)
    with b_col1:
        st.markdown("#### 🎯 Set Monthly Spending Budget")
        new_budget = st.number_input(
            "Monthly Budget Cap ($)",
            min_value=100.0,
            value=float(st.session_state.monthly_budget_cents / 100.0),
            step=100.0,
            format="%.2f"
        )
        if st.button("Save Budget Limit"):
            st.session_state.monthly_budget_cents = dollars_to_cents(new_budget)
            st.success("Budget updated!")
            st.rerun()

    with b_col2:
        st.markdown("#### 🏦 Opening Account Balance")
        new_opening = st.number_input(
            "Starting Bank Balance ($)",
            value=float(st.session_state.opening_balance_cents / 100.0),
            step=100.0,
            format="%.2f",
            help="Your initial baseline bank balance for calculating ending cumulative balances."
        )
        if st.button("Save Opening Balance"):
            st.session_state.opening_balance_cents = dollars_to_cents(new_opening)
            st.success("Opening balance updated!")
            st.rerun()
