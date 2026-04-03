import React from 'react';
import { MoreVertical, Trash2, Plus, CalendarClock, AlertCircle } from 'lucide-react';
import { NETWORK_COLORS } from '../constants';
import { fmtCurrency } from '../utils/formatters';

const BANK_GRADIENTS = [
  'linear-gradient(135deg,#1e2a5a,#1a1f3a)',
  'linear-gradient(135deg,#2d1b5e,#1a1228)',
  'linear-gradient(135deg,#0e3a3a,#0d2424)',
  'linear-gradient(135deg,#5e1a2d,#2d0f18)',
  'linear-gradient(135deg,#4a2e00,#2a1a00)',
  'linear-gradient(135deg,#0a3a1e,#072010)',
  'linear-gradient(135deg,#0e2e4a,#071824)',
  'linear-gradient(135deg,#1e2530,#12171e)',
];

const bankGradient = (name) => {
  let h = 0;
  for (const c of name) h = name.charCodeAt(0) + ((h << 5) - h);
  return BANK_GRADIENTS[Math.abs(h) % BANK_GRADIENTS.length];
};

const cashbackStatus = (spend, limit, percent) => {
  if (limit <= 0) return null;
  const earned   = spend * ((percent || 0) / 100);
  const remaining  = Math.max(limit - earned, 0);
  const remainPct  = (remaining / limit) * 100;
  const cls = remainPct === 0 ? 'danger' : remainPct < 25 ? 'warn' : 'safe';
  return { cls, pct: remainPct, remaining };
};

// Returns days until due this month (or next month if already passed)
const billingStatus = (dueDay) => {
  if (!dueDay) return null;
  const today = new Date();
  const todayDay = today.getDate();
  let daysLeft = dueDay - todayDay;
  if (daysLeft < 0) {
    // Already passed — calculate days until next month's due date
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    daysLeft = Math.ceil((nextMonth - today) / 86400000);
  }
  const urgency = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'warning' : 'ok';
  return { daysLeft, urgency };
};

const CardWidget = ({ card, profit = undefined, onAddTx, onViewDetails, onEdit, onDelete }) => {
  const spend = card.total_spend || 0;
  const net   = NETWORK_COLORS[card.card_network] || NETWORK_COLORS.Visa;
  const cb    = card.cashback_enabled ? cashbackStatus(spend, card.cashback_limit, card.cashback_percent) : null;
  const bill  = billingStatus(card.due_date);

  return (
    <div className="card-widget" style={{ background: bankGradient(card.bank_name) }}
         onClick={() => onViewDetails(card)}>
      <div className="card-top-row">
        <span className="card-bank">{card.bank_name}</span>
        <div className="card-actions">
          <button className="card-more-btn" data-tooltip="Add transaction"
            onClick={e => { e.stopPropagation(); onAddTx(card); }}>
            <Plus size={16} />
          </button>
          <button className="card-more-btn" data-tooltip="Edit card"
            onClick={e => { e.stopPropagation(); onEdit(card); }}>
            <MoreVertical size={16} />
          </button>
          <button className="card-more-btn card-delete-btn" data-tooltip="Delete card"
            onClick={e => { e.stopPropagation(); onDelete(card); }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="card-chip" />
      <div className="card-last-four-digit">•••• •••• •••• {card.last_four_digit}</div>
      <div className="card-name">{card.name_on_card}</div>

      <div className="card-spend-row">
        <div>
          <div className="card-spend-label">PERIOD SPEND</div>
          <div className="card-spend-amount">{fmtCurrency(spend)}</div>
        </div>
        {profit !== undefined && (
          <div style={{ textAlign: 'right' }}>
            <div className="card-spend-label">PROFIT EARNED</div>
            <div className="card-spend-amount" style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.2rem' }}>
              {profit > 0 ? '+' : ''}{fmtCurrency(profit)}
            </div>
          </div>
        )}
        {profit === undefined && (
          <div className="card-network-badge" style={{ background: net.bg, color: net.text }}>{net.label}</div>
        )}
      </div>

      {cb && (
        <div className="cashback-section">
          <div className="cashback-meta">
            <span className="cashback-label">
              {card.cashback_percent}% cashback cap: ₹{card.cashback_limit.toLocaleString('en-IN')}
            </span>
            <span className={`cashback-pct ${cb.cls}`}>
              {cb.cls === 'danger'
                ? '⚠ Limit reached'
                : `₹${cb.remaining.toLocaleString('en-IN')} eligible left`}
            </span>
          </div>
          <div className="progress-track">
            <div className={`progress-bar ${cb.cls}`} style={{ width: `${cb.pct}%` }} />
          </div>
          <div className="cashback-limit-note">Resets {{
            'monthly': 'monthly', 'quarterly': 'quarterly',
            'half-yearly': 'every 6 months', 'yearly': 'yearly'
          }[card.cashback_period] || 'monthly'}</div>
        </div>
      )}

      {/* Billing cycle reminder strip */}
      {bill && (
        <div className={`billing-reminder billing-${bill.urgency}`}>
          {bill.urgency === 'ok'
            ? <CalendarClock size={13} />
            : <AlertCircle size={13} />}
          <span>
            {bill.urgency === 'urgent'
              ? bill.daysLeft === 0 ? 'Due TODAY!' : `Due in ${bill.daysLeft}d — pay now!`
              : bill.urgency === 'warning'
              ? `Due in ${bill.daysLeft} days`
              : `Due on ${card.due_date}${[,'st','nd','rd'][card.due_date] || 'th'} of month`}
          </span>
          {card.billing_date && (
            <span className="billing-statement-chip">Stmt: {card.billing_date}{[,'st','nd','rd'][card.billing_date] || 'th'}</span>
          )}
        </div>
      )}
      {!bill && card.billing_date && (
        <div className="billing-reminder billing-ok">
          <CalendarClock size={13} />
          <span>Statement: {card.billing_date}{[,'st','nd','rd'][card.billing_date] || 'th'} of month</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(CardWidget);
