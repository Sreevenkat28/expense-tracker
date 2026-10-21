import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path
import datetime

# ─── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Expense Tracker — Personal Finance",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── Embed the pre-built single-file React app if present ─────────────────────
dist_index = Path(__file__).parent / "dist" / "index.html"

if dist_index.exists():
    # Hide Streamlit chrome for a seamless modern look
    st.markdown(
        """
        <style>
        .block-container { padding: 0 !important; max-width: 100% !important; }
        header[data-testid="stHeader"] { display: none !important; }
        footer { display: none !important; }
        #MainMenu { visibility: hidden; }
        iframe { border: none !important; width: 100% !important; min-height: 100vh; }
        </style>
        """,
        unsafe_allow_html=True,
    )
    html_code = dist_index.read_text(encoding="utf-8")
    components.html(html_code, height=1400, scrolling=True)

else:
    # ─── Fallback: Pure Streamlit interface ──────────────────────────────────
    st.markdown("## 💳 Expense Tracker & Personal Finance")
    st.caption("Track income, expenses, budgets, and cash flow.")

    EXPENSE_CATEGORIES = [
        "Food & Groceries", "Transportation", "Shopping", "Entertainment",
        "Bills & Subscriptions", "Education", "Health", "Other",
    ]
    INCOME_CATEGORIES = [
        "Salary", "Freelance", "Investments", "Refunds", "Gifts & Other",
    ]

    def fmt(cents: int) -> str:
        dollars = abs(cents) / 100.0
        s = f"${dollars:,.2f}"
        return f"-{s}" if cents < 0 else s

    def to_cents(v: float) -> int:
        return int(round(v * 100))

    # Session state initialization
    if "monthly_budget_cents" not in st.session_state:
        st.session_state.monthly_budget_cents = 300000  # $3,000.00
    if "transactions" not in st.session_state:
        # Sample starter transactions
        st.session_state.transactions = [
            {"id": "1", "type": "income", "amount": 350000, "description": "Salary Deposit", "category": "Salary", "date": str(datetime.date.today())},
            {"id": "2", "type": "expense", "amount": 120000, "description": "Apartment Rent", "category": "Bills & Subscriptions", "date": str(datetime.date.today())},
            {"id": "3", "type": "expense", "amount": 6500, "description": "Weekly Groceries", "category": "Food & Groceries", "date": str(datetime.date.today())},
        ]

    # Calculations
    total_income = sum(t["amount"] for t in st.session_state.transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in st.session_state.transactions if t["type"] == "expense")
    net_amount = total_income - total_expenses
    budget_limit = st.session_state.monthly_budget_cents
    budget_remaining = budget_limit - total_expenses
    budget_pct = (total_expenses / budget_limit * 100) if budget_limit > 0 else 0

    # ── Section 4: Exactly Four Summary Cards ─────────────────────────────────
    st.markdown("### 📊 Financial Overview")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("💰 Total Income", fmt(total_income))
    c2.metric("💸 Total Expenses", fmt(total_expenses))
    c3.metric("⚖️ Net Amount", f"{'+' if net_amount >= 0 else ''}{fmt(net_amount)}")
    c4.metric(
        "🎯 Budget Remaining",
        fmt(budget_remaining),
        delta=f"{budget_pct:.0f}% spent",
        delta_color="inverse" if budget_remaining < 0 else "normal",
    )

    st.divider()

    # ── Monthly Budget Setting ────────────────────────────────────────────────
    col_b1, col_b2 = st.columns([3, 1])
    with col_b1:
        new_budget = st.number_input(
            "Monthly Budget Cap ($)", min_value=0.0, step=100.0,
            value=float(budget_limit / 100.0), format="%.2f"
        )
    with col_b2:
        if st.button("Set Budget Cap", use_container_width=True):
            st.session_state.monthly_budget_cents = to_cents(new_budget)
            st.rerun()

    # ── Add Transaction (Income or Expense) ────────────────────────────────────
    st.markdown("### ➕ Record Transaction")
    with st.form("add_tx", clear_on_submit=True):
        col_t1, col_t2 = st.columns([1, 1])
        with col_t1:
            tx_type = st.radio("Transaction Type", ["Expense", "Income"], horizontal=True)
        with col_t2:
            tx_date = st.date_input("Date", datetime.date.today())

        col_d, col_a, col_c = st.columns([3, 2, 2])
        with col_d:
            desc = st.text_input("Description", placeholder="e.g. Lunch at Cafe, Freelance Project")
        with col_a:
            amt = st.number_input("Amount ($)", min_value=0.01, step=1.0, format="%.2f")
        with col_c:
            cat_list = EXPENSE_CATEGORIES if tx_type == "Expense" else INCOME_CATEGORIES
            cat = st.selectbox("Category", cat_list)

        submitted = st.form_submit_button("➕ Save Transaction", use_container_width=True)
        if submitted:
            if not desc.strip():
                st.error("Please enter a valid description.")
            else:
                st.session_state.transactions.insert(0, {
                    "id": str(len(st.session_state.transactions) + 1),
                    "type": tx_type.lower(),
                    "amount": to_cents(amt),
                    "description": desc.strip(),
                    "category": cat,
                    "date": str(tx_date),
                })
                st.success("Transaction recorded successfully!")
                st.rerun()

    st.divider()

    # ── Category Breakdown ────────────────────────────────────────────────────
    if total_expenses > 0:
        st.markdown("### 🏷️ Spending by Category")
        cat_totals = {}
        for t in st.session_state.transactions:
            if t["type"] == "expense":
                cat_totals[t["category"]] = cat_totals.get(t["category"], 0) + t["amount"]

        for cat_name, cents in sorted(cat_totals.items(), key=lambda x: -x[1]):
            pct_cat = (cents / total_expenses * 100) if total_expenses > 0 else 0
            col_l, col_r = st.columns([4, 1])
            col_l.write(f"**{cat_name}**")
            col_r.write(f"**{fmt(cents)}** ({pct_cat:.0f}%)")
            st.progress(pct_cat / 100.0)

        st.divider()

    # ── Transaction Ledger Table & CSV Export ─────────────────────────────────
    st.markdown(f"### 🧾 Transaction History ({len(st.session_state.transactions)})")

    # CSV Export button
    if st.session_state.transactions:
        csv_lines = ["Date,Type,Description,Category,Amount"]
        for t in st.session_state.transactions:
            sign = "-" if t["type"] == "expense" else "+"
            csv_lines.append(f"{t['date']},{t['type'].upper()},\"{t['description']}\",\"{t['category']}\",{sign}{t['amount']/100.0:.2f}")
        csv_data = "\n".join(csv_lines)

        st.download_button(
            label="📥 Download Transactions as CSV",
            data=csv_data,
            file_name=f"transactions_{datetime.date.today()}.csv",
            mime="text/csv",
        )

    for i, t in enumerate(st.session_state.transactions):
        col_d, col_c, col_type, col_amt2, col_del = st.columns([3, 2, 1, 1, 0.5])
        col_d.write(f"**{t['description']}**  \n<span style='font-size:11px;color:#888'>{t['date']}</span>", unsafe_allow_html=True)
        col_c.caption(t["category"])
        col_type.write(f"*{t['type'].capitalize()}*")
        color = "green" if t["type"] == "income" else "red"
        col_amt2.markdown(f"<strong style='color:{color}'>{'+' if t['type']=='income' else '-'}{fmt(t['amount'])}</strong>", unsafe_allow_html=True)
        if col_del.button("🗑️", key=f"del_{i}", help="Delete"):
            st.session_state.transactions.pop(i)
            st.rerun()

    if st.button("🔄 Reset to Default", type="secondary"):
        st.session_state.transactions = []
        st.session_state.monthly_budget_cents = 300000
        st.rerun()
