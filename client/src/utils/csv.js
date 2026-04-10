// RFC 4180 CSV escaping: wrap in quotes if value contains comma, quote, or newline;
// double any embedded quotes.
const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
};

/**
 * Build a CSV string from an array of rows and a column spec.
 * @param {Array<Object>} rows
 * @param {Array<{header: string, value: (row: Object) => any}>} columns
 * @returns {string}
 */
export const toCSV = (rows, columns) => {
    const headerLine = columns.map(c => escapeCell(c.header)).join(',');
    const dataLines = rows.map(row =>
        columns.map(c => escapeCell(c.value(row))).join(',')
    );
    return [headerLine, ...dataLines].join('\r\n');
};

/**
 * Trigger a browser download for a CSV string.
 * Prepends a UTF-8 BOM so Excel recognizes non-ASCII characters (e.g. ₹).
 */
export const downloadCSV = (filename, csv) => {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
