import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { printHtmlInIframe } from './printHtml';
import { buildStatementHtml, fmtAmt, balanceParts, splitByRange } from './pdfStatement';

/**
 * Build and print the khata book statement.
 *
 * @param {Object} customer
 * @param {Array}  entries - all khata entries (full history)
 * @param {Object} [range] - { from, to } as 'yyyy-MM-dd'. Entries outside the
 *   window are excluded from the table and totals; everything before `from`
 *   is rolled into the opening (previous) balance.
 */
export const downloadKhataPdf = (customer, entries, range = {}) => {
    // Walk entries in chronological order so the running balance snapshots
    // the state before each month group's first entry.
    const sorted = [...entries]
        .map(e => ({ ...e, date: new Date(e.entry_date) }))
        .sort((a, b) => a.date - b.date);

    const from = range.from ? startOfDay(parseISO(range.from)) : null;
    const to = range.to ? endOfDay(parseISO(range.to)) : null;
    const isFiltered = Boolean(from || to);

    const { before, within } = splitByRange(sorted, from, to);

    // Everything before the window collapses into a single carry-forward figure.
    const openingBalance = before.reduce(
        (bal, item) => item.type === 'gave' ? bal + item.amount : bal - item.amount,
        0
    );

    const groups = [];
    let runningBalance = openingBalance;
    let totalGave = 0;
    let totalGot = 0;
    let currentGroup = null;

    within.forEach(item => {
        const key = format(item.date, 'yyyy-MM');
        if (!currentGroup || currentGroup.key !== key) {
            const open = balanceParts(runningBalance);
            currentGroup = {
                key,
                monthLabel: format(item.date, 'MMMM yyyy'),
                opening: runningBalance === 0 ? '0.00' : `${open.text}${open.suffix}`,
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

        const bal = balanceParts(runningBalance);
        currentGroup.entries.push({
            dateLabel: format(item.date, 'dd MMM'),
            details: item.notes || (isGave ? 'You Gave' : 'You Got'),
            debit: isGave ? fmtAmt(item.amount) : '',
            credit: isGave ? '' : fmtAmt(item.amount),
            balance: bal.text,
            suffix: bal.suffix,
        });
    });

    const netBalance = openingBalance + totalGave - totalGot;
    const today = new Date();
    // With a filter the header shows the requested window, not the data extent.
    const firstDate = from || (within.length > 0 ? within[0].date : today);
    const lastDate = to || (within.length > 0 ? within[within.length - 1].date : today);
    const net = balanceParts(netBalance);
    const opening = balanceParts(openingBalance);
    const balanceVerb = netBalance > 0 ? 'will give' : netBalance < 0 ? 'will get' : 'is clear';

    const html = buildStatementHtml({
        documentTitle: `${customer.name} - Khata Statement`,
        brandSubtitle: 'Khata Statement',
        statementTitle: `${customer.name}${customer.phone ? ` (${customer.phone})` : ''} Statement`,
        dateRange: `${format(firstDate, 'dd MMM yyyy')} - ${format(lastDate, 'dd MMM yyyy')}`,
        openingDate: format(firstDate, 'dd MMM yyyy'),
        openingBalance: opening.text,
        openingSuffix: opening.suffix,
        filtered: isFiltered,
        groups,
        entriesCount: within.length,
        summary: {
            debitLabel: 'You Gave (-)',
            creditLabel: 'You Got (+)',
            debit: fmtAmt(totalGave),
            credit: fmtAmt(totalGot),
            balance: net.text,
            balanceSuffix: net.suffix,
            balanceLine: `${customer.name} ${balanceVerb}`,
        },
        columns: {
            debitHeader: 'You Gave (-)',
            creditHeader: 'You Got (+)',
        },
        generatedAt: format(today, "hh:mm a | dd MMM ''yy"),
        emptyMsg: isFiltered ? 'No entries in the selected period.' : 'No entries to show.',
    });

    return printHtmlInIframe(html);
};
