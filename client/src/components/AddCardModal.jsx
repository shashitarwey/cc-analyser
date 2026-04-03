import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createCard, updateCard } from '../api';
import { BANK_NAMES, CARD_NETWORKS, CASHBACK_PERIODS } from '../constants';
import SearchableDropdown from '../common/SearchableDropdown';

const EMPTY = {
  bank_name: '', card_network: 'Visa', last_four_digit: '', name_on_card: '',
  cashback_enabled: false, cashback_percent: 0, cashback_limit: 0, cashback_period: 'monthly',
  billing_date: '', due_date: '',
};

export default function AddCardModal({ editCard, onClose, onSave }) {
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editCard ? {
      bank_name:        editCard.bank_name,
      card_network:     editCard.card_network || 'Visa',
      last_four_digit:  editCard.last_four_digit,
      name_on_card:     editCard.name_on_card,
      cashback_enabled: !!editCard.cashback_enabled,
      cashback_percent: editCard.cashback_percent || 5,
      cashback_limit:   editCard.cashback_limit   || 5000,
      cashback_period:  editCard.cashback_period  || 'monthly',
      billing_date:     editCard.billing_date     || '',
      due_date:         editCard.due_date          || '',
    } : EMPTY);
  }, [editCard]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.bank_name) newErrors.bank_name = 'Bank Name is required';
    if (!form.card_network) newErrors.card_network = 'Card Network is required';
    if (!form.last_four_digit) {
      newErrors.last_four_digit = 'Last 4 digits are required';
    } else if (!/^\d{4}$/.test(form.last_four_digit)) {
      newErrors.last_four_digit = 'Must be exactly 4 digits';
    }
    if (!form.name_on_card) newErrors.name_on_card = 'Name on Card is required';

    if (form.cashback_enabled) {
      if (form.cashback_percent === undefined || form.cashback_percent === null || isNaN(form.cashback_percent)) {
        newErrors.cashback_percent = 'Required';
      }
      if (form.cashback_limit === undefined || form.cashback_limit === null || isNaN(form.cashback_limit)) {
        newErrors.cashback_limit = 'Required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      editCard ? await updateCard(editCard._id, form) : await createCard(form);
      onSave();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving card');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{editCard ? 'Edit Card' : 'Add New Card'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <form id="card-form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group z-10">
                <label className="form-label">Bank Name</label>
                <SearchableDropdown
                  options={BANK_NAMES}
                  value={form.bank_name}
                  onChange={val => set('bank_name', val)}
                  placeholder="e.g. HDFC Bank"
                  error={errors.bank_name}
                  disabled={!!editCard}
                />
              </div>
              <div className="form-group z-9">
                <label className="form-label">Card Network</label>
                <SearchableDropdown
                  options={CARD_NETWORKS}
                  value={form.card_network}
                  onChange={val => set('card_network', val)}
                  error={errors.card_network}
                  disabled={!!editCard}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Last 4 Digits</label>
                <input className={`form-input ${errors.last_four_digit ? 'error' : ''}`} placeholder="1234" maxLength={4}
                  value={form.last_four_digit} onChange={e => set('last_four_digit', e.target.value.replace(/\D/g, ''))} disabled={!!editCard} />
                {errors.last_four_digit && <div className="form-error">{errors.last_four_digit}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Name on Card</label>
                <input className={`form-input ${errors.name_on_card ? 'error' : ''}`} placeholder="YOUR NAME"
                  value={form.name_on_card} onChange={e => set('name_on_card', e.target.value.toUpperCase())} />
                {errors.name_on_card && <div className="form-error">{errors.name_on_card}</div>}
              </div>
            </div>

            <div className="form-group">
              <div className="toggle-row">
                <span className="toggle-label">Cashback Eligible</span>
                <label className="toggle">
                  <input type="checkbox" checked={form.cashback_enabled}
                         onChange={e => set('cashback_enabled', e.target.checked)} />
                  <span className="toggle-track" /><span className="toggle-thumb" />
                </label>
              </div>
            </div>

            {form.cashback_enabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cashback %</label>
                    <input className={`form-input ${errors.cashback_percent ? 'error' : ''}`} type="number" min="0" max="100" step="0.5"
                      value={form.cashback_percent} onChange={e => set('cashback_percent', parseFloat(e.target.value))} />
                    {errors.cashback_percent && <div className="form-error">{errors.cashback_percent}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cashback Limit (₹)</label>
                    <input className={`form-input ${errors.cashback_limit ? 'error' : ''}`} type="number" min="0" step="100"
                      value={form.cashback_limit} onChange={e => set('cashback_limit', parseFloat(e.target.value))} />
                    {errors.cashback_limit && <div className="form-error">{errors.cashback_limit}</div>}
                  </div>
                </div>
                <div className="form-group z-8">
                  <label className="form-label">Cashback Period</label>
                  <SearchableDropdown
                    options={CASHBACK_PERIODS.map(p => p.label)}
                    value={CASHBACK_PERIODS.find(p => p.value === form.cashback_period)?.label || ''}
                    onChange={label => {
                      const found = CASHBACK_PERIODS.find(p => p.label === label);
                      if (found) set('cashback_period', found.value);
                    }}
                    required
                  />
                </div>
              </>
            )}

            {/* Billing Cycle */}
            <div className="form-section-title">Billing Cycle <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-muted)' }}>(optional)</span></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Statement Date</label>
                <input
                  className="form-input"
                  type="number" min="1" max="31" placeholder="e.g. 15"
                  value={form.billing_date}
                  onChange={e => set('billing_date', e.target.value ? parseInt(e.target.value) : '')}
                />
                <div className="form-hint">Day of month statement is generated</div>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Due Date</label>
                <input
                  className="form-input"
                  type="number" min="1" max="31" placeholder="e.g. 5"
                  value={form.due_date}
                  onChange={e => set('due_date', e.target.value ? parseInt(e.target.value) : '')}
                />
                <div className="form-hint">Day of month payment is due</div>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="card-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editCard ? 'Save Changes' : 'Add Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
