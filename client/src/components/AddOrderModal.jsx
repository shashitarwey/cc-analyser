import { useState, useEffect } from 'react';
import { addOrder, updateOrder } from '../api';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { ECOMM_SITES, VARIANTS, DELIVERY_STATUS_OPTIONS, getToday } from '../constants';
import { cardLabel, sellerLabel } from '../utils/formatters';
import SingleDatePicker from '../common/SingleDatePicker';
import SearchableDropdown from '../common/SearchableDropdown';

const today = getToday();

export default function AddOrderModal({ onClose, onSuccess, editOrder, cards, sellers = [] }) {
  const [form, setForm] = useState({
    order_date: today,
    delivered_date: '',
    quantity: 1,
    unit_order_amount: '',
    unit_return_amount: '',
    order_amount: '',
    return_amount: '',
    cashback: 0,
    variant: 'NA',
    model_ordered: '',
    id_used: '',
    seller_id: '',
    delivery_status: 'No',
    ecomm_site: 'Amazon',
    card_id: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  useEffect(() => {
    if (editOrder) {
      const q = editOrder.quantity || 1;
      setForm({
        ...editOrder,
        order_date: editOrder.order_date ? editOrder.order_date.slice(0, 10) : '',
        delivered_date: editOrder.delivered_date ? editOrder.delivered_date.slice(0, 10) : '',
        card_id: editOrder.card_id?._id || editOrder.card_id || '',
        seller_id: editOrder.seller_id?._id || editOrder.seller_id || '',
        quantity: q,
        unit_order_amount: editOrder.order_amount / q,
        unit_return_amount: editOrder.return_amount / q,
        order_amount: editOrder.order_amount,
        return_amount: editOrder.return_amount
      });
    }
  }, [editOrder]);

  const selectedCard = cards?.find(c => c._id === form.card_id);
  const isCashbackEnabled = selectedCard?.cashback_enabled || false;

  const validate = () => {
    const e = {};
    if (!form.model_ordered.trim()) e.model_ordered = 'Item name is required';
    if (!form.card_id) e.card_id = 'Please select a card';
    if (!form.seller_id) e.seller_id = 'Please select a seller';
    if (!form.id_used.trim()) e.id_used = 'ID / Account is required';
    if (!form.order_date) e.order_date = 'Order date is required';
    if (!form.unit_order_amount || Number(form.unit_order_amount) <= 0) e.unit_order_amount = 'Enter order amount';
    if (form.unit_return_amount === '' || Number(form.unit_return_amount) < 0) e.unit_return_amount = 'Enter return amount';
    if (form.delivery_status === 'Yes' && !form.delivered_date) e.delivered_date = 'Delivery date is required when status is Delivered';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (editOrder) {
        await updateOrder(editOrder._id, form);
        toast.success('Order updated');
      } else {
        await addOrder(form);
        toast.success('Order added');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  const recalcAmounts = (field, value) => {
    const q = field === 'quantity' ? (Number(value) || 1) : (Number(form.quantity) || 1);
    const uOrder = field === 'unit_order_amount' ? Number(value) : Number(form.unit_order_amount);
    const uReturn = field === 'unit_return_amount' ? Number(value) : Number(form.unit_return_amount);
    const oAmt = uOrder * q;
    const rAmt = uReturn * q;
    let cb = Number(form.cashback);
    if (isCashbackEnabled && selectedCard) {
      cb = Math.round(oAmt * (selectedCard.cashback_percent / 100));
    }
    const update = { [field]: value, order_amount: oAmt, return_amount: rAmt, cashback: cb };
    if (field === 'quantity') update.quantity = Math.max(1, Number(value) || 1);
    setForm(f => ({ ...f, ...update }));
    if (errors[field]) setErrors(err => ({ ...err, [field]: '' }));
  };

  const variantOptions = VARIANTS.map(v => v === 'NA' ? 'NA' : v);
  const statusOptions = DELIVERY_STATUS_OPTIONS;
  const estProfit = (Number(form.return_amount) || 0) - (Number(form.order_amount) || 0) + (Number(form.cashback) || 0);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '660px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{editOrder ? 'Edit Order' : 'Add New Order'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <form id="order-form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group z-10">
                <label className="form-label">E-Comm Site</label>
                <SearchableDropdown
                  options={ECOMM_SITES}
                  value={form.ecomm_site}
                  onChange={v => set('ecomm_site', v)}
                  disabled={!!editOrder}
                  placeholder="Select Site"
                  error={errors.ecomm_site}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Model / Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.model_ordered ? 'error' : ''}`}
                  placeholder="e.g. iPhone 15"
                  disabled={!!editOrder}
                  value={form.model_ordered}
                  onChange={e => set('model_ordered', e.target.value)}
                />
                {errors.model_ordered && <div className="form-error">{errors.model_ordered}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group z-9">
                <label className="form-label">Variant</label>
                <SearchableDropdown
                  options={variantOptions}
                  value={form.variant}
                  onChange={v => set('variant', v)}
                  disabled={!!editOrder}
                  placeholder="Select Variant"
                />
              </div>

              <div className="form-group">
                <label className="form-label">ID Used / Account <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.id_used ? 'error' : ''}`}
                  placeholder="Email or Phone"
                  disabled={!!editOrder}
                  value={form.id_used}
                  onChange={e => set('id_used', e.target.value)}
                />
                {errors.id_used && <div className="form-error">{errors.id_used}</div>}
              </div>
            </div>

            <div className="form-group z-8">
              <label className="form-label">Card Used <span style={{ color: 'var(--danger)' }}>*</span></label>
              <SearchableDropdown
                options={cards?.map(c => cardLabel(c)) || []}
                value={form.card_id ? cardLabel(cards?.find(c => c._id === form.card_id)) : ''}
                onChange={val => {
                  const card = cards?.find(c => cardLabel(c) === val);
                  const newId = card ? card._id : '';
                  let cb = form.cashback;
                  if (card?.cashback_enabled) cb = Math.round((Number(form.order_amount) || 0) * (card.cashback_percent / 100));
                  else cb = 0;
                  setForm(f => ({ ...f, card_id: newId, cashback: cb }));
                  if (errors.card_id) setErrors(e => ({ ...e, card_id: '' }));
                }}
                disabled={!!editOrder}
                placeholder="Select a card"
                error={errors.card_id}
              />
            </div>

            <div className="form-group z-7">
              <label className="form-label">Seller <span style={{ color: 'var(--danger)' }}>*</span></label>
              <SearchableDropdown
                options={sellers?.map(s => sellerLabel(s)) || []}
                value={form.seller_id ? sellerLabel(sellers?.find(s => s._id === form.seller_id)) : ''}
                onChange={val => {
                  const seller = sellers?.find(s => sellerLabel(s) === val);
                  setForm(f => ({ ...f, seller_id: seller ? seller._id : '' }));
                  if (errors.seller_id) setErrors(e => ({ ...e, seller_id: '' }));
                }}
                disabled={!!editOrder}
                placeholder="Select a seller"
                error={errors.seller_id}
              />
            </div>

            <div className="form-row">
              <div className="form-group z-6">
                <label className="form-label">Order Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <SingleDatePicker
                  value={form.order_date}
                  onChange={v => set('order_date', v)}
                  placeholder="Select date"
                  maxDate={today}
                  disabled={!!editOrder}
                />
                {errors.order_date && <div className="form-error">{errors.order_date}</div>}
              </div>

              <div className="form-group z-5">
                <label className="form-label">
                  Delivered Date {form.delivery_status === 'Yes' && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <SingleDatePicker
                  value={form.delivered_date}
                  onChange={v => set('delivered_date', v)}
                  placeholder="Select date"
                  maxDate={today}
                />
                {errors.delivered_date && <div className="form-error">{errors.delivered_date}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={form.quantity}
                  onChange={e => recalcAmounts('quantity', e.target.value)}
                  onBlur={e => { if (Number(e.target.value) < 1) recalcAmounts('quantity', 1); }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Status</label>
                <SearchableDropdown
                  options={statusOptions.map(s => s.label)}
                  value={statusOptions.find(s => s.value === form.delivery_status)?.label || ''}
                  onChange={val => {
                    const found = statusOptions.find(s => s.label === val);
                    set('delivery_status', found ? found.value : 'No');
                  }}
                  placeholder="Select status"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit Order Amt (₹) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="number"
                  className={`form-input ${errors.unit_order_amount ? 'error' : ''}`}
                  min="0"
                  placeholder="0"
                  value={form.unit_order_amount}
                  onChange={e => recalcAmounts('unit_order_amount', e.target.value)}
                />
                {errors.unit_order_amount && <div className="form-error">{errors.unit_order_amount}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Unit Return Amt (₹) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="number"
                  className={`form-input ${errors.unit_return_amount ? 'error' : ''}`}
                  min="0"
                  placeholder="0"
                  value={form.unit_return_amount}
                  onChange={e => recalcAmounts('unit_return_amount', e.target.value)}
                />
                {errors.unit_return_amount && <div className="form-error">{errors.unit_return_amount}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cashback (₹) {!isCashbackEnabled && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.78rem' }}>(Card has no cashback)</span>}</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={form.cashback}
                onChange={e => set('cashback', Number(e.target.value))}
                disabled={!!editOrder || !isCashbackEnabled}
              />
            </div>

            {/* Summary */}
            <div className="order-summary-bar">
              <div className="order-summary-item">
                <span className="order-summary-label">Total Order</span>
                <strong style={{ color: 'var(--danger)' }}>₹{form.order_amount || 0}</strong>
              </div>
              <div className="order-summary-item">
                <span className="order-summary-label">Total Return</span>
                <strong style={{ color: 'var(--accent)' }}>₹{form.return_amount || 0}</strong>
              </div>
              <div className="order-summary-item">
                <span className="order-summary-label">Est. Profit</span>
                <strong style={{ color: estProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>₹{estProfit}</strong>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="order-form" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving…' : editOrder ? 'Save Changes' : 'Add Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
