import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { X, FileDown, CalendarRange } from 'lucide-react';
import SingleDatePicker from '../common/SingleDatePicker';
import { fmtDate } from '../utils/formatters';
import { getToday } from '../constants';

const ALL_TIME = 'All Time';

// Financial-year bounds for India (Apr 1 → Mar 31), `offset` in years.
const fyBounds = (offset = 0) => {
  const now = new Date();
  const yr = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + offset;
  return {
    label: `FY ${yr}-${String(yr + 1).slice(2)}`,
    from: `${yr}-04-01`,
    to: `${yr + 1}-03-31`,
  };
};

const buildPresets = () => {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const fy0 = fyBounds(0);
  const fy1 = fyBounds(-1);
  return [
    { label: ALL_TIME, from: '', to: '' },
    { label: 'This Month', from: fmtDate(startOfMonth(now)), to: fmtDate(now) },
    { label: 'Last Month', from: fmtDate(startOfMonth(lastMonth)), to: fmtDate(endOfMonth(lastMonth)) },
    { label: 'Last 3 Months', from: fmtDate(startOfMonth(subMonths(now, 2))), to: fmtDate(now) },
    { label: fy0.label, from: fy0.from, to: fmtDate(now) },
    { label: fy1.label, from: fy1.from, to: fy1.to },
  ];
};

/**
 * ReportRangeModal — pick a date window before generating a ledger/khata PDF.
 * Entries before the window are not dropped; the report rolls them into an
 * opening (previous) balance so the running balance stays continuous.
 *
 * Props:
 *   title      string  — heading, e.g. "Download Ledger Report"
 *   subtitle   string  — optional line under the heading
 *   loading    bool    — disables the generate button while the PDF builds
 *   onClose    fn
 *   onGenerate fn({ from, to })  — empty strings mean "all time"
 */
export default function ReportRangeModal({ title = 'Download Report', subtitle, loading, onClose, onGenerate }) {
  const today = getToday();
  const presets = buildPresets();

  const [preset, setPreset] = useState(ALL_TIME);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const applyPreset = (p) => {
    setPreset(p.label);
    setFrom(p.from);
    setTo(p.to);
    setError('');
  };

  // Any manual date edit means the selection no longer matches a preset.
  const setCustom = (key, value) => {
    setPreset('Custom Range');
    setError('');
    if (key === 'from') setFrom(value); else setTo(value);
  };

  const isAllTime = preset === ALL_TIME;

  const handleGenerate = () => {
    if (isAllTime) return onGenerate({ from: '', to: '' });
    if (!from || !to) {
      setError('Select both a start and an end date.');
      return;
    }
    if (parseISO(from) > parseISO(to)) {
      setError('Start date must be on or before the end date.');
      return;
    }
    onGenerate({ from, to });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {subtitle && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: '20px' }}>
              {subtitle}
            </p>
          )}

          <div className="form-group">
            <label className="form-label">Period</label>
            <div className="report-preset-row">
              {presets.map(p => (
                <button
                  key={p.label}
                  type="button"
                  className={`report-preset-pill ${preset === p.label ? 'active' : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className={`report-preset-pill ${preset === 'Custom Range' ? 'active' : ''}`}
                onClick={() => { setPreset('Custom Range'); setError(''); }}
              >
                Custom Range
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From</label>
              <SingleDatePicker
                value={from}
                onChange={v => setCustom('from', v)}
                placeholder="Start date"
                maxDate={today}
                disabled={isAllTime}
              />
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <SingleDatePicker
                value={to}
                onChange={v => setCustom('to', v)}
                placeholder="End date"
                maxDate={today}
                disabled={isAllTime}
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="report-range-note">
            <CalendarRange size={14} />
            <span>
              {isAllTime
                ? 'The full history will be included, starting from a zero balance.'
                : 'Only entries in this period are listed. Everything before it is carried forward as the opening balance.'}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            <FileDown size={16} /> {loading ? 'Preparing…' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
