/**
 * Export utilities for generating PDF, PNG Image, CSV, JSON, and Print formats.
 */

interface ExpenseItem {
  id: string;
  description: string;
  amount: number; // in cents
  category: string;
  date: string;
}

const fmtCurrency = (cents: number): string => {
  const abs = Math.abs(cents) / 100;
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents < 0 ? `-$${str}` : `$${str}`;
};

const getTimestampString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 1. CSV EXPORT
 */
export function exportToCSV(expenses: ExpenseItem[], budgetCents: number) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budgetCents - totalSpent;

  const rows = [
    ['--- EXPENSE TRACKER FINANCIAL REPORT ---'],
    ['Generated Date', new Date().toLocaleDateString('en-US')],
    ['Total Budget', fmtCurrency(budgetCents)],
    ['Total Spent', fmtCurrency(totalSpent)],
    ['Remaining Balance', fmtCurrency(remaining)],
    [''],
    ['Date', 'Description', 'Category', 'Amount (USD)'],
    ...expenses.map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      (e.amount / 100).toFixed(2),
    ]),
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `expenses_report_${getTimestampString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 2. JSON EXPORT (Full Data Backup)
 */
export function exportToJSON(expenses: ExpenseItem[], budgetCents: number) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const data = {
    exportedAt: new Date().toISOString(),
    budgetUSD: (budgetCents / 100).toFixed(2),
    totalSpentUSD: (totalSpent / 100).toFixed(2),
    remainingUSD: ((budgetCents - totalSpent) / 100).toFixed(2),
    transactionCount: expenses.length,
    transactions: expenses.map(e => ({
      id: e.id,
      date: e.date,
      description: e.description,
      category: e.category,
      amountUSD: (e.amount / 100).toFixed(2),
      amountCents: e.amount,
    })),
  };

  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonStr);
  link.setAttribute('download', `expenses_backup_${getTimestampString()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 3. PNG IMAGE EXPORT (High-Resolution Infographic Snapshot)
 */
export function exportToPNG(
  expenses: ExpenseItem[],
  budgetCents: number,
  isDark: boolean
): Promise<void> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve();

    const width = 1200;
    // Calculate dynamic height based on transactions
    const baseHeight = 650;
    const rowsCount = Math.min(10, expenses.length);
    const height = baseHeight + rowsCount * 45;

    canvas.width = width;
    canvas.height = height;

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const remaining = budgetCents - totalSpent;
    const pctSpent = budgetCents > 0 ? (totalSpent / budgetCents) * 100 : 0;

    // Palette
    const bg = isDark ? '#090d16' : '#ffffff';
    const cardBg = isDark ? '#111827' : '#f8fafc';
    const border = isDark ? '#1f2937' : '#e2e8f0';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const subColor = isDark ? '#94a3b8' : '#64748b';
    const emerald = '#10b981';
    const rose = '#f43f5e';

    // 1. Draw Canvas Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Header Banner
    ctx.fillStyle = emerald;
    ctx.beginPath();
    ctx.roundRect(50, 45, 48, 48, 12);
    ctx.fill();

    // Icon text on logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 74, 78);

    // Header Title
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Expense Tracker — Financial Statement', 115, 68);

    ctx.fillStyle = subColor;
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Personal Finance Snapshot`,
      115,
      90
    );

    // 3. KPI Cards
    const kpis = [
      { label: 'TOTAL BUDGET', val: fmtCurrency(budgetCents), color: textColor },
      { label: 'TOTAL EXPENSES', val: fmtCurrency(totalSpent), color: rose },
      { label: 'REMAINING BALANCE', val: fmtCurrency(remaining), color: remaining < 0 ? rose : emerald },
      { label: 'BUDGET UTILIZATION', val: `${pctSpent.toFixed(1)}%`, color: pctSpent > 100 ? rose : emerald },
    ];

    const cardW = 250;
    const startX = 50;
    const kpiY = 130;

    kpis.forEach((kpi, idx) => {
      const cx = startX + idx * (cardW + 33);
      ctx.fillStyle = cardBg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, kpiY, cardW, 100, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = subColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(kpi.label, cx + 20, kpiY + 35);

      ctx.fillStyle = kpi.color;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(kpi.val, cx + 20, kpiY + 75);
    });

    // 4. Category Spending Breakdown Summary
    const catSectionY = 270;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Category Breakdown', startX, catSectionY);

    const catMap = new Map<string, number>();
    for (const e of expenses) {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    }
    const catList = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

    let catY = catSectionY + 25;
    if (catList.length === 0) {
      ctx.fillStyle = subColor;
      ctx.font = '14px sans-serif';
      ctx.fillText('No expenses recorded.', startX, catY + 20);
      catY += 40;
    } else {
      const colWidth = 520;
      catList.slice(0, 4).forEach(([category, cents], i) => {
        const colX = startX + (i % 2) * (colWidth + 60);
        const rowY = catY + Math.floor(i / 2) * 55;
        const pct = totalSpent > 0 ? (cents / totalSpent) * 100 : 0;

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(category, colX, rowY + 18);

        ctx.textAlign = 'right';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`${fmtCurrency(cents)} (${pct.toFixed(0)}%)`, colX + colWidth, rowY + 18);
        ctx.textAlign = 'left';

        // Bar track
        ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(colX, rowY + 26, colWidth, 8, 4);
        ctx.fill();

        // Bar fill
        ctx.fillStyle = emerald;
        ctx.beginPath();
        ctx.roundRect(colX, rowY + 26, Math.max(8, (pct / 100) * colWidth), 8, 4);
        ctx.fill();
      });
      catY += Math.ceil(Math.min(4, catList.length) / 2) * 55 + 20;
    }

    // 5. Recent Transactions Table
    const txY = catY + 20;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Recorded Transactions (${expenses.length})`, startX, txY);

    // Table Header
    const tableHeaderY = txY + 20;
    ctx.fillStyle = cardBg;
    ctx.beginPath();
    ctx.roundRect(startX, tableHeaderY, 1100, 36, 8);
    ctx.fill();

    ctx.fillStyle = subColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DATE', startX + 20, tableHeaderY + 23);
    ctx.fillText('DESCRIPTION', startX + 160, tableHeaderY + 23);
    ctx.fillText('CATEGORY', startX + 650, tableHeaderY + 23);
    ctx.textAlign = 'right';
    ctx.fillText('AMOUNT', startX + 1080, tableHeaderY + 23);
    ctx.textAlign = 'left';

    // Rows
    const displayList = expenses.slice(0, 10);
    let rowY = tableHeaderY + 45;

    displayList.forEach((e) => {
      ctx.fillStyle = textColor;
      ctx.font = '13px sans-serif';
      ctx.fillText(e.date, startX + 20, rowY + 18);

      ctx.font = 'bold 13px sans-serif';
      const descTrunc = e.description.length > 40 ? e.description.substring(0, 38) + '...' : e.description;
      ctx.fillText(descTrunc, startX + 160, rowY + 18);

      ctx.fillStyle = subColor;
      ctx.font = '12px sans-serif';
      ctx.fillText(e.category, startX + 650, rowY + 18);

      ctx.fillStyle = rose;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`-${fmtCurrency(e.amount)}`, startX + 1080, rowY + 18);
      ctx.textAlign = 'left';

      // subtle separator line
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.moveTo(startX, rowY + 30);
      ctx.lineTo(startX + 1100, rowY + 30);
      ctx.stroke();

      rowY += 42;
    });

    // 6. Footer Note
    ctx.fillStyle = subColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by Personal Expense Tracker · Confidential Financial Statement', width / 2, height - 20);

    // Trigger Download
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense_summary_${getTimestampString()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * 4. PDF FILE DOWNLOAD GENERATOR (Pure Standard PDF 1.4 Binary Generator)
 */
export function exportToPDF(expenses: ExpenseItem[], budgetCents: number) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budgetCents - totalSpent;
  const pctSpent = budgetCents > 0 ? (totalSpent / budgetCents) * 100 : 0;
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Category summary
  const catMap = new Map<string, number>();
  for (const e of expenses) {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
  }
  const catList = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

  // Construct PDF content stream
  const streamLines: string[] = [
    'BT',
    '/F2 20 Tf',
    '50 740 Td',
    '(EXPENSE TRACKER - FINANCIAL STATEMENT) Tj',
    'ET',

    'BT',
    '/F1 10 Tf',
    '50 722 Td',
    `(${escapePdf(`Generated on: ${dateFormatted} | Currency: USD`)}) Tj`,
    'ET',

    // Horizontal Rule
    '0.5 w',
    '0.7 0.7 0.7 RG',
    '50 710 m',
    '562 710 l',
    'S',

    // Summary Box
    '0.95 0.95 0.97 rg',
    '50 625 512 75 re',
    'f',

    'BT',
    '/F2 11 Tf',
    '0 0 0 rg',
    '65 678 Td',
    '(TOTAL BUDGET) Tj',
    '130 0 Td',
    '(TOTAL EXPENSES) Tj',
    '130 0 Td',
    '(NET REMAINING) Tj',
    '130 0 Td',
    '(UTILIZATION) Tj',
    'ET',

    'BT',
    '/F2 14 Tf',
    '65 650 Td',
    `(${escapePdf(fmtCurrency(budgetCents))}) Tj`,
    '130 0 Td',
    `(${escapePdf(fmtCurrency(totalSpent))}) Tj`,
    '130 0 Td',
    `(${escapePdf(fmtCurrency(remaining))}) Tj`,
    '130 0 Td',
    `(${escapePdf(pctSpent.toFixed(1) + '%')}) Tj`,
    'ET',

    // Category Section Header
    'BT',
    '/F2 12 Tf',
    '0 0 0 rg',
    '50 600 Td',
    '(SPENDING BY CATEGORY) Tj',
    'ET',
  ];

  let currentY = 582;
  catList.slice(0, 6).forEach(([cat, cents]) => {
    const pct = totalSpent > 0 ? (cents / totalSpent) * 100 : 0;
    streamLines.push(
      'BT',
      '/F1 10 Tf',
      `50 ${currentY} Td`,
      `(${escapePdf(`- ${cat}`)}) Tj`,
      `300 0 Td`,
      `(${escapePdf(fmtCurrency(cents))}) Tj`,
      `100 0 Td`,
      `(${escapePdf(pct.toFixed(1) + '%')}) Tj`,
      'ET'
    );
    currentY -= 16;
  });

  currentY -= 15;

  // Transactions Section Header
  streamLines.push(
    '0.8 0.8 0.8 RG',
    `50 ${currentY + 10} m`,
    `562 ${currentY + 10} l`,
    'S',
    'BT',
    '/F2 12 Tf',
    '0 0 0 rg',
    `50 ${currentY - 5} Td`,
    `(${escapePdf(`TRANSACTION LEDGER (${expenses.length} ITEMS)`)}) Tj`,
    'ET'
  );

  currentY -= 22;

  // Table Column Titles
  streamLines.push(
    'BT',
    '/F2 9 Tf',
    '0.3 0.3 0.3 rg',
    `50 ${currentY} Td`,
    '(DATE) Tj',
    '80 0 Td',
    '(DESCRIPTION) Tj',
    '230 0 Td',
    '(CATEGORY) Tj',
    '130 0 Td',
    '(AMOUNT) Tj',
    'ET'
  );

  currentY -= 14;

  // Transactions list
  const maxItems = Math.min(20, expenses.length);
  for (let i = 0; i < maxItems; i++) {
    const item = expenses[i];
    const desc = item.description.length > 32 ? item.description.substring(0, 30) + '..' : item.description;

    streamLines.push(
      'BT',
      '/F1 9 Tf',
      '0.1 0.1 0.1 rg',
      `50 ${currentY} Td`,
      `(${escapePdf(item.date)}) Tj`,
      '80 0 Td',
      `(${escapePdf(desc)}) Tj`,
      '230 0 Td',
      `(${escapePdf(item.category)}) Tj`,
      '130 0 Td',
      `(${escapePdf('-' + fmtCurrency(item.amount))}) Tj`,
      'ET'
    );

    currentY -= 16;
    if (currentY < 60) break;
  }

  // Footer
  streamLines.push(
    'BT',
    '/F1 8 Tf',
    '0.5 0.5 0.5 rg',
    '50 35 Td',
    '(Page 1 of 1 - Confidential Personal Finance Statement) Tj',
    'ET'
  );

  const streamContent = streamLines.join('\n');
  const streamLength = streamContent.length;

  const pdfParts = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    'endobj',
    '4 0 obj',
    `<< /Length ${streamLength} >>`,
    'stream',
    streamContent,
    'endstream',
    'endobj',
    '5 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj',
    '6 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    'endobj',
  ];

  // Calculate xref offsets
  let offset = 0;
  const offsets = [0];
  const body = pdfParts.join('\n') + '\n';

  for (let i = 0; i < pdfParts.length; i++) {
    if (pdfParts[i].endsWith('0 obj')) {
      offsets.push(offset);
    }
    offset += pdfParts[i].length + 1;
  }

  const xrefOffset = body.length;
  const xref = [
    'xref',
    '0 7',
    '0000000000 65535 f ',
    offsets[1].toString().padStart(10, '0') + ' 00000 n ',
    offsets[2].toString().padStart(10, '0') + ' 00000 n ',
    offsets[3].toString().padStart(10, '0') + ' 00000 n ',
    offsets[4].toString().padStart(10, '0') + ' 00000 n ',
    offsets[5].toString().padStart(10, '0') + ' 00000 n ',
    offsets[6].toString().padStart(10, '0') + ' 00000 n ',
    'trailer',
    '<< /Size 7 /Root 1 0 R >>',
    'startxref',
    xrefOffset.toString(),
    '%%EOF',
  ].join('\n');

  const fullPdf = body + xref;
  const blob = new Blob([fullPdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expense_statement_${getTimestampString()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapePdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * 5. PRINT / BROWSER PDF REPORT VIEW
 */
export function printFormattedReport(expenses: ExpenseItem[], budgetCents: number) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budgetCents - totalSpent;
  const pctSpent = budgetCents > 0 ? ((totalSpent / budgetCents) * 100).toFixed(1) : '0';

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Expense Tracker Statement - ${getTimestampString()}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; }
          .date { color: #64748b; font-size: 13px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 25px 0; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .kpi-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 22px; font-weight: 800; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 25px; }
          th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 12px; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .amount { font-weight: 700; text-align: right; color: #dc2626; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">💳 Expense Tracker Statement</div>
            <div class="date">Personal Wealth & Spending Intelligence</div>
          </div>
          <div class="date">Statement Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Budget</div>
            <div class="kpi-val">${fmtCurrency(budgetCents)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Expenses</div>
            <div class="kpi-val" style="color: #dc2626;">${fmtCurrency(totalSpent)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Remaining Balance</div>
            <div class="kpi-val" style="color: ${remaining < 0 ? '#dc2626' : '#059669'};">${fmtCurrency(remaining)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Budget Used</div>
            <div class="kpi-val">${pctSpent}%</div>
          </div>
        </div>

        <h3>Transaction Ledger (${expenses.length} Records)</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td>${e.date}</td>
                <td><strong>${e.description}</strong></td>
                <td>${e.category}</td>
                <td class="amount">-${fmtCurrency(e.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated from Client-Side Expense Tracker · All financial data maintained locally by user.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
