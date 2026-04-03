import { useState, useEffect } from 'react';
import { getSellers, deleteSeller } from '../api';
import { Plus, Trash2, Pencil, BookText, Wallet, MapPin, TrendingUp, TrendingDown, ChevronLeft, Phone, Users } from 'lucide-react';
import { fmtCurrency, fmtSignedCurrency, profitColor } from '../utils/formatters';
import { PAGE_SIZE } from '../constants';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AddSellerModal from '../components/AddSellerModal';
import ConfirmModal from '../common/ConfirmModal';
import AddPaymentModal from '../components/AddPaymentModal';
import ActionMenu from '../common/ActionMenu';
import Pagination from '../common/Pagination';

export default function SellersPage() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [editSeller, setEditSeller] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [paymentSeller, setPaymentSeller] = useState(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const loadSellers = async () => {
    try {
      setLoading(true);
      const data = await getSellers();
      setSellers(data);
      setPage(1);
    } catch (err) { console.error('Failed to load sellers', err);
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSellers(); }, []);

  const handleDelete = (seller) => {
    setConfirm({
      message: `Delete seller "${seller.name}"? This will only work if there are no existing orders assigned to them.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteSeller(seller._id);
          toast.success('Seller deleted');
          loadSellers();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete seller');
        }
      }
    });
  };

  const handleEdit = (seller) => {
    setEditSeller(seller);
    setShowAddModal(true);
  };

  // Pagination
  const totalPages  = Math.ceil(sellers.length / PAGE_SIZE);
  const pageSellers = sellers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Aggregate stats across all sellers
  const totalDue      = sellers.reduce((s, x) => s + (x.due_balance  || 0), 0);
  const totalReceived = sellers.reduce((s, x) => s + (x.total_received || 0), 0);
  const totalProfit   = sellers.reduce((s, x) => s + (x.profit        || 0), 0);

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
              <h1 className="page-hero-title">Sellers Tracking</h1>
              {!loading && sellers.length > 0 && (
                <span className="page-hero-subtitle">{sellers.length} seller{sellers.length !== 1 ? 's' : ''} registered</span>
              )}
            </div>
          </div>

          <div className="page-hero-actions">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Seller
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats bar — only when sellers exist */}
        {!loading && sellers.length > 0 && (
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: 'rgba(248, 81, 73, 0.12)', color: 'var(--danger)' }}>
                  <TrendingDown size={16} />
                </div>
                <span className="stat-card-label">Amount Due</span>
              </div>
              <div className="stat-card-value" style={{ color: totalDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {fmtCurrency(totalDue)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: 'rgba(63, 185, 80, 0.12)', color: 'var(--success)' }}>
                  <Wallet size={16} />
                </div>
                <span className="stat-card-label">Amount Received</span>
              </div>
              <div className="stat-card-value" style={{ color: 'var(--success)' }}>
                {fmtCurrency(totalReceived)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: 'rgba(88, 166, 255, 0.12)', color: 'var(--accent)' }}>
                  <TrendingUp size={16} />
                </div>
                <span className="stat-card-label">Total Profit</span>
              </div>
              <div className="stat-card-value" style={{ color: profitColor(totalProfit) }}>
                {fmtSignedCurrency(totalProfit)}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="empty-state-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer shimmer-table-row" />
              ))}
            </div>
          </div>
        ) : sellers.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-sellers">
              <Users size={32} />
            </div>
            <div className="empty-title">No sellers added yet</div>
            <div className="empty-sub">Add your first seller to start tracking their orders, payments, and profits.</div>
            <div className="empty-cta">
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Add First Seller
              </button>
            </div>
          </div>
        ) : (
          <div className="table-card">
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Seller Name</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Expected (from Orders)</th>
                    <th>Received (Payments)</th>
                    <th>Due Balance</th>
                    <th>Profit</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSellers.map(seller => (
                    <tr
                      key={seller._id}
                      onClick={() => navigate(`/sellers/${seller._id}/ledger`)}
                      style={{ cursor: 'pointer' }}
                      title={`View ledger for ${seller.name}`}
                    >
                      <td className="font-semibold">{seller.name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                          <MapPin size={13} style={{ flexShrink: 0 }} />
                          {seller.city}
                        </div>
                      </td>
                      <td>
                        {seller.phone
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                              <Phone size={13} style={{ flexShrink: 0 }} />
                              {seller.phone}
                            </div>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td className="font-medium text-muted">{fmtCurrency(seller.total_amount_get)}</td>
                      <td className="font-medium text-green">{fmtCurrency(seller.total_received || 0)}</td>
                      <td className="font-bold" style={{ color: profitColor(-(seller.due_balance || 0)) }}>
                        {fmtCurrency(seller.due_balance || 0)}
                      </td>
                      <td className="font-medium" style={{ color: profitColor(seller.profit) }}>
                        {fmtSignedCurrency(seller.profit)}
                      </td>
                      <td className="text-right">
                        <ActionMenu
                          id={seller._id}
                          openId={openDropdown}
                          onToggle={setOpenDropdown}
                          items={[
                            { label: 'Add Payment', icon: <Wallet size={15} />,   color: 'var(--success)', onClick: () => setPaymentSeller(seller) },
                            { label: 'View Ledger', icon: <BookText size={15} />,  color: 'var(--info)',    onClick: () => navigate(`/sellers/${seller._id}/ledger`) },
                            { label: 'Edit Seller', icon: <Pencil size={15} />,    color: 'var(--text)',    onClick: () => handleEdit(seller) },
                            { label: 'Delete Seller', icon: <Trash2 size={15} />,  color: 'var(--danger)',  className: 'border-top', onClick: () => handleDelete(seller) },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={sellers.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {showAddModal && (
        <AddSellerModal
          onClose={() => { setShowAddModal(false); setEditSeller(null); }}
          onSuccess={loadSellers}
          editSeller={editSeller}
        />
      )}

      {confirm && (
        <ConfirmModal
          title="Delete Seller"
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {paymentSeller && (
        <AddPaymentModal
          seller={paymentSeller}
          onClose={() => setPaymentSeller(null)}
          onSuccess={loadSellers}
        />
      )}
    </>
  );
}
