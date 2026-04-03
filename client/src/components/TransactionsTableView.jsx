import { useState, useEffect } from 'react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTransactions, deleteTransaction, deleteOrder } from '../api';
import ConfirmModal from '../common/ConfirmModal';
import SearchableDropdown from '../common/SearchableDropdown';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import { fmtDisplay } from '../utils/formatters';

export default function TransactionsTableView({ view, onBack, dateFrom, dateTo, onRefreshSummary, cardsForBank }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const [selectedCardId, setSelectedCardId] = useState(searchParams.get('filterCard') || '');

  // Pagination
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  const viewType = view?.type;
  const viewBankName = view?.bankName;
  const viewCardId = view?.card?._id;

  // Sync view + card filter + page back to URL
  useEffect(() => {
    setSearchParams(prevParams => {
      if (!prevParams.get('view')) return prevParams;
      const params = new URLSearchParams(prevParams);

      params.set('view', view.type);
      if (view.type === 'bank') params.set('bankName', view.bankName);
      else params.set('viewCardId', view.card._id);

      if (selectedCardId) params.set('filterCard', selectedCardId);
      else params.delete('filterCard');

      if (page > 1) params.set('page', page);
      else params.delete('page');

      return params;
    }, { replace: true });
  }, [viewType, viewBankName, viewCardId, selectedCardId, page, setSearchParams]);

  // Reset page when card filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedCardId]);

  const fetchTxs = async () => {
    setLoading(true);
    try {
      // Use the global date range from the dashboard date picker
      const params = { from_date: dateFrom, to_date: dateTo, page, limit };
      if (view.type === 'card') {
        params.cardId = view.card._id;
      } else if (view.type === 'bank') {
        if (selectedCardId) params.cardId = selectedCardId;
        else params.bankName = view.bankName;
      }

      const res = await getTransactions(params);

      const items = res.items || [];
      const pageInfo = res.page || { total_items: 0, page_size: limit, current_page: 1 };

      setTxs(items);
      setTotalPages(Math.ceil(pageInfo.total_items / pageInfo.page_size) || 1);
      setTotalAmount(res.totalAmount || 0);
      setTotalCount(pageInfo.total_items);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when view, date range (from global picker), card filter or page changes
  useEffect(() => { fetchTxs(); }, [viewType, viewBankName, viewCardId, dateFrom, dateTo, selectedCardId, page]);

  const handleDelete = (tx) => {
    setConfirm({
      message: `Delete "${tx.description || 'this transaction'}" of ₹${tx.amount.toLocaleString('en-IN')}?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          if (tx.is_order) {
            await deleteOrder(tx._id);
          } else {
            await deleteTransaction(tx._id);
          }
          fetchTxs();
          onRefreshSummary();
          toast.success(tx.is_order ? 'Order deleted' : 'Transaction deleted');
        } catch (err) {
          toast.error(err.response?.data?.error || `Error deleting ${tx.is_order ? 'order' : 'transaction'}`);
        }
      },
    });
  };

  const title = view.type === 'card'
    ? `${view.card.bank_name} - ${view.card.last_four_digit}`
    : view.bankName;

  const showCashback = view.type === 'card'
    ? view.card.cashback_enabled
    : (selectedCardId
        ? cardsForBank?.find(c => c._id === selectedCardId)?.cashback_enabled
        : cardsForBank?.some(c => c.cashback_enabled));

  const cardOptions = [
    'All Cards',
    ...(cardsForBank || []).map(c => `${c.card_network} ••••${c.last_four_digit}`)
  ];

  const selectedCardLabel = selectedCardId
    ? `${cardsForBank?.find(c => c._id === selectedCardId)?.card_network} ••••${cardsForBank?.find(c => c._id === selectedCardId)?.last_four_digit}`
    : 'All Cards';

  return (
    <div className="table-view-container fade-in" style={{ padding: '24px 32px 32px' }}>
      <div className="table-view-header">
        <div className="d-flex items-center gap-12">
          <button
            className="btn-back-circle"
            onClick={onBack}
            data-tooltip="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h2 className="text-xl" style={{ margin: 0 }}>{title}</h2>
            {totalCount > 0 && (
              <div className="text-sm text-muted" style={{ marginTop: '2px' }}>
                {totalCount} transaction{totalCount !== 1 ? 's' : ''} &middot; Total: ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Only show card filter for bank views */}
      {view.type === 'bank' && (
        <div className="table-filters d-flex gap-16 mb-24 items-end flex-wrap">
          <div className="w-220">
            <label className="form-label mb-6 d-block text-xs text-muted">Filter by Card</label>
            <SearchableDropdown
              options={cardOptions}
              value={selectedCardLabel}
              onChange={val => {
                if (val === 'All Cards' || !val) {
                  setSelectedCardId('');
                } else {
                  const found = cardsForBank?.find(c => `${c.card_network} ••••${c.last_four_digit}` === val);
                  setSelectedCardId(found ? found._id : '');
                }
              }}
              placeholder="All Cards"
            />
          </div>
        </div>
      )}

      <div className="table-card mb-24">
        {loading && txs.length === 0 ? (
          <div style={{ padding: '20px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="shimmer shimmer-table-row"></div>
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-sub">No transactions found for this period.</div>
          </div>
        ) : (
          <>
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {view.type === 'bank' && !selectedCardId && <th>Card</th>}
                    <th>Description</th>
                    <th>Amount</th>
                    {showCashback && <th>Cashback</th>}
                    <th className="text-right col-action">Action</th>
                  </tr>
                </thead>
                <tbody style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  {txs.map(tx => (
                    <tr key={tx._id}>
                      <td className="white-space-nowrap text-muted">
                        {fmtDisplay(new Date(tx.date).toISOString().slice(0, 10))}
                      </td>
                      {view.type === 'bank' && !selectedCardId && (
                        <td>
                          <span className="tx-card-pill">
                            {tx.card_id?.card_network} ••••{tx.card_id?.last_four_digit}
                          </span>
                        </td>
                      )}
                      <td>
                        <div className="tx-desc" data-tooltip={tx.description}>
                          {tx.description ? (tx.description.length > 20 ? tx.description.slice(0, 20) + '...' : tx.description) : 'Transaction'}
                        </div>
                      </td>
                      <td className="font-semibold text-base">
                        ₹{tx.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      {showCashback && (
                        <td className="text-green">
                          {tx.card_id?.cashback_enabled
                            ? `+₹${(tx.amount * (tx.card_id.cashback_percent / 100)).toLocaleString('en-IN', { maximumFractionDigits: 1 })}`
                            : '—'}
                        </td>
                      )}
                      <td className="text-right col-action">
                        <button className="tx-delete" onClick={() => handleDelete(tx)} data-tooltip="Delete" style={{ marginLeft: 'auto' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex items-center justify-between table-paginator-wrap">
                <div className="text-md text-muted">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} entries
                </div>
                <div className="d-flex gap-8">
                  <button
                    className="btn btn-secondary btn-sm py-6-px-10"
                    disabled={page === 1 || loading}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <div className="py-6-px-12 table-page-pill text-md text-muted">
                    Page {page} of {totalPages}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm py-6-px-10"
                    disabled={page === totalPages || loading}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title="Delete Transaction?"
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
