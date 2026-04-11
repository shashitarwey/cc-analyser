import { useState } from 'react';
import { addCustomerEntry, updateCustomerEntry } from '../api';
import { X, Save, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import SingleDatePicker from '../common/SingleDatePicker';
import { getToday } from '../constants';

export default function AddKhataEntryModal({ onClose, onSuccess, customer, editEntry, defaultType = 'gave' }) {
  const isEdit = !!editEntry;

  const [form, setForm] = useState({
    type: isEdit ? editEntry.type : defaultType,
    amount: isEdit ? String(editEntry.amount) : '',
    entry_date: isEdit ? editEntry.entry_date?.slice(0, 10) : getToday(),
    notes: isEdit ? (editEntry.notes || '') : '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    if (!form.entry_date) e.entry_date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        entry_date: form.entry_date,
        notes: form.notes,
      };
      if (isEdit) {
        await updateCustomerEntry(editEntry._id, payload);
        toast.success('Entry updated');
      } else {
        payload.customer_id = customer._id;
        await addCustomerEntry(payload);
        toast.success(form.type === 'gave' ? 'You Gave recorded' : 'You Got recorded');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const isGave = form.type === 'gave';

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Edit Entry' : isGave ? 'You Gave' : 'You Got'} — {customer?.name || editEntry?.customer_id}
          </h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <form id="khata-entry-form" onSubmit={handleSubmit} noValidate>
            {/* Type toggle */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="khata-type-toggle">
                <button
                  type="button"
                  className={`khata-type-btn khata-type-gave ${isGave ? 'is-active' : ''}`}
                  onClick={() => set('type', 'gave')}
                >
                  <ArrowUpRight size={15} /> You Gave
                </button>
                <button
                  type="button"
                  className={`khata-type-btn khata-type-got ${!isGave ? 'is-active' : ''}`}
                  onClick={() => set('type', 'got')}
                >
                  <ArrowDownLeft size={15} /> You Got
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="number"
                className={`form-input ${errors.amount ? 'error' : ''}`}
                placeholder="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                min="0"
                step="1"
              />
              {errors.amount && <div className="form-error">{errors.amount}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Date <span style={{ color: 'var(--danger)' }}>*</span></label>
              <SingleDatePicker
                value={form.entry_date}
                onChange={v => set('entry_date', v)}
              />
              {errors.entry_date && <div className="form-error">{errors.entry_date}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Remark</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Remark"
                value={form.notes}
                maxLength={200}
                onChange={e => set('notes', e.target.value)}
              />
              <div className="form-hint" style={{ textAlign: 'right' }}>
                {form.notes.length}/200
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="khata-entry-form" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
