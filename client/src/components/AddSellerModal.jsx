import { useState, useEffect } from 'react';
import { addSeller, updateSeller } from '../api';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddSellerModal({ onClose, onSuccess, editSeller }) {
  const [form, setForm] = useState({ name: '', city: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  useEffect(() => {
    if (editSeller) setForm({ name: editSeller.name || '', city: editSeller.city || '', phone: editSeller.phone || '' });
  }, [editSeller]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Seller name is required';
    if (!form.city.trim()) e.city = 'City is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (editSeller) {
        await updateSeller(editSeller._id, form);
        toast.success('Seller updated');
      } else {
        await addSeller(form);
        toast.success('Seller added');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save seller');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{editSeller ? 'Edit Seller' : 'Add New Seller'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <form id="seller-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Seller Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="e.g. Rahul Mobile Shop"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">City <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                className={`form-input ${errors.city ? 'error' : ''}`}
                placeholder="e.g. Mumbai"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
              {errors.city && <div className="form-error">{errors.city}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/[^0-9+\-\s]/g, ''))}
              />
              <div className="form-hint">Optional — for quick contact</div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="seller-form" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving…' : editSeller ? 'Save Changes' : 'Add Seller'}
          </button>
        </div>
      </div>
    </div>
  );
}
