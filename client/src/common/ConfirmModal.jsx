import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmModal — reusable danger confirmation dialog.
 * Props:
 *   title        string  — heading, e.g. "Delete Card?"
 *   message      string  — body detail shown below the heading
 *   onConfirm    fn      — called on confirm button
 *   onCancel     fn      — called on cancel / overlay click
 *   confirmLabel string  — button label, defaults to "Delete"
 */
export default function ConfirmModal({
  title = 'Are you sure?',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
}) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-modal">
        <div className="confirm-icon">
          <AlertTriangle size={32} />
        </div>
        <h2 className="confirm-title">{title}</h2>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

