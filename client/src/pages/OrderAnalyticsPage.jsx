import { useState, useEffect } from 'react';
import { ChevronLeft, TrendingUp, Users, ShoppingBag, IndianRupee, BarChart3 } from 'lucide-react';
import { getProfitAnalytics } from '../api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

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

  useEffect(() => {
    getProfitAnalytics()
      .then(setData)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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

  if (!data || !data.totals || data.totals.order_count === 0) {
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
          <div className="empty-state-card">
            <div className="empty-icon empty-icon-orders">
              <BarChart3 size={32} />
            </div>
            <div className="empty-title">No analytics data yet</div>
            <div className="empty-sub">Analytics will appear once you have orders marked as delivered.</div>
          </div>
        </div>
      </>
    );
  }

  const { monthly, bySeller, byEcommSite, totals } = data;

  // Pie chart data for e-commerce sites
  const pieData = byEcommSite.map((s, i) => ({
    name: s.ecomm_site,
    value: s.order_amount,
    fill: COLORS[i % COLORS.length],
  }));

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
                <span className={`profit-badge ${totals.profit >= 0 ? 'profit-badge-positive' : 'profit-badge-negative'}`}>
                  Net: {fmtCurrency(totals.profit)}
                </span>
              </div>
              <span className="page-hero-subtitle">{totals.order_count} delivered order{totals.order_count !== 1 ? 's' : ''} analysed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Summary Cards */}
        <div className="stats-row stats-row-4">
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
        </div>

        {/* Monthly Profit Trend */}
        {monthly.length > 1 && (
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Monthly Profit Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="order_amount" name="Order Amount" stroke="#58a6ff" fill="url(#orderGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="return_amount" name="Return Amount" stroke="#bc8cff" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#3fb950" fill="url(#profitGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two-column: Seller Bar Chart + E-Commerce Pie */}
        <div className="analytics-charts-row">
          {/* Profit by Seller */}
          {bySeller.length > 0 && (
            <div className="analytics-chart-card">
              <h3 className="analytics-chart-title">
                <Users size={16} /> Profit by Seller
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(250, bySeller.length * 40)}>
                <BarChart data={bySeller} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="seller_name" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
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

          {/* Order Volume by E-Commerce Site */}
          {byEcommSite.length > 0 && (
            <div className="analytics-chart-card">
              <h3 className="analytics-chart-title">
                <ShoppingBag size={16} /> Orders by Platform
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'var(--text-muted)' }}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => fmtCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
