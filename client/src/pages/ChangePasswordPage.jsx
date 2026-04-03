import { useState, useMemo } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { changePassword } from '../api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PW_RULES = [
  { label: 'At least 8 characters',       test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',   test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',   test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)',             test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function parseError(err) {
  if (!err.response) return 'Cannot connect to server.';
  return err.response?.data?.error || `Error ${err.response.status}`;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [touched, setTouched] = useState(false);

  const ruleResults = useMemo(() => PW_RULES.map(r => ({ ...r, ok: r.test(newPw) })), [newPw]);
  const passwordValid = ruleResults.every(r => r.ok);
  const passwordsMatch = newPw === confirmPw;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oldPw) { toast.error('Enter your current password'); return; }
    if (!passwordValid) { toast.error('New password does not meet the requirements'); return; }
    if (!passwordsMatch) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword({ old_password: oldPw, new_password: newPw });
      toast.success('Password changed successfully!');
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setTouched(false);
      navigate('/profile');
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-left">
            <button className="btn-back-circle" onClick={() => navigate('/profile')} data-tooltip="Back to Profile">
              <ChevronLeft size={22} />
            </button>
            <div className="page-hero-title-group">
              <h1 className="page-hero-title">Change Password</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
      <div className="profile-grid profile-grid--single">
        <div className="profile-card">
          <div className="profile-card-header">
            <Lock size={20} />
            <h2>Update Your Password</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Old Password</label>
              <div className="input-password-wrap">
                <input
                  className="form-input"
                  type={showOldPw ? 'text' : 'password'}
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  placeholder="Enter current password"
                  required
                  autoComplete="current-password"
                />
                {oldPw && (
                  <button type="button" className="btn-pw-toggle" onClick={() => setShowOldPw(v => !v)} tabIndex={-1}>
                    {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-password-wrap">
                <input
                  className="form-input"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setTouched(true); }}
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                />
                {newPw && (
                  <button type="button" className="btn-pw-toggle" onClick={() => setShowNewPw(v => !v)} tabIndex={-1}>
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              {touched && (
                <div className="pw-rules">
                  {ruleResults.map(r => (
                    <div key={r.label} className={`pw-rule ${r.ok ? 'ok' : 'fail'}`}>
                      {r.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-password-wrap">
                <input
                  className="form-input"
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  autoComplete="new-password"
                />
                {confirmPw && (
                  <button type="button" className="btn-pw-toggle" onClick={() => setShowConfirmPw(v => !v)} tabIndex={-1}>
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              {confirmPw && !passwordsMatch && (
                <p className="pw-mismatch">Passwords do not match</p>
              )}
              {confirmPw && passwordsMatch && newPw && (
                <p className="pw-match">Passwords match ✓</p>
              )}
            </div>

            <div className="form-footer">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !oldPw || !passwordValid || !passwordsMatch}
              >
                {loading ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
