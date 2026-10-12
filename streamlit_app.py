import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path

# ─── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Expense Calculator",
    page_icon="💳",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ─── Embed the pre-built single-file React app ────────────────────────────────
dist_index = Path(__file__).parent / "dist" / "index.html"

if dist_index.exists():
    # Hide Streamlit chrome for a seamless look
    st.markdown(
        """
        <style>
        .block-container { padding: 0 !important; max-width: 100% !important; }
        header[data-testid="stHeader"] { display: none !important; }
        footer { display: none !important; }
        #MainMenu { visibility: hidden; }
        iframe { border: none !important; width: 100% !important; }
        </style>
        """,
        unsafe_allow_html=True,
    )
    html_code = dist_index.read_text(encoding="utf-8")
    components.html(html_code, height=1100, scrolling=True)

else:
    # ─── Fallback: Pure Streamlit interface ──────────────────────────────────
    st.markdown("## 💳 Expense Calculator")
    st.caption("Enter your money, add expenses, see what's left.")

    CATEGORIES = [
        "Food & Groceries", "Transportation", "Shopping", "Entertainment",
        "Bills & Subscriptions", "Education", "Health", "Other",
    ]

    def fmt(cents: int) -> str:
        dollars = abs(cents) / 100.0
        s = f"${dollars:,.2f}"
        return f"-{s}" if cents < 0 else s

    def to_cents(v: float) -> int:
        return int(round(v * 100))

    # Session state
    if "starting_cents" not in st.session_state:
        st.session_state.starting_cents = 0
    if "expenses" not in st.session_state:
        st.session_state.expenses = []

    # ── Step 1: Set Money ─────────────────────────────────────────────────────
    st.markdown("### Step 1 — How much money do you have?")
    col_amt, col_btn = st.columns([3, 1])
    with col_amt:
        money_input = st.number_input(
            "Your starting amount ($)", min_value=0.0, step=10.0,
            value=st.session_state.starting_cents / 100.0,
            format="%.2f", label_visibility="collapsed",
            placeholder="Enter your total money (e.g. 500.00)"
        )
    with col_btn:
        if st.button("✅ Set", use_container_width=True):
            st.session_state.starting_cents = to_cents(money_input)
            st.rerun()

    starting = st.session_state.starting_cents
    if starting > 0:
        st.success(f"Starting money set to **{fmt(starting)}**")

    st.divider()

    # ── Calculations ──────────────────────────────────────────────────────────
    total_spent = sum(e["amount"] for e in st.session_state.expenses)
    remaining = starting - total_spent
    pct = min(100.0, (total_spent / starting * 100)) if starting > 0 else 0

    # ── Summary Cards ─────────────────────────────────────────────────────────
    if starting > 0:
        c1, c2, c3 = st.columns(3)
        c1.metric("💰 You Have", fmt(starting))
        c2.metric("💸 Total Spent", fmt(total_spent))
        delta_color = "inverse" if remaining < 0 else "normal"
        c3.metric("✅ Remaining", fmt(remaining), delta_color=delta_color)

        # Status message
        if remaining < 0:
            st.error(f"🚨 Over budget! You've spent **{fmt(abs(remaining))}** more than you have.")
        elif pct >= 80:
            st.warning(f"⚠️ You've spent **{pct:.0f}%** of your money. Only **{fmt(remaining)}** left!")
        elif total_spent > 0:
            st.success(f"✅ You have **{fmt(remaining)}** remaining ({100 - pct:.0f}% of your money).")

        # Progress bar
        st.progress(pct / 100.0)
        st.divider()

    # ── Step 2: Add Expense ───────────────────────────────────────────────────
    st.markdown("### Step 2 — Add an Expense")
    with st.form("add_expense", clear_on_submit=True):
        desc = st.text_input("Description", placeholder="e.g. Groceries, Rent, Coffee")
        col_a, col_b = st.columns(2)
        with col_a:
            amount = st.number_input("Amount ($)", min_value=0.01, step=1.0, format="%.2f")
        with col_b:
            cat = st.selectbox("Category", CATEGORIES)
        submitted = st.form_submit_button("➕ Add Expense", use_container_width=True)

        if submitted:
            if not desc.strip():
                st.error("Please enter a description.")
            else:
                st.session_state.expenses.insert(0, {
                    "id": f"{len(st.session_state.expenses)}",
                    "description": desc.strip(),
                    "amount": to_cents(amount),
                    "category": cat,
                })
                st.rerun()

    # ── Category Breakdown ────────────────────────────────────────────────────
    if st.session_state.expenses and total_spent > 0:
        st.divider()
        st.markdown("### 📊 Spending by Category")
        cat_totals = {}
        for e in st.session_state.expenses:
            cat_totals[e["category"]] = cat_totals.get(e["category"], 0) + e["amount"]

        for cat_name, cents in sorted(cat_totals.items(), key=lambda x: -x[1]):
            pct_cat = cents / total_spent * 100
            col_l, col_r = st.columns([4, 1])
            col_l.write(f"**{cat_name}**")
            col_r.write(f"**{fmt(cents)}** ({pct_cat:.0f}%)")
            st.progress(pct_cat / 100.0)

    # ── Expense List ──────────────────────────────────────────────────────────
    if st.session_state.expenses:
        st.divider()
        st.markdown(f"### 🧾 Expenses ({len(st.session_state.expenses)})")
        for i, e in enumerate(st.session_state.expenses):
            col_d, col_c, col_a2, col_del = st.columns([3, 2, 1, 0.5])
            col_d.write(f"**{e['description']}**")
            col_c.caption(e["category"])
            col_a2.write(f"**-{fmt(e['amount'])}**")
            if col_del.button("🗑️", key=f"del_{i}", help="Remove"):
                st.session_state.expenses.pop(i)
                st.rerun()

    if st.button("🔄 Reset Everything", type="secondary"):
        st.session_state.starting_cents = 0
        st.session_state.expenses = []
        st.rerun()
