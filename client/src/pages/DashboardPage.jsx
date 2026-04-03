import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, ArrowUpDown } from 'lucide-react';
import useSummary from '../hooks/useSummary';
import { deleteCard, getOrders } from '../api';
import DateRangeDropdown from '../common/DateRangeDropdown';
import CardWidget from '../components/CardWidget';
import AddCardModal from '../components/AddCardModal';
import AddTransactionModal from '../components/AddTransactionModal';
import TransactionsTableView from '../components/TransactionsTableView';
import ConfirmModal from '../common/ConfirmModal';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fmtCurrency } from '../utils/formatters';

export default function DashboardPage() {
  const { initialLoad, dateFrom, dateTo, activePreset, setRange, resetRange, refresh, banks, allCards, grandTotal, cardsByBank } = useSummary();

  const [showAddCard, setShowAddCard] = useState(false);
  const [editCard,    setEditCard]    = useState(null);
  const [txCard,      setTxCard]      = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [orders, setOrders] = useState([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    getOrders()
      .then(data => setOrders(data))
      .catch(err => console.error('Failed to load orders', err));
  }, []);

  // Derive detailsView directly from the URL
  const detailsView = useMemo(() => {
    if (initialLoad) return null;
    const viewType = searchParams.get('view');
    if (viewType === 'bank') {
      const bName = searchParams.get('bankName');
      if (bName && cardsByBank[bName]) return { type: 'bank', bankName: bName };
    } else if (viewType === 'card') {
      const vId = searchParams.get('viewCardId');
      const c = allCards.find(card => card._id === vId);
      if (c) return { type: 'card', card: c };
    }
    return null;
  }, [searchParams, initialLoad, cardsByBank, allCards]);

  const [sortBy, setSortBy] = useState('spendDesc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expandedBanks, setExpandedBanks] = useState({});

  const sortOptions = [
    { value: 'spendDesc', label: 'Max Spend First' },
    { value: 'spendAsc',  label: 'Min Spend First' },
    { value: 'nameAsc',   label: 'Bank Name (A-Z)' },
    { value: 'nameDesc',  label: 'Bank Name (Z-A)' },
  ];

  const toggleBankExpanded = (bankName) => {
    setExpandedBanks(prev => ({ ...prev, [bankName]: !prev[bankName] }));
  };

  const sortedBanks = useMemo(() => {
    const entries = Object.entries(cardsByBank);
    return entries.sort((a, b) => {
      const bankA = a[0];
      const bankB = b[0];
      const spendA = banks.find(x => x.bank_name === bankA)?.total_spend || 0;
      const spendB = banks.find(x => x.bank_name === bankB)?.total_spend || 0;

      switch(sortBy) {
        case 'nameAsc': return bankA.localeCompare(bankB);
        case 'nameDesc': return bankB.localeCompare(bankA);
        case 'spendDesc': return spendB - spendA;
        case 'spendAsc': return spendA - spendB;
        default: return 0;
      }
    });
  }, [cardsByBank, banks, sortBy]);

  // Pre-compute card profits in O(orders) instead of O(cards × orders) per render
  const profitByCardId = useMemo(() => {
    const map = {};
    for (const o of orders) {
      const cid = o.card_id?._id;
      if (!cid) continue;
      if (!map[cid]) map[cid] = { profit: 0, hasOrders: false };
      map[cid].hasOrders = true;
      if (o.delivery_status !== 'Cancelled') {
        map[cid].profit += (o.return_amount - o.order_amount + o.cashback);
      }
    }
    return map;
  }, [orders]);

  const showConfirm = (message, onConfirm) => setConfirm({ message, onConfirm });
  const closeConfirm = () => setConfirm(null);

  const handleBack = () => {
    resetRange();
    navigate({ search: '' });
  };

  const openBankView = (bankName) => {
    resetRange();
    setSearchParams({ view: 'bank', bankName });
  };

  const openCardView = (cardId) => {
    resetRange();
    setSearchParams({ view: 'card', viewCardId: cardId });
  };

  const handleDeleteCard = (card) => {
    showConfirm(
      `Delete ${card.bank_name} ${card.card_network} ••••${card.last_four_digit}? All transactions on this card will be permanently deleted.`,
      async () => {
        closeConfirm();
        try { await deleteCard(card._id); refresh(); toast.success('Card deleted'); }
        catch (err) { console.error('Delete card failed', err); toast.error('Failed to delete card'); }
      }
    );
  };

  return (
    <>
      {/* Hero */}
      <div className="hero-bar">
        <div className="hero-inner">
          {detailsView ? (() => {
            if (detailsView.type === 'bank') {
              const bank = banks.find(b => b.bank_name === detailsView.bankName);
              return (
                <>
                  <div className="hero-label">{detailsView.bankName} — Total Spend</div>
                  <div className="hero-amount">{initialLoad ? '—' : fmtCurrency(bank?.total_spend)}</div>
                </>
              );
            } else {
              const card = allCards.find(c => c._id === detailsView.card?._id);
              return (
                <>
                  <div className="hero-label">
                    {detailsView.card?.card_network} ••••{detailsView.card?.last_four_digit} — Total Spend
                  </div>
                  <div className="hero-amount">{initialLoad ? '—' : fmtCurrency(card?.total_spend)}</div>
                </>
              );
            }
          })() : (
            <>
              <div className="hero-label">Total Spend — All Cards</div>
              <div className="hero-amount">{initialLoad ? '—' : fmtCurrency(grandTotal)}</div>
            </>
          )}
          <DateRangeDropdown dateFrom={dateFrom} dateTo={dateTo} activePreset={activePreset} onChange={setRange} />
        </div>
      </div>

      {/* Dashboard */}
      <main className="main-content">
        {detailsView ? (
          <TransactionsTableView 
            view={detailsView} 
            dateFrom={dateFrom} 
            dateTo={dateTo} 
            onBack={handleBack} 
            onRefreshSummary={refresh}
            cardsForBank={detailsView.type === 'bank' ? cardsByBank[detailsView.bankName] : []}
          />
        ) : (
          <>
            {initialLoad && (
              <div className="bank-section" style={{ marginTop: '20px' }}>
                <div className="bank-section-header">
                  <div className="shimmer shimmer-text" style={{ width: '180px', height: '24px' }}></div>
                  <div className="shimmer shimmer-text" style={{ width: '100px', height: '18px' }}></div>
                </div>
                <div className="cards-grid">
                  {[1, 2, 3].map(i => <div key={i} className="shimmer shimmer-card"></div>)}
                </div>
              </div>
            )}

            {!initialLoad && allCards.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <div className="empty-title">No cards yet</div>
                <div className="empty-sub">Add your first credit card to start tracking spends.</div>
                <button className="btn btn-primary" onClick={() => setShowAddCard(true)}><Plus size={16} /> Add Card</button>
              </div>
            )}

            {!initialLoad && allCards.length > 0 && (
              <div className="d-flex dashboard-sort-bar" style={{ justifyContent: 'flex-end', marginTop: '24px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSortMenuOpen(!sortMenuOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowUpDown size={14} />
                    {sortOptions.find(o => o.value === sortBy)?.label}
                  </button>

                  {sortMenuOpen && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                        onClick={() => setSortMenuOpen(false)}
                      />
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        zIndex: 10, minWidth: '180px',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                      }}>
                        {sortOptions.map(opt => (
                          <button
                            key={opt.value}
                            className="dropdown-item"
                            onClick={() => { setSortBy(opt.value); setSortMenuOpen(false); }}
                            style={{
                              color: sortBy === opt.value ? 'var(--accent)' : 'var(--text)',
                              fontWeight: sortBy === opt.value ? 600 : 400,
                              background: sortBy === opt.value ? 'rgba(31,111,235,0.08)' : 'transparent',
                            }}
                          >
                            <span style={{ width: '18px', textAlign: 'center', fontSize: '0.85em' }}>
                              {sortBy === opt.value ? '✓' : ''}
                            </span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {!initialLoad && sortedBanks.map(([bankName, cards]) => {
              const bankObj = banks.find(b => b.bank_name === bankName);
              return (
              <div className="bank-section" key={bankName}>
                <div className="bank-section-header">
                  <div className="bank-name-badge clickable" onClick={() => openBankView(bankName)}>
                    <div className="bank-dot" />
                    <span className="bank-name">{bankName}</span>
                    <span className="bank-total">({cards.length} card{cards.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div>
                    <span className="bank-total-label">Bank total:</span>
                    <span className="bank-spend">{fmtCurrency(bankObj?.total_spend || 0)}</span>
                  </div>
                </div>
                <div className="cards-grid">
                  {(expandedBanks[bankName] ? cards : cards.slice(0, 4)).map(card => {
                    const pData = profitByCardId[card._id];
                    return (
                      <CardWidget key={card._id} card={card}
                        profit={pData?.hasOrders ? pData.profit : undefined}
                        onAddTx={setTxCard}
                        onViewDetails={() => openCardView(card._id)}
                        onEdit={c => { setEditCard(c); setShowAddCard(true); }}
                        onDelete={handleDeleteCard} />
                    );
                  })}
                </div>
                {cards.length > 4 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleBankExpanded(bankName)}
                    >
                      {!expandedBanks[bankName] ? (
                        <><Plus size={14} /> See {cards.length - 4} more cards</>
                      ) : (
                        "See Less"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )})}
          </>
        )}
      </main>

      <button className="fab" onClick={() => setShowAddCard(true)}><Plus size={24} /></button>

      {showAddCard && <AddCardModal editCard={editCard} onClose={() => { setShowAddCard(false); setEditCard(null); }} onSave={() => { setShowAddCard(false); setEditCard(null); refresh(); toast.success('Card saved!'); }} />}
      {txCard && <AddTransactionModal card={txCard._id ? txCard : null} cards={allCards} onClose={() => setTxCard(null)} onSave={refresh} />}
      {confirm && (
        <ConfirmModal
          title="Delete Card?"
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </>
  );
}
