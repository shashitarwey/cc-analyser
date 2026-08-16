import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomer, getCustomerEntries, getCustomerEntriesFeed, deleteCustomerEntry } from '../api';
import { ChevronLeft, Phone, TrendingUp, TrendingDown, Wallet, Trash2, Pencil, BookOpen, ArrowUpRight, ArrowDownLeft, FileDown } from 'lucide-react';
import { fmtCurrency, fmtDisplay, profitColor } from '../utils/formatters';
import { downloadKhataPdf } from '../utils/khataPdf';
import toast from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';
import AddKhataEntryModal from '../components/AddKhataEntryModal';
import ReportRangeModal from '../components/ReportRangeModal';

export default function KhataDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState('gave');
  const [editEntry, setEditEntry] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const sentinelRef = useRef(null);
  const PAGE_LIMIT = 20;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setEntries([]);
    setPage(1);
    try {
      const [cust, feedRes] = await Promise.all([
        getCustomer(id),
        getCustomerEntriesFeed(id, { page: 1, limit: PAGE_LIMIT }),
      ]);
      setCustomer(cust);
      setEntries(feedRes.items);
      setHasMore(feedRes.page.has_next);
    } catch {
      toast.error('Failed to load khata');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const feedRes = await getCustomerEntriesFeed(id, { page: nextPage, limit: PAGE_LIMIT });
      setEntries(prev => [...prev, ...feedRes.items]);
      setHasMore(feedRes.page.has_next);
      setPage(nextPage);
    } catch {
      toast.error('Failed to load more entries');
    } finally {
      setLoadingMore(false);
    }
  }, [id, page, hasMore, loadingMore]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

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

  const openAdd = (type) => {
    setEditEntry(null);
    setEntryType(type);
    setShowEntryModal(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEntryType(entry.type);
    setShowEntryModal(true);
  };

  const handleDelete = (entry) => {
    setConfirm({
      message: `Delete this ${entry.type === 'gave' ? 'You Gave' : 'You Got'} entry of ${fmtCurrency(entry.amount)}?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteCustomerEntry(entry._id);
          toast.success('Entry deleted');
          // Running balances shift — refresh from page 1
          loadInitial();
        } catch {
          toast.error('Failed to delete entry');
        }
      }
    });
  };

  // PDF needs ALL entries even when a date range is picked — entries before
  // the range roll up into the report's opening balance.
  const handleDownloadPdf = async (range) => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const all = await getCustomerEntries(id);
      const res = downloadKhataPdf(customer, all, range);
      if (!res.ok) toast.error('Failed to generate report');
      else setShowReportModal(false);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setPdfLoading(false);
    }
  };

  // Entries come from the server newest-first with `runningBalance` attached.
  // Group them by date preserving insertion order (newest date first).
  const dateGroups = [];
  let currentGroup = null;
  for (const e of entries) {
    const key = e.entry_date.slice(0, 10);
    if (!currentGroup || currentGroup.key !== key) {
      currentGroup = { key, entries: [] };
      dateGroups.push(currentGroup);
    }
    currentGroup.entries.push(e);
  }

  const totalGave = customer?.total_gave || 0;
  const totalGot = customer?.total_got || 0;
  const balance = customer?.balance || 0;

  return (
    <>
      <div className="page-hero ledger-hero">
        <div className="page-hero-inner">
          <div className="page-hero-left">
            <button
              className="btn-back-circle"
              onClick={() => navigate('/khata')}
              data-tooltip="Back to Khata"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="ledger-hero-divider" />
            <div className="page-hero-title-group">
              <h1 className="page-hero-title">
                {customer ? customer.name : 'Loading…'}
              </h1>
              {customer && (
                <div className="ledger-hero-meta">
                  {customer.phone ? (<><Phone size={12} /> {customer.phone} <span className="ledger-hero-dot">·</span></>) : null}
                  <span>Khata Book</span>
                </div>
              )}
            </div>
          </div>

          {customer && (
            <div className="page-hero-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReportModal(true)}
                disabled={loading || pdfLoading || entries.length === 0}
              >
                <FileDown size={14} /> {pdfLoading ? 'Preparing…' : 'Download Report'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {customer && !loading && (
        <div className="ledger-stats-bar">
          <div className="ledger-stats-inner">
            <div className="ledger-stats-row">
              {[
                { label: 'You Gave',  value: totalGave, color: '#fca5a5', icon: <TrendingDown size={14} /> },
                { label: 'You Got',   value: totalGot,  color: '#86efac', icon: <TrendingUp size={14} /> },
                { label: 'Balance',   value: Math.abs(balance), color: profitColor(-balance), icon: <Wallet size={14} />, suffix: '' },
              ].map((stat, i) => (
                <div key={i} className="ledger-stat-item">
                  <div className="ledger-stat-label">
                    {stat.icon} {stat.label}
                  </div>
                  <div className="ledger-stat-value" style={{ color: stat.color }}>
                    {fmtCurrency(stat.value)} {stat.suffix || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="ledger-timeline" style={{ paddingBottom: '130px' }}>
        {loading ? (
          <div className="ledger-loading">
            {[1, 2, 3].map(i => <div key={i} className="shimmer shimmer-table-row" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-sellers">
              <BookOpen size={32} />
            </div>
            <div className="empty-title">No entries yet</div>
            <div className="empty-sub">Tap "You Gave" or "You Got" below to record the first entry.</div>
          </div>
        ) : (
          dateGroups.map(group => (
            <div key={group.key}>
              <div className="ledger-date-sep">
                <div className="ledger-date-line" />
                <span className="ledger-date-pill">{fmtDisplay(group.key)}</span>
                <div className="ledger-date-line" />
              </div>

              {group.entries.map(entry => {
                const isGave = entry.type === 'gave';
                const isLeft = isGave;
                const cardClass = `ledger-card ${isGave ? 'ledger-card-order' : 'ledger-card-payment'}`;
                const borderRadius = isLeft ? '4px 14px 14px 14px' : '14px 4px 14px 14px';

                return (
                  <div key={entry._id} className={`ledger-entry ${isLeft ? 'ledger-entry-left' : 'ledger-entry-right'}`}>
                    <div className={cardClass} style={{ borderRadius }}>
                      <div className="ledger-card-header">
                        <span className="ledger-card-type">
                          {isGave ? 'You Gave' : 'You Got'}
                        </span>
                        <div className="ledger-card-actions">
                          <button
                            onClick={() => openEdit(entry)}
                            title="Edit entry"
                            className="ledger-action-btn ledger-action-edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            title="Delete entry"
                            className="ledger-action-btn ledger-action-delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="ledger-card-amount">
                        {fmtCurrency(entry.amount)}
                      </div>

                      {entry.notes && (
                        <div className="ledger-card-desc">
                          {entry.notes}
                        </div>
                      )}

                      <div className="ledger-card-footer">
                        <span className="ledger-balance-label">Balance</span>
                        <span className="ledger-balance-value" style={{ color: entry.runningBalance > 0 ? '#fca5a5' : entry.runningBalance < 0 ? '#86efac' : 'var(--text)' }}>
                          {fmtCurrency(Math.abs(entry.runningBalance))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Infinite scroll sentinel + loading state */}
        {!loading && entries.length > 0 && (
          <>
            {loadingMore && (
              <div className="ledger-loading-more">Loading more…</div>
            )}
            {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
            {!hasMore && entries.length > 20 && (
              <div className="ledger-end-marker">— End of khata —</div>
            )}
          </>
        )}
      </div>

      {/* Sticky action bar at bottom with You Gave / You Got */}
      {customer && (
        <div className="khata-action-bar">
          <div className="khata-action-inner">
            <button
              className="btn khata-btn-gave"
              onClick={() => openAdd('gave')}
            >
              <ArrowUpRight size={16} /> You Gave
            </button>
            <button
              className="btn khata-btn-got"
              onClick={() => openAdd('got')}
            >
              <ArrowDownLeft size={16} /> You Got
            </button>
          </div>
        </div>
      )}

      {showReportModal && customer && (
        <ReportRangeModal
          title="Download Khata Report"
          subtitle={`Statement for ${customer.name}. Pick a period, or download the full history.`}
          loading={pdfLoading}
          onClose={() => setShowReportModal(false)}
          onGenerate={handleDownloadPdf}
        />
      )}

      {showEntryModal && customer && (
        <AddKhataEntryModal
          customer={customer}
          editEntry={editEntry}
          defaultType={entryType}
          onClose={() => { setShowEntryModal(false); setEditEntry(null); }}
          onSuccess={() => { setShowEntryModal(false); setEditEntry(null); loadInitial(); }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title="Delete Entry?"
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
