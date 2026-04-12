import { useState, useEffect, useRef, useCallback } from 'react';
import { getOrders, getAllOrders, deleteOrder, updateOrder, getCards, getAllSellers } from '../api';
import AddOrderModal from '../components/AddOrderModal';
import OrderRemarkModal from '../components/OrderRemarkModal';
import ActionMenu from '../common/ActionMenu';
import Pagination from '../common/Pagination';
import { ShoppingBag, MapPin, Pencil, Trash2, Filter, Search, X as XIcon, ChevronLeft, Download, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { ECOMM_SITES, PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../constants';
import { fmtCurrency, fmtSignedCurrency, cardLabel, sellerLabel, pickTruthy } from '../utils/formatters';
import { exportOrdersCSV } from '../utils/orderExport';
import DateRangeDropdown from '../common/DateRangeDropdown';
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
  const [totalOrders, setTotalOrders] = useState(0);
  const [cards, setCards] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [confirm, setConfirm] = useState(null);
  const [remarkOrder, setRemarkOrder] = useState(null);

  // Pre-fill seller filter if navigated from SellersPage
  const initSellerId = location.state?.seller_id || '';
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, seller_id: initSellerId });
  const [orderDatePreset, setOrderDatePreset] = useState('');
  const [deliveryDatePreset, setDeliveryDatePreset] = useState('');
  const debounceRef = useRef(null);

  const fetchOrders = useCallback(async (f, p = page, ps = pageSize) => {
    try {
      const params = { ...pickTruthy(f || filters), page: p, limit: ps };
      const { items, page: pageInfo } = await getOrders(params);
      setOrders(items);
      setTotalOrders(pageInfo.item_total);
    } catch (err) { console.error('Failed to load orders', err);
      toast.error('Failed to load orders');
    }
  }, [filters, page, pageSize]);

  const clearFilters = async () => {
    setFilters(EMPTY_FILTERS);
    setOrderDatePreset('');
    setDeliveryDatePreset('');
    setPage(1);
    await fetchOrders(EMPTY_FILTERS, 1, pageSize);
  };

  const handleSearchChange = (value) => {
    const next = { ...filters, model_ordered: value };
    setFilters(next);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(next, 1, pageSize), 450);
  };

  const loadData = async (p = page, ps = pageSize) => {
    try {
      setLoading(true);
      const initParams = initSellerId ? { seller_id: initSellerId } : {};
      const [ordersRes, fetchedCards, fetchedSellers] = await Promise.all([
        getOrders({ ...initParams, page: p, limit: ps }), getCards(), getAllSellers()
      ]);
      setOrders(ordersRes.items);
      setTotalOrders(ordersRes.page.item_total);
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
          const newPage = orders.length === 1 && page > 1 ? page - 1 : page;
          setPage(newPage);
          fetchOrders(filters, newPage, pageSize);
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete order');
        }
      }
    });
  };

  const [exporting, setExporting] = useState(false);
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const allOrders = await getAllOrders(pickTruthy(filters));
      if (!allOrders || allOrders.length === 0) {
        toast.error('No orders to export');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      exportOrdersCSV(allOrders, `orders_${today}.csv`);
      toast.success(`Exported ${allOrders.length} order${allOrders.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  const handleToggleClear = async (order) => {
    try {
      await updateOrder(order._id, { is_cleared: !order.is_cleared });
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, is_cleared: !o.is_cleared } : o));
    } catch {
      toast.error('Failed to update order');
    }
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

  // Pagination (server-side)
  const totalPages  = Math.ceil(totalOrders / pageSize);
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
                {totalOrders > 0 && (
                  <span className={`profit-badge ${totalProfit >= 0 ? 'profit-badge-positive' : 'profit-badge-negative'}`}>
                    Profit: {fmtSignedCurrency(totalProfit)}
                  </span>
                )}
              </div>
              {totalOrders > 0 && (
                <span className="page-hero-subtitle">{totalOrders} order{totalOrders !== 1 ? 's' : ''} tracked</span>
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
            <button
              className="btn btn-secondary btn-sm"
              style={{ flexShrink: 0 }}
              onClick={handleExportCSV}
              disabled={exporting || totalOrders === 0}
              data-tooltip="Export orders as CSV"
            >
              <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => { setEditOrder(null); setShowModal(true); }}>
              <ShoppingBag size={14} /> Add Order
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Filter panel — compact grid */}
        {showFilters && (
          <div className="filter-panel filter-panel-compact">
            <div className="filter-panel-header">
              <span className="filter-panel-title">
                <Filter size={14} /> Filters
              </span>
              <button className="modal-close" onClick={() => setShowFilters(false)}><XIcon size={16} /></button>
            </div>

            <div className="filter-grid-compact">
              <div className="filter-cell">
                <label className="filter-cell-label">Order Date</label>
                <DateRangeDropdown
                  dateFrom={filters.order_date_from}
                  dateTo={filters.order_date_to}
                  activePreset={orderDatePreset}
                  onChange={(from, to, preset) => {
                    setFilters(f => ({ ...f, order_date_from: from, order_date_to: to }));
                    setOrderDatePreset(preset || '');
                  }}
                />
              </div>
              <div className="filter-cell">
                <label className="filter-cell-label">Delivery Date</label>
                <DateRangeDropdown
                  dateFrom={filters.delivery_date_from}
                  dateTo={filters.delivery_date_to}
                  activePreset={deliveryDatePreset}
                  onChange={(from, to, preset) => {
                    setFilters(f => ({ ...f, delivery_date_from: from, delivery_date_to: to }));
                    setDeliveryDatePreset(preset || '');
                  }}
                />
              </div>
              <div className="filter-cell">
                <label className="filter-cell-label">Buyer</label>
                <SearchableDropdown
                  options={['All Buyers', ...sellerOptions.map(o => o.label)]}
                  value={filters.seller_id ? (sellerOptions.find(o => o.value === filters.seller_id)?.label || '') : ''}
                  onChange={val => {
                    const opt = sellerOptions.find(o => o.label === val);
                    setFilters(f => ({ ...f, seller_id: opt ? opt.value : '' }));
                  }}
                  placeholder="All Buyers"
                />
              </div>
              <div className="filter-cell">
                <label className="filter-cell-label">Card</label>
                <SearchableDropdown
                  options={['All Cards', ...cardOptions.map(o => o.label)]}
                  value={filters.card_id ? (cardOptions.find(o => o.value === filters.card_id)?.label || '') : ''}
                  onChange={val => {
                    const opt = cardOptions.find(o => o.label === val);
                    setFilters(f => ({ ...f, card_id: opt ? opt.value : '' }));
                  }}
                  placeholder="All Cards"
                />
              </div>
              <div className="filter-cell">
                <label className="filter-cell-label">Source</label>
                <SearchableDropdown
                  options={sourceOptions}
                  value={filters.ecomm_site || ''}
                  onChange={val => setFilters(f => ({ ...f, ecomm_site: val === 'All' ? '' : val }))}
                  placeholder="All Sources"
                />
              </div>
              <div className="filter-cell">
                <label className="filter-cell-label">Status</label>
                <SearchableDropdown
                  options={STATUS_FILTER_OPTIONS}
                  value={{ Yes: 'Delivered', No: 'Pending', Cancelled: 'Cancelled' }[filters.delivery_status] || ''}
                  onChange={val => {
                    const dbVal = { Delivered: 'Yes', Pending: 'No', Cancelled: 'Cancelled' }[val] || '';
                    setFilters(f => ({ ...f, delivery_status: dbVal }));
                  }}
                  placeholder="All Statuses"
                />
              </div>
            </div>

            <div className="filter-panel-footer">
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear All</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setPage(1); fetchOrders(filters, 1, pageSize); }}>Apply Filters</button>
            </div>
          </div>
        )}

        {totalOrders === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-orders">
              <ShoppingBag size={32} />
            </div>
            <div className="empty-title">No orders yet</div>
            <div className="empty-sub">Start tracking your orders to monitor profits, delivery status, and buyer performance.</div>
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
              <table className="data-table table-freeze-first">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order Date</th>
                    <th>Delivery Date</th>
                    <th>Item</th>
                    <th>Source &amp; Account</th>
                    <th>Buyer</th>
                    <th>Card</th>
                    <th>Ordered</th>
                    <th>Returned</th>
                    <th>Cashback</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th>Clear</th>
                    <th className="text-right col-action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const profit      = order.return_amount - order.order_amount + order.cashback;
                    const isCancelled = order.delivery_status === 'Cancelled';
                    const isDelivered = order.delivery_status === 'Yes';

                    const hasRemark = Boolean(order.remark && order.remark.trim());

                    return (
                      <tr
                        key={order._id}
                        className="order-row-clickable"
                        style={isCancelled ? { opacity: 0.5 } : {}}
                        onClick={() => setRemarkOrder(order)}
                      >
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{(page - 1) * pageSize + index + 1}</span>
                            {hasRemark && (
                              <MessageSquare
                                size={13}
                                style={{ flexShrink: 0, color: 'var(--accent)' }}
                                aria-label="Has remark"
                              />
                            )}
                          </div>
                        </td>
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
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            className={`toggle-btn ${order.is_cleared ? 'toggle-on' : 'toggle-off'}`}
                            onClick={e => { e.stopPropagation(); handleToggleClear(order); }}
                          />
                        </td>
                        <td className="text-right col-action" onClick={e => e.stopPropagation()}>
                          <ActionMenu
                            id={order._id}
                            openId={openMenu}
                            onToggle={setOpenMenu}
                            items={[
                              { label: hasRemark ? 'Edit Remark' : 'Add Remark', icon: <MessageSquare size={14} />, onClick: () => setRemarkOrder(order) },
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
              totalItems={totalOrders}
              pageSize={pageSize}
              onPage={p => { setPage(p); fetchOrders(filters, p, pageSize); }}
              onPageSize={size => { setPageSize(size); setPage(1); fetchOrders(filters, 1, size); }}
              label="orders"
            />
          </div>
        )}
      </div>

      {showModal && (
        <AddOrderModal
          onClose={() => { setShowModal(false); setEditOrder(null); }}
          onSuccess={() => fetchOrders(filters, page, pageSize)}
          editOrder={editOrder}
          cards={cards}
          sellers={sellers}
        />
      )}

      {remarkOrder && (
        <OrderRemarkModal
          order={remarkOrder}
          onClose={() => setRemarkOrder(null)}
          onSaved={(updated) => {
            setOrders(prev => prev.map(o => o._id === updated._id ? { ...o, remark: updated.remark } : o));
          }}
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
