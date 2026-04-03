import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, CreditCard, ShoppingBag, Users, ArrowRight, MapPin } from 'lucide-react';
import { getCards, getSellers, getOrders } from '../api';
import { useNavigate } from 'react-router-dom';
import { fmtCurrency } from '../utils/formatters';

export default function GlobalSearch({ onClose, inline = false, externalQuery = '', onQueryChange }) {
  const [query, setQuery]     = useState(externalQuery);
  const [cards, setCards]     = useState([]);
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(0); // keyboard nav index
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Sync external query (from parent input) into internal state
  useEffect(() => {
    if (inline) setQuery(externalQuery);
  }, [externalQuery, inline]);

  // Load all searchable data once on open
  useEffect(() => {
    const load = async () => {
      try {
        const [c, s, o] = await Promise.all([getCards(), getSellers(), getOrders()]);
        setCards(c);
        setSellers(s);
        setOrders(o);
      } finally {
        setLoading(false);
        if (!inline) setTimeout(() => inputRef.current?.focus(), 30);
      }
    };
    load();
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  const matchedCards = q
    ? cards.filter(c =>
        c.bank_name.toLowerCase().includes(q) ||
        c.card_network.toLowerCase().includes(q) ||
        c.last_four_digit.includes(q) ||
        c.name_on_card.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedSellers = q
    ? sellers.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedOrders = q
    ? orders.filter(o =>
        o.model_ordered.toLowerCase().includes(q) ||
        o.ecomm_site?.toLowerCase().includes(q) ||
        o.id_used?.toLowerCase().includes(q) ||
        o.seller_id?.name?.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const allResults = [
    ...matchedCards.map(r   => ({ type: 'card',   data: r })),
    ...matchedSellers.map(r => ({ type: 'seller', data: r })),
    ...matchedOrders.map(r  => ({ type: 'order',  data: r })),
  ];
  const hasResults = allResults.length > 0;

  const navigate_to = useCallback((result) => {
    if (result.type === 'card') {
      navigate(`/?view=card&viewCardId=${result.data._id}`);
    } else if (result.type === 'seller') {
      navigate(`/sellers/${result.data._id}/ledger`);
    } else {
      // Navigate to Orders pre-filtered to the seller
      navigate('/orders', {
        state: {
          seller_id:   result.data.seller_id?._id,
          seller_name: result.data.seller_id?.name,
        }
      });
    }
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation among results
  const handleKeyDown = (e) => {
    if (!hasResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(f => Math.min(f + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(f => Math.max(f - 1, 0));
    } else if (e.key === 'Enter' && allResults[focused]) {
      navigate_to(allResults[focused]);
    }
  };

  // Reset keyboard focus index when query changes
  useEffect(() => setFocused(0), [query]);

  let resultIndex = 0;

  const renderGroup = (label, icon, items, type) => {
    if (!items.length) return null;
    return (
      <div className="gs-group">
        <div className="gs-group-label">{icon}{label}</div>
        {items.map((item) => {
          const idx = resultIndex++;
          const isFocused = idx === focused;
          return (
            <button
              key={item._id}
              className={`gs-result${isFocused ? ' gs-result-focused' : ''}`}
              onClick={() => navigate_to({ type, data: item })}
              onMouseEnter={() => setFocused(idx)}
            >
              {type === 'card' && (
                <>
                  <span className="gs-result-main">{item.bank_name} ••••{item.last_four_digit}</span>
                  <span className="gs-result-sub">{item.card_network} · {item.name_on_card}</span>
                </>
              )}
              {type === 'seller' && (
                <>
                  <span className="gs-result-main">{item.name}</span>
                  <span className="gs-result-sub"><MapPin size={11} style={{ display:'inline', verticalAlign:'middle' }} /> {item.city}</span>
                </>
              )}
              {type === 'order' && (
                <>
                  <span className="gs-result-main">{item.model_ordered}</span>
                  <span className="gs-result-sub">{item.ecomm_site} · {fmtCurrency(item.order_amount)} · {item.seller_id?.name || ''}</span>
                </>
              )}
              <ArrowRight size={14} className="gs-result-arrow" />
            </button>
          );
        })}
      </div>
    );
  };

  // ── Inline mode (mobile header dropdown) ──────────────────────
  if (inline) {
    if (!q) return null; // no results panel when query is empty
    return (
      <div className="gs-inline-panel">
        {loading && <div className="gs-status">Loading…</div>}
        {!loading && !hasResults && (
          <div className="gs-status">No results for <strong>"{query}"</strong></div>
        )}
        {!loading && hasResults && (
          <div className="gs-body">
            {renderGroup('Cards',   <CreditCard size={12} />,  matchedCards,   'card')}
            {renderGroup('Sellers', <Users size={12} />,       matchedSellers, 'seller')}
            {renderGroup('Orders',  <ShoppingBag size={12} />, matchedOrders,  'order')}
          </div>
        )}
      </div>
    );
  }

  // ── Modal mode (desktop) ──────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div className="gs-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="gs-modal" role="dialog" aria-label="Global Search">
        {/* Input */}
        <div className="gs-input-wrap">
          <Search size={18} className="gs-input-icon" />
          <input
            ref={inputRef}
            className="gs-input"
            placeholder="Search cards, sellers, orders…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query
            ? <button className="gs-clear-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={15} /></button>
            : <span className="gs-esc-hint">esc</span>
          }
        </div>

        {/* Body */}
        {loading && (
          <div className="gs-status">Loading…</div>
        )}

        {!loading && q && !hasResults && (
          <div className="gs-status">No results for <strong>"{query}"</strong></div>
        )}

        {!loading && hasResults && (
          <div className="gs-body">
            {renderGroup('Cards',   <CreditCard size={12} />,  matchedCards,   'card')}
            {renderGroup('Sellers', <Users size={12} />,       matchedSellers, 'seller')}
            {renderGroup('Orders',  <ShoppingBag size={12} />, matchedOrders,  'order')}
          </div>
        )}

        {!loading && !q && (
          <div className="gs-hint-bar">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
        )}
      </div>
    </>
  );
}

