import { useState, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateOrder } from '../api';
import { fmtCurrency, cardLabel } from '../utils/formatters';

export default function OrderRemarkModal({ order, onClose, onSaved }) {
  const [remark, setRemark] = useState(order?.remark || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRemark(order?.remark || '');
  }, [order]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateOrder(order._id, { remark: remark.trim() });
      toast.success(remark.trim() ? 'Remark saved' : 'Remark cleared');
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save remark');
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  const orderDate = new Date(order.order_date).toLocaleDateString('en-GB');

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <MessageSquare size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Order Remark
          </h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="remark-order-summary">
            <div className="remark-summary-title">{order.model_ordered}</div>
            <div className="remark-summary-meta">
              <span>{order.ecomm_site}</span>
              <span>·</span>
              <span>{fmtCurrency(order.order_amount)}</span>
              <span>·</span>
              <span>{orderDate}</span>
            </div>
            <div className="remark-summary-meta">
              <span>{order.seller_id?.name || '—'}{order.seller_id?.city ? `, ${order.seller_id.city}` : ''}</span>
              {order.card_id && (
                <>
                  <span>·</span>
                  <span>{cardLabel(order.card_id)}</span>
                </>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <label className="form-label">Remark</label>
            <textarea
              className="form-input form-textarea"
              rows={4}
              placeholder="Add notes, reminders, or context about this order…"
              value={remark}
              onChange={e => setRemark(e.target.value.slice(0, 200))}
              maxLength={200}
            />
            <div className="form-help" style={{ textAlign: 'right', marginTop: '4px' }}>
              {remark.length}/200
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Remark'}
          </button>
        </div>
      </div>
    </div>
  );
}
