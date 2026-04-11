import { format } from 'date-fns';
import { printHtmlInIframe } from './printHtml';
import { buildStatementHtml, fmtAmt } from './pdfStatement';

export const downloadKhataPdf = (customer, entries) => {
    // Walk entries in chronological order so the running balance snapshots
    // the state before each month group's first entry.
    const sorted = [...entries]
        .map(e => ({ ...e, date: new Date(e.entry_date) }))
        .sort((a, b) => a.date - b.date);

    const groups = [];
    let runningBalance = 0;
    let totalGave = 0;
    let totalGot = 0;
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

        const isGave = item.type === 'gave';
        if (isGave) {
            runningBalance += item.amount;
            totalGave += item.amount;
        } else {
            runningBalance -= item.amount;
            totalGot += item.amount;
        }

        currentGroup.entries.push({
            dateLabel: format(item.date, 'dd MMM'),
            details: item.notes || (isGave ? 'You Gave' : 'You Got'),
            debit: isGave ? fmtAmt(item.amount) : '',
            credit: isGave ? '' : fmtAmt(item.amount),
            balance: fmtAmt(Math.abs(runningBalance)),
            suffix: runningBalance === 0 ? '' : (runningBalance > 0 ? ' Dr' : ' Cr'),
        });
    });

    const netBalance = totalGave - totalGot;
    const today = new Date();
    const firstDate = sorted.length > 0 ? sorted[0].date : today;
    const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : today;
    const balanceSuffix = netBalance === 0 ? '' : (netBalance > 0 ? ' Dr' : ' Cr');
    const balanceVerb = netBalance > 0 ? 'will give' : netBalance < 0 ? 'will get' : 'is clear';

    const html = buildStatementHtml({
        documentTitle: `${customer.name} - Khata Statement`,
        brandSubtitle: 'Khata Statement',
        statementTitle: `${customer.name}${customer.phone ? ` (${customer.phone})` : ''} Statement`,
        dateRange: `${format(firstDate, 'dd MMM yyyy')} - ${format(lastDate, 'dd MMM yyyy')}`,
        openingDate: format(firstDate, 'dd MMM yyyy'),
        groups,
        entriesCount: sorted.length,
        summary: {
            debitLabel: 'You Gave (-)',
            creditLabel: 'You Got (+)',
            debit: fmtAmt(totalGave),
            credit: fmtAmt(totalGot),
            balance: fmtAmt(Math.abs(netBalance)),
            balanceSuffix,
            balanceLine: `${customer.name} ${balanceVerb}`,
        },
        columns: {
            debitHeader: 'You Gave (-)',
            creditHeader: 'You Got (+)',
        },
        generatedAt: format(today, "hh:mm a | dd MMM ''yy"),
        emptyMsg: 'No entries to show.',
    });

    return printHtmlInIframe(html);
};
