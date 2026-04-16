import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeller, getAllOrders, getSellerLedger, getLedgerFeed, deleteSellerPayment } from '../api';
import { ChevronLeft, Wallet, MapPin, TrendingUp, TrendingDown, Trash2, Pencil, BookOpen, FileDown } from 'lucide-react';
import { fmtCurrency, fmtDisplay, fmtSignedCurrency, profitColor } from '../utils/formatters';
import { downloadLedgerPdf } from '../utils/ledgerPdf';
import toast from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';
import AddPaymentModal from '../components/AddPaymentModal';

export default function SellerLedgerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const sentinelRef = useRef(null);
  const PAGE_LIMIT = 20;

  // Normalize a server-returned ledger item. Server sends date as ISO string
  // (via .lean() + JSON serialization); downstream grouping expects Date.
  const normalize = (arr) => arr.map(it => ({ ...it, date: new Date(it.date) }));

  // Fetch seller summary once + first page of ledger.
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setPage(1);
    try {
      const [sellerData, feedRes] = await Promise.all([
        getSeller(id),
        getLedgerFeed(id, { page: 1, limit: PAGE_LIMIT }),
      ]);
      setSeller(sellerData);
      setItems(normalize(feedRes.items));
      setHasMore(feedRes.page.has_next);
    } catch {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Append the next page to existing items.
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const feedRes = await getLedgerFeed(id, { page: nextPage, limit: PAGE_LIMIT });
      setItems(prev => [...prev, ...normalize(feedRes.items)]);
      setHasMore(feedRes.page.has_next);
      setPage(nextPage);
    } catch {
      toast.error('Failed to load more entries');
    } finally {
      setLoadingMore(false);
    }
  }, [id, page, hasMore, loadingMore]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // IntersectionObserver drives infinite scroll — triggers loadMore when
  // the sentinel <div> below the list scrolls into view.
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    const node = sentinelRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleDeletePayment = (item) => {
    setConfirm({
      message: `Delete this payment of ${fmtCurrency(item.amount)}?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteSellerPayment(item.id);
          toast.success('Payment deleted');
          // Running balances shift — refresh from page 1
          loadInitial();
        } catch { toast.error('Failed to delete payment'); }
      }
    });
  };

  // PDF needs ALL items, not just what's currently paginated on screen.
  // Fetch fresh orders + payments and rebuild the merged list like before.
  const handleDownloadPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const [orders, payments] = await Promise.all([
        getAllOrders({ seller_id: id }),
        getSellerLedger(id),
      ]);
      const mappedOrders = orders.map(o => ({
        id: o._id, type: 'ORDER',
        date: new Date(o.order_date),
        description: `${o.model_ordered}${o.quantity > 1 ? ` ×${o.quantity}` : ''}`,
        amount: o.return_amount, raw: o,
      }));
      const mappedPayments = payments.map(p => ({
        id: p._id, type: 'PAYMENT',
        date: new Date(p.payment_date),
        description: p.notes || 'Payment Received',
        amount: p.amount, raw: p,
      }));
      const merged = [...mappedOrders, ...mappedPayments].sort((a, b) => a.date - b.date);
      let running = 0;
      const allItems = merged.map(it => {
        const isCancelled = it.type === 'ORDER' && it.raw.delivery_status === 'Cancelled';
        const isPending = it.type === 'ORDER' && it.raw.delivery_status !== 'Yes';
        if (!isCancelled) {
          if (it.type === 'ORDER' && !isPending) running += it.amount;
          if (it.type === 'PAYMENT') running -= it.amount;
        }
        return { ...it, runningBalance: running, isCancelled, isPending };
      });
      const res = downloadLedgerPdf(seller, allItems);
      if (!res.ok) toast.error('Failed to generate report');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setPdfLoading(false);
    }
  };

  // Group items by date key. Entries are already newest-first from the server
  // and appended page-by-page, so the grouped keys naturally stay newest-first.
  const grouped = items.reduce((acc, item) => {
    const key = item.date.toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Totals come from the seller aggregate (full history), not paginated items.
  const totalOrdered = seller?.total_amount_get || 0;
  const totalPaid = seller?.total_received || 0;

  return (
    <>
      {/* Page Hero Header */}
      <div className="page-hero ledger-hero">
        <div className="page-hero-inner">
          <div className="page-hero-left">
            <button
              className="btn-back-circle"
              onClick={() => navigate('/sellers')}
              data-tooltip="Back to Buyers"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="ledger-hero-divider" />
            <div className="page-hero-title-group">
              <h1 className="page-hero-title">
                {seller ? seller.name : 'Loading…'}
              </h1>
              {seller && (
                <div className="ledger-hero-meta">
                  <MapPin size={12} /> {seller.city}
                  <span className="ledger-hero-dot">·</span>
                  <span>Khata Book</span>
                </div>
              )}
            </div>
          </div>

          {seller && (
            <div className="page-hero-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadPdf}
                disabled={loading || pdfLoading || items.length === 0}
              >
                <FileDown size={14} /> {pdfLoading ? 'Preparing…' : 'Download Report'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
                <Wallet size={14} /> Add Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {seller && !loading && (
        <div className="ledger-stats-bar">
          <div className="ledger-stats-inner">
            <div className="ledger-stats-row">
              {[
                { label: 'Total Ordered',  value: totalOrdered,           color: 'var(--danger)',          icon: <TrendingDown size={14} /> },
                { label: 'Total Received', value: totalPaid,               color: 'var(--success)',         icon: <TrendingUp size={14} /> },
                { label: 'Balance Due',    value: seller.due_balance || 0, color: profitColor(-(seller.due_balance || 0)), icon: <Wallet size={14} /> },
                { label: 'Profit',         value: seller.profit || 0,      color: profitColor(seller.profit || 0),         icon: <TrendingUp size={14} /> },
              ].map((stat, i) => (
                <div key={i} className="ledger-stat-item">
                  <div className="ledger-stat-label">
                    {stat.icon} {stat.label}
                  </div>
                  <div className="ledger-stat-value" style={{ color: stat.color }}>
                    {stat.label === 'Profit' ? fmtSignedCurrency(stat.value) : fmtCurrency(stat.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline / Ledger */}
      <div className="ledger-timeline">
        {loading ? (
          <div className="ledger-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer shimmer-table-row" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-sellers">
              <BookOpen size={32} />
            </div>
            <div className="empty-title">No transactions yet</div>
            <div className="empty-sub">Add orders or record payments to build the ledger.</div>
            <div className="empty-cta">
              <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
                <Wallet size={16} /> Add First Payment
              </button>
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([dateKey, dateItems]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="ledger-date-sep">
                <div className="ledger-date-line" />
                <span className="ledger-date-pill">{fmtDisplay(dateKey)}</span>
                <div className="ledger-date-line" />
              </div>

              {/* Entries for this date */}
              {dateItems.map(item => {
                const isOrder = item.type === 'ORDER';
                const { isCancelled, isPending } = item;
                const isLeft = isOrder;

                let cardClass = 'ledger-card';
                if (isCancelled) cardClass += ' ledger-card-cancelled';
                else if (isPending) cardClass += ' ledger-card-pending';
                else if (isOrder) cardClass += ' ledger-card-order';
                else cardClass += ' ledger-card-payment';

                const borderRadius = isLeft ? '4px 14px 14px 14px' : '14px 4px 14px 14px';

                return (
                  <div key={`${item.type}-${item.id}`} className={`ledger-entry ${isLeft ? 'ledger-entry-left' : 'ledger-entry-right'}`}>
                    <div className={cardClass} style={{ borderRadius }}>
                      {/* Diagonal strikethrough for cancelled */}
                      {isCancelled && <div className="ledger-card-strike" />}

                      {/* Header row */}
                      <div className="ledger-card-header">
                        <span className="ledger-card-type">
                          {isCancelled ? '✗ Cancelled' : isPending ? '⏳ Pending' : isOrder ? 'Gave' : 'Got'}
                        </span>
                        {!isOrder && (
                          <div className="ledger-card-actions">
                            <button
                              onClick={() => { setEditPayment(item.raw); setShowPaymentModal(true); }}
                              title="Edit payment"
                              className="ledger-action-btn ledger-action-edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(item)}
                              title="Delete payment"
                              className="ledger-action-btn ledger-action-delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div className={`ledger-card-amount ${isCancelled ? 'ledger-card-struck' : ''}`}>
                        {fmtCurrency(item.amount)}
                      </div>

                      {/* Description */}
                      <div className={`ledger-card-desc ${isCancelled ? 'ledger-card-struck' : ''}`}>
                        {item.description}
                        {isPending && !isCancelled && (
                          <span className="ledger-not-delivered">Not Delivered</span>
                        )}
                      </div>

                      {/* Delivered date for delivered orders */}
                      {isOrder && !isPending && !isCancelled && item.raw.delivered_date && (
                        <div className="ledger-card-delivered">
                          Delivered on {fmtDisplay(item.raw.delivered_date.slice(0, 10))}
                        </div>
                      )}

                      {/* Receipt shown inline by default */}
                      {!isOrder && item.raw.receipt_url && (
                        <div className="ledger-receipt-inline">
                          <img src={item.raw.receipt_url} alt="Receipt" className="ledger-receipt-img" />
                        </div>
                      )}

                      {/* Running balance footer */}
                      {!isCancelled && (
                        <div className="ledger-card-footer">
                          <span className="ledger-balance-label">Balance</span>
                          <span className="ledger-balance-value" style={{ color: item.runningBalance > 0 ? '#fca5a5' : item.runningBalance < 0 ? '#86efac' : 'var(--text)' }}>
                            {fmtCurrency(Math.abs(item.runningBalance))} {item.runningBalance > 0 ? 'Due' : item.runningBalance < 0 ? 'Advance' : 'Clear'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Infinite scroll sentinel + loading state */}
        {!loading && items.length > 0 && (
          <>
            {loadingMore && (
              <div className="ledger-loading-more">Loading more…</div>
            )}
            {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
            {!hasMore && items.length > 20 && (
              <div className="ledger-end-marker">— End of ledger —</div>
            )}
          </>
        )}
      </div>

      {showPaymentModal && (seller || editPayment) && (
        <AddPaymentModal
          seller={seller}
          editPayment={editPayment || null}
          onClose={() => { setShowPaymentModal(false); setEditPayment(null); }}
          onSuccess={() => { setShowPaymentModal(false); setEditPayment(null); loadInitial(); }}
        />
      )}
      {confirm && (
        <ConfirmModal title="Delete Payment?" message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}

    </>
  );
}
