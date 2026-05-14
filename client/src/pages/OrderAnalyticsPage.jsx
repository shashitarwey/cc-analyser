import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, TrendingUp, Users, ShoppingBag, IndianRupee, BarChart3, Percent, CalendarDays } from 'lucide-react';
import { getProfitAnalytics } from '../api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import DateRangeDropdown from '../common/DateRangeDropdown';
import { pickTruthy } from '../utils/formatters';

const COLORS = ['#58a6ff', '#bc8cff', '#3fb950', '#f85149', '#e3b341', '#f778ba', '#79c0ff', '#d2a8ff', '#7ee787', '#ffa657'];

function fmtCurrency(val) {
  if (val == null) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <p className="analytics-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function OrderAnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('');

  const fetchAnalytics = useCallback(async (from, to) => {
    try {
      const params = pickTruthy({ from_date: from, to_date: to });
      const res = await getProfitAnalytics(params);
      setData(res);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics('', '');
  }, [fetchAnalytics]);

  const handleDateChange = (from, to, preset) => {
    setDateFrom(from || '');
    setDateTo(to || '');
    setDatePreset(preset || '');
    setLoading(true);
    fetchAnalytics(from || '', to || '');
  };

  if (loading && !data) {
    return (
      <>
        <div className="page-hero">
          <div className="page-hero-inner">
            <div className="page-hero-left">
              <button className="btn-back-circle" onClick={() => navigate(-1)} data-tooltip="Back">
                <ChevronLeft size={22} />
              </button>
              <div className="page-hero-title-group">
                <h1 className="page-hero-title">Order Profit Analytics</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="page-content">
          <div className="analytics-loading">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="shimmer shimmer-card" style={{ height: 120 }} />
            ))}
          </div>
        </div>
      </>
    );
  }

  const noData = !data || !data.totals || data.totals.order_count === 0;
  const { monthly = [], bySeller = [], byEcommSite = [], totals = {}, fy = {} } = data || {};

  // Donut pie data — sort desc and cap at 6 + "Others" so labels/legend stay tidy.
  const sortedEcomm = [...byEcommSite].sort((a, b) => b.order_amount - a.order_amount);
  const TOP_N = 6;
  const topEcomm = sortedEcomm.slice(0, TOP_N);
  const restEcomm = sortedEcomm.slice(TOP_N);
  const pieData = [
    ...topEcomm.map((s, i) => ({ name: s.ecomm_site, value: s.order_amount, fill: COLORS[i % COLORS.length] })),
    ...(restEcomm.length ? [{
      name: `Others (${restEcomm.length})`,
      value: restEcomm.reduce((sum, s) => sum + s.order_amount, 0),
      fill: 'var(--text-muted)',
    }] : []),
  ];

  // Dynamic YAxis width for buyer chart — long names were being clipped at 100px.
  const longestSellerName = bySeller.reduce((max, s) => Math.max(max, (s.seller_name || '').length), 0);
  const sellerYAxisWidth = Math.min(180, Math.max(80, longestSellerName * 7));

  // Profit-by-platform bar uses the same byEcommSite data, sorted by profit desc.
  const profitByPlatform = [...byEcommSite].sort((a, b) => b.profit - a.profit);
  const longestPlatformName = profitByPlatform.reduce((max, p) => Math.max(max, (p.ecomm_site || '').length), 0);
  const platformYAxisWidth = Math.min(160, Math.max(70, longestPlatformName * 7));

  return (
    <>
      {/* Page Hero Header */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-left">
            <button className="btn-back-circle" onClick={() => navigate(-1)} data-tooltip="Back">
              <ChevronLeft size={22} />
            </button>
            <div className="page-hero-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 className="page-hero-title">Order Profit Analytics</h1>
                {!noData && (
                  <span className={`profit-badge ${totals.profit >= 0 ? 'profit-badge-positive' : 'profit-badge-negative'}`}>
                    Net: {fmtCurrency(totals.profit)}
                  </span>
                )}
              </div>
              {!noData && (
                <span className="page-hero-subtitle">{totals.order_count} delivered order{totals.order_count !== 1 ? 's' : ''} analysed</span>
              )}
            </div>
          </div>
          <div className="page-hero-actions">
            <DateRangeDropdown
              dateFrom={dateFrom}
              dateTo={dateTo}
              activePreset={datePreset}
              onChange={handleDateChange}
            />
          </div>
        </div>
      </div>

      <div className="page-content">
        {noData ? (
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-orders">
              <BarChart3 size={32} />
            </div>
            <div className="empty-title">No analytics data yet</div>
            <div className="empty-sub">
              {dateFrom || dateTo
                ? 'No delivered orders in the selected range. Try a different date range.'
                : 'Analytics will appear once you have orders marked as delivered.'}
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: 'rgba(88,166,255,0.12)', color: '#58a6ff' }}>
                    <ShoppingBag size={16} />
                  </div>
                  <span className="stat-card-label">Total Orders</span>
                </div>
                <div className="stat-card-value">{totals.order_count}</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149' }}>
                    <IndianRupee size={16} />
                  </div>
                  <span className="stat-card-label">Order Amount</span>
                </div>
                <div className="stat-card-value">{fmtCurrency(totals.order_amount)}</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: 'rgba(63,185,80,0.12)', color: '#3fb950' }}>
                    <IndianRupee size={16} />
                  </div>
                  <span className="stat-card-label">Return Amount</span>
                </div>
                <div className="stat-card-value">{fmtCurrency(totals.return_amount)}</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: totals.profit >= 0 ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)', color: totals.profit >= 0 ? '#3fb950' : '#f85149' }}>
                    <TrendingUp size={16} />
                  </div>
                  <span className="stat-card-label">Net Profit</span>
                </div>
                <div className="stat-card-value" style={{ color: totals.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {fmtCurrency(totals.profit)}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: 'rgba(188,140,255,0.12)', color: '#bc8cff' }}>
                    <Percent size={16} />
                  </div>
                  <span className="stat-card-label">Profit Margin</span>
                </div>
                <div className="stat-card-value" style={{ color: totals.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {totals.order_amount > 0
                    ? `${((totals.profit / totals.order_amount) * 100).toFixed(2)}%`
                    : '0.00%'}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: 'rgba(227,179,65,0.12)', color: '#e3b341' }}>
                    <TrendingUp size={16} />
                  </div>
                  <span className="stat-card-label">Avg Profit / Order</span>
                </div>
                <div className="stat-card-value" style={{ color: totals.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {totals.order_count > 0
                    ? fmtCurrency(totals.profit / totals.order_count)
                    : '₹0'}
                </div>
              </div>

              {/* Per-day FY profit — always FY-to-date, ignores the date filter. */}
              <div className="stat-card" data-tooltip={`FY started ${fy.start} · ${fy.days} day${fy.days !== 1 ? 's' : ''} elapsed`}>
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: 'rgba(247,120,186,0.12)', color: '#f778ba' }}>
                    <CalendarDays size={16} />
                  </div>
                  <span className="stat-card-label">Per Day Profit (FY)</span>
                </div>
                <div className="stat-card-value" style={{ color: (fy.per_day_profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {fmtCurrency(fy.per_day_profit)}
                </div>
              </div>
            </div>

            {/* Monthly grouped bars — order/return on left axis, profit on right
                axis so the much smaller profit bar stays visible against the
                large order/return amounts. */}
            {monthly.length > 0 && (
              <div className="analytics-chart-card">
                <h3 className="analytics-chart-title">Monthly Profit Trend</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#3fb950' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="order_amount" name="Order Amount" fill="#58a6ff" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="left" dataKey="return_amount" name="Return Amount" fill="#bc8cff" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="right" dataKey="profit" name="Profit" radius={[3, 3, 0, 0]}>
                      {monthly.map((m, i) => (
                        <Cell key={i} fill={m.profit >= 0 ? '#3fb950' : '#f85149'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Two-column: Seller Bar Chart + E-Commerce Pie */}
            <div className="analytics-charts-row">
              {/* Profit by Seller */}
              {bySeller.length > 0 && (
                <div className="analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    <Users size={16} /> Profit by Buyer
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(250, bySeller.length * 40)}>
                    <BarChart data={bySeller} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="seller_name" width={sellerYAxisWidth} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
                        {bySeller.map((entry, i) => (
                          <Cell key={i} fill={entry.profit >= 0 ? COLORS[i % COLORS.length] : '#f85149'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Order Volume by E-Commerce Site — donut with side legend.
                  Slice labels were overlapping; legend keeps it readable. */}
              {byEcommSite.length > 0 && (
                <div className="analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    <ShoppingBag size={16} /> Orders by Platform
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="40%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => fmtCurrency(val)} />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: 12, paddingLeft: 8 }}
                        formatter={(value, entry) => {
                          const total = pieData.reduce((s, p) => s + p.value, 0);
                          const pct = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
                          return `${value} — ${pct}%`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Profit by Platform — horizontal bar, mirrors Profit by Buyer.
                Reuses byEcommSite so no extra backend work. */}
            {profitByPlatform.length > 0 && (
              <div className="analytics-chart-card">
                <h3 className="analytics-chart-title">
                  <TrendingUp size={16} /> Profit by Platform
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(220, profitByPlatform.length * 40)}>
                  <BarChart data={profitByPlatform} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="ecomm_site" width={platformYAxisWidth} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
                      {profitByPlatform.map((entry, i) => (
                        <Cell key={i} fill={entry.profit >= 0 ? COLORS[i % COLORS.length] : '#f85149'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
