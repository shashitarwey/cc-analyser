import { format } from 'date-fns';
import { printHtmlInIframe } from './printHtml';
import { buildStatementHtml, fmtAmt } from './pdfStatement';

export const downloadLedgerPdf = (seller, items) => {
    // Only delivered orders + all payments. Pending and cancelled orders excluded.
    const filtered = items.filter(item =>
        item.type === 'PAYMENT' || (!item.isPending && !item.isCancelled)
    );

    const sorted = [...filtered].sort((a, b) => a.date - b.date);

    // Group by calendar month, walking forward so each group's "opening"
    // snapshots the balance before its first entry.
    const groups = [];
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
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

        const isOrder = item.type === 'ORDER';
        if (isOrder) {
            runningBalance += item.amount;
            totalDebit += item.amount;
        } else {
            runningBalance -= item.amount;
            totalCredit += item.amount;
        }

        // Delivery date only makes sense for orders. Pull it from the raw
        // document — only delivered orders are included by the filter above.
        const deliveredDate = isOrder && item.raw?.delivered_date
            ? format(new Date(item.raw.delivered_date), 'dd MMM')
            : '';

        currentGroup.entries.push({
            dateLabel: format(item.date, 'dd MMM'),
            details: item.description,
            deliveredDate,
            debit: isOrder ? fmtAmt(item.amount) : '',
            credit: isOrder ? '' : fmtAmt(item.amount),
            balance: fmtAmt(Math.abs(runningBalance)),
            suffix: runningBalance === 0 ? '' : (runningBalance > 0 ? ' Dr' : ' Cr'),
        });
    });

    const netBalance = totalDebit - totalCredit;
    const today = new Date();
    const firstDate = sorted.length > 0 ? sorted[0].date : today;
    const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : today;
    const balanceSuffix = netBalance === 0 ? '' : (netBalance > 0 ? ' Dr' : ' Cr');
    const balanceVerb = netBalance > 0 ? 'will give' : netBalance < 0 ? 'will get' : 'is clear';

    const html = buildStatementHtml({
        documentTitle: `${seller.name} - Ledger Statement`,
        brandSubtitle: 'Ledger Statement',
        statementTitle: `${seller.name}${seller.city ? ` (${seller.city})` : ''} Statement`,
        dateRange: `${format(firstDate, 'dd MMM yyyy')} - ${format(lastDate, 'dd MMM yyyy')}`,
        openingDate: format(firstDate, 'dd MMM yyyy'),
        groups,
        entriesCount: sorted.length,
        summary: {
            debitLabel: 'Total Debit(-)',
            creditLabel: 'Total Credit(+)',
            debit: fmtAmt(totalDebit),
            credit: fmtAmt(totalCredit),
            balance: fmtAmt(Math.abs(netBalance)),
            balanceSuffix,
            balanceLine: `${seller.name} ${balanceVerb}`,
        },
        columns: {
            debitHeader: 'Debit(-)',
            creditHeader: 'Credit(+)',
            deliveryHeader: 'Delivery Date',
        },
        generatedAt: format(today, "hh:mm a | dd MMM ''yy"),
        emptyMsg: 'No delivered orders or payments to show.',
    });

    return printHtmlInIframe(html);
};
