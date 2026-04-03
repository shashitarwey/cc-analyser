import { useState, useEffect } from 'react';
import { getOrders, getSellerLedger, deleteSellerPayment } from '../api';
import { X, Plus, Trash2, Camera, ExternalLink } from 'lucide-react';
import { fmtCurrency, fmtDisplay } from '../utils/formatters';
import toast from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';

export default function SellerLedgerModal({ seller, onClose, onAddPayment }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const resOrders = await getOrders({ seller_id: seller._id, limit: 1000 });
      const activeOrders = (Array.isArray(resOrders) ? resOrders : (resOrders.items || [])).filter(o => o.delivery_status !== 'Cancelled');
      
      const mappedOrders = activeOrders.map(o => ({
        id: o._id,
        type: 'ORDER',
        date: new Date(o.order_date),
        description: `Model: ${o.model_ordered}${o.quantity > 1 ? ` (x${o.quantity})` : ''}`,
        amount_expected: o.return_amount,
        amount_paid: 0,
        raw: o
      }));

      const resPayments = await getSellerLedger(seller._id);
      const mappedPayments = resPayments.map(p => ({
        id: p._id,
        type: 'PAYMENT',
        date: new Date(p.payment_date),
        description: p.notes ? p.notes : 'Payment Received',
        amount_expected: 0,
        amount_paid: p.amount,
        raw: p
      }));

      const merged = [...mappedOrders, ...mappedPayments].sort((a, b) => a.date - b.date);

      let runningBalance = 0;
      const ledger = merged.map(item => {
        const isPendingOrder = item.type === 'ORDER' && item.raw.delivery_status !== 'Yes';
        
        if (!isPendingOrder) {
          runningBalance += item.amount_expected;
        }
        
        runningBalance -= item.amount_paid;
        return { ...item, runningBalance };
      });

      setItems(ledger); // Oldest first for chat flow
    } catch (err) {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [seller._id]);

  const handleDeletePayment = (payment) => {
    setConfirm({
      message: `Delete this payment of ${fmtCurrency(payment.amount_paid)}?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteSellerPayment(payment.id);
          toast.success('Payment deleted');
          fetchLedger();
        } catch (err) {
          toast.error('Failed to delete payment');
        }
      }
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '600px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--bg)' }}>
        
        {/* Sticky Header */}
        <div style={{ padding: '16px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="text-xl font-bold m-0" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {seller.name}
            </h2>
            <div className="text-sm mt-4">
              Balance Due: <strong style={{ color: seller.due_balance > 0 ? 'var(--danger)' : seller.due_balance < 0 ? 'var(--success)' : 'var(--text)' }}>
                {fmtCurrency(seller.due_balance || 0)}
              </strong>
            </div>
          </div>
          <div className="d-flex items-center gap-16">
            <button className="icon-btn" onClick={onClose}><X size={24} /></button>
          </div>
        </div>

        {/* Timeline / Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
             <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Loading Khata Book...</div>
          ) : items.length === 0 ? (
            <div className="empty-state" style={{ marginTop: '40px' }}>
              <div className="empty-sub">No transactions recorded yet.</div>
            </div>
          ) : (
            items.map((item, idx) => {
              const isOrder = item.type === 'ORDER';
              const isPendingOrder = isOrder && item.raw.delivery_status !== 'Yes';
              const alignment = isOrder ? 'flex-start' : 'flex-end';
              
              let bgColor = isOrder ? (isPendingOrder ? 'var(--surface-hover)' : 'rgba(239, 68, 68, 0.05)') : 'rgba(74, 222, 128, 0.15)';
              let borderColor = isOrder ? (isPendingOrder ? 'rgba(156, 163, 175, 0.4)' : 'rgba(239, 68, 68, 0.3)') : 'rgba(74, 222, 128, 0.3)';
              let textColor = isPendingOrder ? 'var(--text-muted)' : isOrder ? 'var(--danger)' : 'var(--success)';

              return (
                <div key={`${item.type}-${item.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: alignment, width: '100%' }}>
                  <div style={{ 
                    maxWidth: '85%', 
                    background: bgColor, 
                    border: `1px solid ${borderColor}`,
                    borderRadius: '12px',
                    padding: '12px 16px',
                    position: 'relative'
                  }}>
                    {/* Header: Date + Delete Action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{fmtDisplay(item.date.toISOString().slice(0, 10))}</span>
                      {!isOrder && (
                        <button onClick={() => handleDeletePayment(item)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div style={{ marginBottom: '8px' }}>
                      <div className="font-semibold text-lg" style={{ color: textColor }}>
                        {isOrder ? 'Gave: ' : 'Got: '}{fmtCurrency(isOrder ? item.amount_expected : item.amount_paid)}
                      </div>
                      <div className="text-sm mt-4">
                        {item.description}
                        {isPendingOrder && <span className="badge badge-surface ml-8" style={{ fontSize: '0.65rem' }}>PENDING DELIVERY</span>}
                      </div>
                      
                      {/* Image receipt thumbnail if payment */}
                      {!isOrder && item.raw.receipt_url && (
                         <div style={{ marginTop: '12px' }}>
                           <a href={item.raw.receipt_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '6px', color: 'var(--text)', textDecoration: 'none' }}>
                             <Camera size={14} /> View Receipt <ExternalLink size={12} />
                           </a>
                         </div>
                      )}
                    </div>

                    {/* Footer Running Balance */}
                    <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '8px', fontSize: '0.8rem', textAlign: isOrder ? 'left' : 'right', color: 'var(--text-muted)' }}>
                      Bal: <span style={{ fontWeight: 600, color: item.runningBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmtCurrency(item.runningBalance)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer / Action Area */}
        <div style={{ padding: '16px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
           <button className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', py: '12px' }} onClick={onAddPayment}>
              <Plus size={18} /> Add Payment Received
           </button>
        </div>

      </div>
      
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
