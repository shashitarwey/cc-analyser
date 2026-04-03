import { useState, useEffect, useRef, useCallback } from 'react';
import { getOrders, deleteOrder, getCards, getSellers } from '../api';
import AddOrderModal from '../components/AddOrderModal';
import ActionMenu from '../common/ActionMenu';
import Pagination from '../common/Pagination';
import { ShoppingBag, MapPin, Pencil, Trash2, Filter, Search, X as XIcon, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { ECOMM_SITES, PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../constants';
import { fmtCurrency, fmtSignedCurrency, cardLabel, sellerLabel, pickTruthy } from '../utils/formatters';
import SingleDatePicker from '../common/SingleDatePicker';
import SearchableDropdown from '../common/SearchableDropdown';
import ConfirmModal from '../common/ConfirmModal';
import { useLocation, useNavigate } from 'react-router-dom';

const EMPTY_FILTERS = {
  order_date_from: '', order_date_to: '',
  delivery_date_from: '', delivery_date_to: '',
  seller_id: '', card_id: '', delivery_status: '',
  model_ordered: '', ecomm_site: ''
};

export default function OrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [cards, setCards] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);

  // Pre-fill seller filter if navigated from SellersPage
  const initSellerId = location.state?.seller_id || '';
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, seller_id: initSellerId });
  const debounceRef = useRef(null);

  const fetchOrders = useCallback(async (f) => {
    try {
      const params = pickTruthy(f || filters);
      const fetched = await getOrders(params);
      setOrders(fetched);
    } catch (err) { console.error('Failed to load cards/sellers', err);
      toast.error('Failed to load orders');
    }
  }, [filters]);

  const clearFilters = async () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    await fetchOrders(EMPTY_FILTERS);
  };

  const handleSearchChange = (value) => {
    const next = { ...filters, model_ordered: value };
    setFilters(next);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(next), 450);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const initParams = initSellerId ? { seller_id: initSellerId } : {};
      const [fetchedOrders, fetchedCards, fetchedSellers] = await Promise.all([
        getOrders(initParams), getCards(), getSellers()
      ]);
      setOrders(fetchedOrders);
      setCards(fetchedCards);
      setSellers(fetchedSellers);
    } catch (err) { console.error('Failed to load orders', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (initSellerId) setShowFilters(true);
    return () => clearTimeout(debounceRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (id) => {
    setConfirm({
      message: 'Delete this order? This action cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteOrder(id);
          toast.success('Order deleted');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete order');
        }
      }
    });
  };

  if (loading) {
    return (
      <>
        <div className="page-hero">
          <div className="page-hero-inner">
            <div className="page-hero-left">
              <div className="shimmer shimmer-text" style={{ width: '200px', height: '32px' }} />
            </div>
          </div>
        </div>
        <div className="page-content">
          <div className="empty-state-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer shimmer-table-row" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const totalProfit = orders.reduce((sum, o) => {
    if (o.delivery_status === 'Cancelled') return sum;
    return sum + (o.return_amount - o.order_amount + o.cashback);
  }, 0);

  const sellerOptions = sellers.map(s => ({ label: sellerLabel(s), value: s._id }));
  const cardOptions   = cards.map(c => ({ label: cardLabel(c), value: c._id }));
  const sourceOptions = ['All', ...ECOMM_SITES];
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== 'model_ordered' && v);

  // Pagination
  const totalPages  = Math.ceil(orders.length / PAGE_SIZE);
  const pageOrders  = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeSeller = initSellerId ? sellers.find(s => s._id === initSellerId) : null;

  return (
    <>
      {/* Page Hero Header */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-left">
            <button
              className="btn-back-circle"
              onClick={() => navigate(-1)}
              data-tooltip="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="page-hero-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 className="page-hero-title">Order Tracker</h1>
                {orders.length > 0 && (
                  <span className={`profit-badge ${totalProfit >= 0 ? 'profit-badge-positive' : 'profit-badge-negative'}`}>
                    Profit: {fmtSignedCurrency(totalProfit)}
                  </span>
                )}
              </div>
              {orders.length > 0 && (
                <span className="page-hero-subtitle">{orders.length} order{orders.length !== 1 ? 's' : ''} tracked</span>
              )}
            </div>
          </div>

          <div className="page-hero-actions">
            <div className="search-bar">
              <Search size={14} className="search-bar-icon" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Search item..."
                value={filters.model_ordered}
                onChange={e => handleSearchChange(e.target.value)}
              />
              {filters.model_ordered && (
                <button className="search-bar-clear" onClick={() => handleSearchChange('')}>
                  <XIcon size={13} />
                </button>
              )}
            </div>
            <button
              className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
              style={{ position: 'relative', flexShrink: 0 }}
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter size={14} /> Filters
              {hasActiveFilters && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '7px', height: '7px', background: 'var(--accent)', borderRadius: '50%' }} />}
            </button>
            <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => { setEditOrder(null); setShowModal(true); }}>
              <ShoppingBag size={14} /> Add Order
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Filter panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-panel-header">
              <span className="filter-panel-title">
                <Filter size={14} /> Filters
              </span>
              <button className="modal-close" onClick={() => setShowFilters(false)}><XIcon size={16} /></button>
            </div>

            <div className="filter-panel-body">
              {/* Date ranges */}
              <div className="filter-section-label">Order Date</div>
              <div className="filter-date-row">
                <div className="filter-date-pair">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>From</label>
                  <SingleDatePicker value={filters.order_date_from} onChange={v => setFilters(f => ({ ...f, order_date_from: v }))} placeholder="Start date" />
                </div>
                <span className="filter-date-sep">→</span>
                <div className="filter-date-pair">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>To</label>
                  <SingleDatePicker value={filters.order_date_to} onChange={v => setFilters(f => ({ ...f, order_date_to: v }))} placeholder="End date" />
                </div>
              </div>

              <div className="filter-section-label" style={{ marginTop: '18px' }}>Delivery Date</div>
              <div className="filter-date-row" style={{ marginBottom: '20px' }}>
                <div className="filter-date-pair">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>From</label>
                  <SingleDatePicker value={filters.delivery_date_from} onChange={v => setFilters(f => ({ ...f, delivery_date_from: v }))} placeholder="Start date" />
                </div>
                <span className="filter-date-sep">→</span>
                <div className="filter-date-pair">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>To</label>
                  <SingleDatePicker value={filters.delivery_date_to} onChange={v => setFilters(f => ({ ...f, delivery_date_to: v }))} placeholder="End date" />
                </div>
              </div>

              {/* Dropdowns */}
              <div className="filter-dropdowns">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Seller</label>
                  <SearchableDropdown
                    options={['All Sellers', ...sellerOptions.map(o => o.label)]}
                    value={filters.seller_id ? (sellerOptions.find(o => o.value === filters.seller_id)?.label || '') : 'All Sellers'}
                    onChange={val => {
                      const opt = sellerOptions.find(o => o.label === val);
                      setFilters(f => ({ ...f, seller_id: opt ? opt.value : '' }));
                    }}
                    placeholder="All Sellers"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Card</label>
                  <SearchableDropdown
                    options={['All Cards', ...cardOptions.map(o => o.label)]}
                    value={filters.card_id ? (cardOptions.find(o => o.value === filters.card_id)?.label || '') : 'All Cards'}
                    onChange={val => {
                      const opt = cardOptions.find(o => o.label === val);
                      setFilters(f => ({ ...f, card_id: opt ? opt.value : '' }));
                    }}
                    placeholder="All Cards"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Source</label>
                  <SearchableDropdown
                    options={sourceOptions}
                    value={filters.ecomm_site || 'All'}
                    onChange={val => setFilters(f => ({ ...f, ecomm_site: val === 'All' ? '' : val }))}
                    placeholder="All"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                  <SearchableDropdown
                    options={STATUS_FILTER_OPTIONS}
                    value={filters.delivery_status || 'All'}
                    onChange={val => setFilters(f => ({ ...f, delivery_status: val === 'All' ? '' : val }))}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>

            <div className="filter-panel-footer">
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear All</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setPage(1); fetchOrders(filters); }}>Apply Filters</button>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-orders">
              <ShoppingBag size={32} />
            </div>
            <div className="empty-title">No orders yet</div>
            <div className="empty-sub">Start tracking your orders to monitor profits, delivery status, and seller performance.</div>
            <div className="empty-cta">
              <button className="btn btn-primary" onClick={() => { setEditOrder(null); setShowModal(true); }}>
                <ShoppingBag size={16} /> Add First Order
              </button>
            </div>
          </div>
        ) : (
          <div className="table-card">
            {/* Pre-filter banner */}
            {initSellerId && activeSeller && location.state?.seller_name && (
              <div className="prefilter-banner">
                <span className="prefilter-banner-text">
                  Showing orders for <strong>{location.state.seller_name}</strong>
                </span>
                <button className="prefilter-banner-clear" onClick={clearFilters}>Clear filter</button>
              </div>
            )}

            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order Date</th>
                    <th>Delivery Date</th>
                    <th>Item</th>
                    <th>Source &amp; ID</th>
                    <th>Seller</th>
                    <th>Card</th>
                    <th>Ordered</th>
                    <th>Returned</th>
                    <th>Cashback</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th className="text-right col-action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map(order => {
                    const profit      = order.return_amount - order.order_amount + order.cashback;
                    const isCancelled = order.delivery_status === 'Cancelled';
                    const isDelivered = order.delivery_status === 'Yes';

                    return (
                      <tr key={order._id} style={isCancelled ? { opacity: 0.5 } : {}}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className="font-medium">{new Date(order.order_date).toLocaleDateString('en-GB')}</div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'var(--text-muted)' }}>{order.delivered_date ? new Date(order.delivered_date).toLocaleDateString('en-GB') : '—'}</div>
                        </td>
                        <td style={{ maxWidth: '160px' }}>
                          <div className="font-medium" title={order.model_ordered} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.model_ordered.length > 20 ? order.model_ordered.slice(0, 20) + '…' : order.model_ordered}
                            </span>
                            {order.quantity > 1 && <span style={{ flexShrink: 0, color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 5px', background: 'rgba(88,166,255,0.1)', borderRadius: '4px' }}>×{order.quantity}</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{order.variant !== 'NA' ? order.variant : ''}</div>
                        </td>
                        <td>
                          <div className="font-medium">{order.ecomm_site}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{order.id_used}</div>
                        </td>
                        <td>
                          <div className="font-medium">{order.seller_id?.name || '—'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <MapPin size={11} /> {order.seller_id?.city || ''}
                          </div>
                        </td>
                        <td>
                          {order.card_id ? <span className="tx-card-pill">{cardLabel(order.card_id)}</span> : '—'}
                        </td>
                        <td className="font-medium">{fmtCurrency(order.order_amount)}</td>
                        <td className="font-medium" style={{ color: 'var(--accent)' }}>{fmtCurrency(order.return_amount)}</td>
                        <td className="font-medium" style={{ color: 'var(--success)' }}>{fmtCurrency(order.cashback)}</td>
                        <td className="font-medium" style={{ color: isCancelled ? 'var(--text-muted)' : profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {isCancelled ? '—' : fmtSignedCurrency(profit)}
                        </td>
                        <td>
                          <span className={`badge ${isDelivered ? 'badge-success' : isCancelled ? 'badge-danger' : 'badge-surface'}`}>
                            {isDelivered ? 'Delivered' : isCancelled ? 'Cancelled' : 'Pending'}
                          </span>
                        </td>
                        <td className="text-right col-action">
                          <ActionMenu
                            id={order._id}
                            openId={openMenu}
                            onToggle={setOpenMenu}
                            items={[
                              { label: 'Edit Order', icon: <Pencil size={14} />, onClick: () => { setEditOrder(order); setShowModal(true); } },
                              { label: 'Delete',     icon: <Trash2 size={14} />, onClick: () => handleDelete(order._id), color: 'var(--danger)', className: 'border-top' },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={orders.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {showModal && (
        <AddOrderModal
          onClose={() => { setShowModal(false); setEditOrder(null); }}
          onSuccess={loadData}
          editOrder={editOrder}
          cards={cards}
          sellers={sellers}
        />
      )}

      {confirm && (
        <ConfirmModal
          title="Delete Order"
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
