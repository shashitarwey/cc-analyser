import { useState, useEffect } from 'react';
import { addCustomer, updateCustomer } from '../api';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddCustomerModal({ onClose, onSuccess, editCustomer }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  useEffect(() => {
    if (editCustomer) {
      setForm({
        name: editCustomer.name || '',
        phone: editCustomer.phone || '',
      });
    }
  }, [editCustomer]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Customer name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (editCustomer) {
        await updateCustomer(editCustomer._id, form);
        toast.success('Customer updated');
      } else {
        await addCustomer(form);
        toast.success('Customer added');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{editCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <form id="customer-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="e.g. Ravi Kumar"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/[^0-9+\-\s]/g, ''))}
              />
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving…' : editCustomer ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
