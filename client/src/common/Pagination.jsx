import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../constants';

/**
 * Pagination bar.
 *
 * Props:
 *  - page        {number}   current page (1-indexed)
 *  - totalPages  {number}   total number of pages
 *  - totalItems  {number}   total item count
 *  - pageSize    {number}   items per page
 *  - onPage      {function} called with new page number
 *  - onPageSize  {function} called with new page size
 */
export default function Pagination({ page, totalPages, totalItems, pageSize, onPage, onPageSize, label = 'entries' }) {
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, totalItems);

    return (
        <div className="d-flex items-center justify-between table-paginator-wrap">
            <div className="text-md text-muted">
                {from} – {to} of {totalItems} {label}
            </div>
            <div className="d-flex items-center gap-8">
                {onPageSize && (
                    <span className="text-md text-muted rows-per-page-label">Rows per page</span>
                )}
                <button
                    className="btn btn-secondary btn-sm py-6-px-10"
                    disabled={page <= 1}
                    onClick={() => onPage(Math.max(1, page - 1))}
                >
                    <ChevronLeft size={16} />
                </button>
                {onPageSize && (
                    <select
                        className="btn btn-secondary btn-sm pagination-select"
                        value={pageSize}
                        onChange={e => onPageSize(Number(e.target.value))}
                        style={{ padding: '4px 8px', cursor: 'pointer' }}
                    >
                        {PAGE_SIZE_OPTIONS.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                )}
                <button
                    className="btn btn-secondary btn-sm py-6-px-10"
                    disabled={page >= totalPages}
                    onClick={() => onPage(Math.min(totalPages, page + 1))}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
