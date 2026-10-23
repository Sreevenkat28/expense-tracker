import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path
import datetime
import re
import pandas as pd

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
    # ─── Fallback & Auth Interface with All 7 Features ────────────────────────
    
    # Initialize User Database & Session State
    if "users_db" not in st.session_state:
        st.session_state.users_db = {
            "admin@expense.com": {"password": "adminpassword", "role": "admin"},
            "user@expense.com": {"password": "password123", "role": "user"}
        }
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = False
    if "current_user_email" not in st.session_state:
        st.session_state.current_user_email = None
    if "current_user_role" not in st.session_state:
        st.session_state.current_user_role = "user"
    if "monthly_budget_cents" not in st.session_state:
        st.session_state.monthly_budget_cents = 300000
    if "transactions" not in st.session_state:
        st.session_state.transactions = []

    # Issue 4: Email ID Authentication & Regex Validation
    def validate_email(email: str) -> bool:
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        return re.match(pattern, email) is not None

    # ─── AUTHENTICATION SCREEN ────────────────────────────────────────────
    if not st.session_state.logged_in:
        st.markdown("## 💳 Expense Tracker — Authentication")
        auth_tab1, auth_tab2, auth_tab3 = st.tabs(["🔐 Sign In", "📝 Create Account", "🔑 Reset Password"])

        with auth_tab1:
            st.subheader("Sign In")
            si_email = st.text_input("Email ID", key="si_email")
            si_pass = st.text_input("Password", type="password", key="si_pass")
            if st.button("Sign In", use_container_width=True):
                if not validate_email(si_email):
                    st.error("Please enter a valid email address.")
                elif si_email in st.session_state.users_db and st.session_state.users_db[si_email]["password"] == si_pass:
                    st.session_state.logged_in = True
                    st.session_state.current_user_email = si_email
                    st.session_state.current_user_role = st.session_state.users_db[si_email]["role"]
                    st.success("Signed in successfully!")
                    st.rerun()
                else:
                    st.error("Invalid email or password.")

        with auth_tab2:
            st.subheader("Create New Account")
            # Issues 1 & 2: Clears session on creation / ensures proper data state
            su_email = st.text_input("Email ID", key="su_email")
            su_pass = st.text_input("Password", type="password", key="su_pass")
            if st.button("Create Account", use_container_width=True):
                if not validate_email(su_email):
                    st.error("Please enter a valid email address.")
                elif su_email in st.session_state.users_db:
                    st.error("Account already exists with this email.")
                else:
                    st.session_state.users_db[su_email] = {"password": su_pass, "role": "user"}
                    st.session_state.logged_in = True
                    st.session_state.current_user_email = su_email
                    st.session_state.current_user_role = "user"
                    st.session_state.transactions = [] # Clean state on creation
                    st.success("Account created and signed in successfully!")
                    st.rerun()

        with auth_tab3:
            # Issue 3: Password Reset Form
            st.subheader("Reset Password")
            rs_email = st.text_input("Registered Email ID", key="rs_email")
            rs_pass = st.text_input("New Password", type="password", key="rs_pass")
            if st.button("Update Password", use_container_width=True):
                if not validate_email(rs_email):
                    st.error("Please enter a valid email address.")
                elif rs_email in st.session_state.users_db:
                    st.session_state.users_db[rs_email]["password"] = rs_pass
                    st.success("Password reset successfully! You can now sign in.")
                else:
                    st.error("Email address not found.")

    else:
        # ─── MAIN APP DASHBOARD ──────────────────────────────────────────────
        top_c1, top_c2 = st.columns([4, 1])
        top_c1.markdown("## 💳 Expense Tracker & Personal Finance")
        top_c1.caption(f"Logged in as: **{st.session_state.current_user_email}** ({st.session_state.current_user_role.upper()})")
        
        # Issue 1 Fix: Sign Out completely clears session data
        if top_c2.button("🚪 Sign Out", use_container_width=True):
            st.session_state.logged_in = False
            st.session_state.current_user_email = None
            st.session_state.current_user_role = "user"
            st.session_state.transactions = []
            st.success("Signed out and data cleared successfully.")
            st.rerun()

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

        total_income = sum(t["amount"] for t in st.session_state.transactions if t["type"] == "income")
        total_expenses = sum(t["amount"] for t in st.session_state.transactions if t["type"] == "expense")
        net_amount = total_income - total_expenses
        budget_limit = st.session_state.monthly_budget_cents
        budget_remaining = budget_limit - total_expenses
        budget_pct = (total_expenses / budget_limit * 100) if budget_limit > 0 else 0

        # Tabs including Admin Module (Issue 7) if user is admin
        tab_titles = ["📊 Dashboard & Ledger", "📁 CSV Import & Export"]
        if st.session_state.current_user_role == "admin":
            tab_titles.append("🛡️ Admin Panel")

        tabs = st.tabs(tab_titles)

        with tabs[0]:
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

            st.markdown("### ➕ Record Transaction")
            with st.form("add_tx", clear_on_submit=True):
                col_t1, col_t2 = st.columns([1, 1])
                with col_t1:
                    tx_type = st.radio("Transaction Type", ["Expense", "Income"], horizontal=True)
                with col_t2:
                    tx_date = st.date_input("Date", datetime.date.today())

                col_d, col_a, col_c = st.columns([3, 2, 2])
                with col_d:
                    desc = st.text_input("Description", placeholder="e.g. Lunch at Cafe")
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
            st.markdown(f"### 🧾 Transaction History ({len(st.session_state.transactions)})")
            for i, t in enumerate(st.session_state.transactions):
                col_d, col_c, col_type, col_amt2, col_del = st.columns([3, 2, 1, 1, 0.5])
                col_d.write(f"**{t['description']}**  \n<span style='font-size:11px;color:#888'>{t['date']}</span>", unsafe_allow_html=True)
                col_c.caption(t["category"])
                col_type.write(f"*{t['type'].capitalize()}*")
                color = "green" if t["type"] == "income" else "red"
                col_amt2.markdown(f"<strong style='color:{color}'>{'+' if t['type']=='income' else '-'}{fmt(t['amount'])}</strong>", unsafe_allow_html=True)
                if col_del.button("🗑️", key=f"del_{i}", help="Delete"):
                    st.session_state.transactions.pop(i)
                    st.rerun()

        with tabs[1]:
            # Issue 5: CSV Import Feature
            st.markdown("### 📥 Import CSV File")
            uploaded_file = st.file_uploader("Upload CSV (Columns: Date, Type, Description, Category, Amount)", type=["csv"])
            if uploaded_file is not None:
                try:
                    df_csv = pd.read_csv(uploaded_file)
                    if st.button("Process & Import CSV Rows", use_container_width=True):
                        count = 0
                        for _, row in df_csv.iterrows():
                            st.session_state.transactions.append({
                                "id": str(len(st.session_state.transactions) + 1),
                                "type": str(row.get("Type", "expense")).lower(),
                                "amount": to_cents(float(row.get("Amount", 0))),
                                "description": str(row.get("Description", "Imported")),
                                "category": str(row.get("Category", "Other")),
                                "date": str(row.get("Date", datetime.date.today())),
                            })
                            count += 1
                        st.success(f"Successfully imported {count} transactions!")
                        st.rerun()
                except Exception as e:
                    st.error(f"Error reading CSV file: {e}")

            st.divider()
            
            # Issue 6: CSV Export Feature
            st.markdown("### 📤 Export CSV File")
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
                    use_container_width=True,
                )
            else:
                st.info("No transactions available to export.")

        # Issue 7: Admin Module Control Panel
        if st.session_state.current_user_role == "admin" and len(tabs) > 2:
            with tabs[2]:
                st.markdown("### 🛡️ Admin User Control Panel")
                st.write("Control and manage registered application users.")
                
                users_to_remove = []
                for email_id, info in st.session_state.users_db.items():
                    col_u1, col_u2, col_u3 = st.columns([3, 2, 1])
                    col_u1.write(f"**{email_id}**")
                    col_u2.write(f"Role: *{info['role'].upper()}*")
                    if email_id != "admin@expense.com":
                        if col_u3.button("🗑️ Delete User", key=f"admin_del_{email_id}"):
                            users_to_remove.append(email_id)
                    else:
                        col_u3.caption("Protected")

                if users_to_remove:
                    for email_id in users_to_remove:
                        del st.session_state.users_db[email_id]
                    st.success("User(s) deleted successfully.")
                    st.rerun() is this the thing i have to replace the original code to thus
