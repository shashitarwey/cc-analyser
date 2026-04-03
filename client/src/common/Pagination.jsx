import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination bar styled identically to TransactionsTableView.
 * Uses: table-paginator-wrap, table-page-pill, btn btn-secondary btn-sm
 *
 * Props:
 *  - page        {number}   current page (1-indexed)
 *  - totalPages  {number}   total number of pages
 *  - totalItems  {number}   total item count (for "Showing X–Y of N" label)
 *  - pageSize    {number}   items per page
 *  - onPage      {function} called with new page number
 */
export default function Pagination({ page, totalPages, totalItems, pageSize, onPage }) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, totalItems);

    return (
        <div className="d-flex items-center justify-between table-paginator-wrap">
            <div className="text-md text-muted">
                Showing {from} to {to} of {totalItems} entries
            </div>
            <div className="d-flex gap-8">
                <button
                    className="btn btn-secondary btn-sm py-6-px-10"
                    disabled={page === 1}
                    onClick={() => onPage(Math.max(1, page - 1))}
                >
                    <ChevronLeft size={16} /> Prev
                </button>
                <div className="py-6-px-12 table-page-pill text-md text-muted">
                    Page {page} of {totalPages}
                </div>
                <button
                    className="btn btn-secondary btn-sm py-6-px-10"
                    disabled={page === totalPages}
                    onClick={() => onPage(Math.min(totalPages, page + 1))}
                >
                    Next <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
