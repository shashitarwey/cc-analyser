import { format } from 'date-fns';

const fmtAmt = (n) =>
    (n || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const escapeHtml = (str) =>
    String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

const STYLES = `
    @page {
        size: A4;
        margin: 14mm 12mm 18mm 12mm;
        @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-size: 10px;
            color: #777;
        }
    }
    * { box-sizing: border-box; }
    body {
        font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
        color: #1a1a1a;
        margin: 0;
        padding: 8px 4px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-size: 12px;
    }
    .brand-bar {
        background: #1d4ed8;
        color: #fff;
        padding: 10px 16px;
        border-radius: 6px;
        margin-bottom: 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
    }
    .brand-bar .brand-name {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.3px;
    }
    .statement-title {
        text-align: center;
        font-size: 18px;
        font-weight: 700;
        margin: 4px 0 4px;
    }
    .statement-subtitle {
        text-align: center;
        font-size: 12px;
        color: #444;
        margin-bottom: 18px;
    }
    .summary {
        display: flex;
        width: 100%;
        border: 1px solid #d8d8d8;
        border-radius: 8px;
        margin-bottom: 14px;
    }
    .summary-cell {
        flex: 1 1 0;
        min-width: 0;
        padding: 14px 16px;
        border-right: 1px solid #ececec;
    }
    .summary-cell:last-child { border-right: none; }
    .summary-label {
        font-size: 11px;
        color: #555;
        margin-bottom: 6px;
    }
    .summary-value {
        font-size: 15px;
        font-weight: 700;
        color: #1a1a1a;
    }
    .summary-value.red { color: #c62828; }
    .summary-sub {
        font-size: 10px;
        color: #888;
        margin-top: 4px;
    }
    .dr-suffix {
        font-size: 10px;
        color: #c62828;
        font-weight: 500;
        margin-left: 2px;
    }
    .entries-count {
        font-size: 12px;
        color: #444;
        margin: 6px 2px 6px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #d8d8d8;
        border-radius: 6px;
        overflow: hidden;
    }
    thead th {
        background: #f3f4f6;
        padding: 10px 10px;
        font-size: 11px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 1px solid #d0d0d0;
    }
    thead th.amt { text-align: right; }
    .month-row td {
        background: #fafafa;
        padding: 9px 10px;
        font-weight: 700;
        font-size: 12px;
        border-bottom: 1px solid #e5e5e5;
        border-top: 1px solid #e5e5e5;
    }
    .month-row .opening {
        font-weight: 400;
        color: #666;
        font-size: 11px;
        text-align: right;
    }
    tbody td {
        padding: 11px 10px;
        border-bottom: 1px solid #ececec;
        font-size: 12px;
        vertical-align: middle;
    }
    .amt {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .debit-cell { background: #fde8e8; }
    .credit-cell { background: #e4f5e7; }
    .balance-red { color: #c62828; font-weight: 600; }
    .grand-total td {
        background: #f3f4f6;
        font-weight: 700;
        padding: 12px 10px;
        border-top: 2px solid #c0c0c0;
        font-size: 12px;
    }
    .empty-msg {
        text-align: center;
        color: #888;
        padding: 20px;
        font-size: 12px;
    }
    .report-footer {
        margin-top: 14px;
        font-size: 10px;
        color: #888;
    }
    @media print {
        body { padding: 0; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; }
        .month-row { page-break-after: avoid; }
        .brand-bar { page-break-after: avoid; }
    }
`;

const buildBodyRows = (groups) => {
    if (groups.length === 0) {
        return '<tr><td colspan="5" class="empty-msg">No delivered orders or payments to show.</td></tr>';
    }
    return groups.map(group => {
        const monthHeader = `
            <tr class="month-row">
                <td colspan="2">${escapeHtml(group.monthLabel)}</td>
                <td colspan="3" class="opening">(Opening Balance: ${group.opening})</td>
            </tr>`;
        const entryRows = group.entries.map(e => `
            <tr>
                <td>${e.dateLabel}</td>
                <td>${escapeHtml(e.details)}</td>
                <td class="amt debit-cell">${e.debit}</td>
                <td class="amt credit-cell">${e.credit}</td>
                <td class="amt balance-red">${e.balance}<span class="dr-suffix">${e.suffix}</span></td>
            </tr>`).join('');
        return monthHeader + entryRows;
    }).join('');
};

export const downloadLedgerPdf = (seller, items) => {
    // Only delivered orders + all payments. Pending and cancelled orders excluded.
    const filtered = items.filter(item =>
        item.type === 'PAYMENT' || (!item.isPending && !item.isCancelled)
    );

    const sorted = [...filtered].sort((a, b) => a.date - b.date);

    // Group by calendar month, computing a running balance as we walk forward
    // so each group's "opening" snapshots the balance *before* its first entry.
    const groups = [];
    let runningBalance = 0;
    let currentGroup = null;

    sorted.forEach(item => {
        const key = format(item.date, 'yyyy-MM');
        if (!currentGroup || currentGroup.key !== key) {
            const openingRaw = runningBalance;
            currentGroup = {
                key,
                monthLabel: format(item.date, 'MMMM yyyy'),
                opening: openingRaw === 0
                    ? '0.00'
                    : `${fmtAmt(Math.abs(openingRaw))} ${openingRaw > 0 ? 'Dr' : 'Cr'}`,
                entries: [],
            };
            groups.push(currentGroup);
        }
        if (item.type === 'ORDER') runningBalance += item.amount;
        else runningBalance -= item.amount;

        currentGroup.entries.push({
            dateLabel: format(item.date, 'dd MMM'),
            details: item.description,
            debit: item.type === 'ORDER' ? fmtAmt(item.amount) : '',
            credit: item.type === 'PAYMENT' ? fmtAmt(item.amount) : '',
            balance: fmtAmt(Math.abs(runningBalance)),
            suffix: runningBalance === 0 ? '' : (runningBalance > 0 ? ' Dr' : ' Cr'),
        });
    });

    const totalDebit = sorted
        .filter(e => e.type === 'ORDER')
        .reduce((s, e) => s + e.amount, 0);
    const totalCredit = sorted
        .filter(e => e.type === 'PAYMENT')
        .reduce((s, e) => s + e.amount, 0);
    const netBalance = totalDebit - totalCredit;

    const today = new Date();
    const firstDate = sorted.length > 0 ? sorted[0].date : today;
    const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : today;

    const dateRange = `${format(firstDate, 'dd MMM yyyy')} - ${format(lastDate, 'dd MMM yyyy')}`;
    const openingDate = format(firstDate, 'dd MMM yyyy');
    const generatedAt = format(today, "hh:mm a | dd MMM ''yy");
    const balanceSuffix = netBalance === 0 ? '' : (netBalance > 0 ? ' Dr' : ' Cr');
    const balanceLabel = netBalance > 0 ? 'will give' : netBalance < 0 ? 'will get' : 'is clear';
    const sellerName = escapeHtml(seller.name);
    const sellerCity = seller.city ? ` (${escapeHtml(seller.city)})` : '';

    const bodyRows = buildBodyRows(groups);
    const grandTotalRow = groups.length === 0 ? '' : `
        <tr class="grand-total">
            <td colspan="2">Grand Total</td>
            <td class="amt">${fmtAmt(totalDebit)}</td>
            <td class="amt">${fmtAmt(totalCredit)}</td>
            <td class="amt balance-red">${fmtAmt(Math.abs(netBalance))}<span class="dr-suffix">${balanceSuffix}</span></td>
        </tr>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${sellerName} - Ledger Statement</title>
<style>${STYLES}</style>
</head>
<body>
    <div class="brand-bar">
        <div class="brand-name">CardVault</div>
        <div>Ledger Statement</div>
    </div>

    <div class="statement-title">${sellerName}${sellerCity} Statement</div>
    <div class="statement-subtitle">(${dateRange})</div>

    <div class="summary">
        <div class="summary-cell">
            <div class="summary-label">Opening Balance</div>
            <div class="summary-value">Rs. 0.00</div>
            <div class="summary-sub">(on ${openingDate})</div>
        </div>
        <div class="summary-cell">
            <div class="summary-label">Total Debit(-)</div>
            <div class="summary-value">Rs. ${fmtAmt(totalDebit)}</div>
        </div>
        <div class="summary-cell">
            <div class="summary-label">Total Credit(+)</div>
            <div class="summary-value">Rs. ${fmtAmt(totalCredit)}</div>
        </div>
        <div class="summary-cell">
            <div class="summary-label">Net Balance</div>
            <div class="summary-value red">Rs. ${fmtAmt(Math.abs(netBalance))}<span class="dr-suffix">${balanceSuffix}</span></div>
            <div class="summary-sub">(${sellerName} ${balanceLabel})</div>
        </div>
    </div>

    <div class="entries-count">No. of Entries: ${sorted.length} (All)</div>

    <table>
        <thead>
            <tr>
                <th style="width: 13%;">Date</th>
                <th>Details</th>
                <th class="amt" style="width: 17%;">Debit(-)</th>
                <th class="amt" style="width: 17%;">Credit(+)</th>
                <th class="amt" style="width: 19%;">Balance</th>
            </tr>
        </thead>
        <tbody>
            ${bodyRows}
            ${grandTotalRow}
        </tbody>
    </table>

    <div class="report-footer">Report Generated : ${generatedAt}</div>

    <script>
        window.onload = function () {
            setTimeout(function () {
                window.focus();
                window.print();
            }, 250);
        };
    </script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) {
        return { ok: false, error: 'popup-blocked' };
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    return { ok: true };
};
