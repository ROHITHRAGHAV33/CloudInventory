import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { BarChart3, TrendingUp, DollarSign, Briefcase, Calendar, ChevronDown } from 'lucide-react';

export default function Reports() {
  const { business } = useAuth();
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('daily'); // 'daily' | 'monthly' | 'yearly'

  useEffect(() => {
    async function loadReportData() {
      if (!business) return;
      try {
        setLoading(true);
        const [salesList, purchaseList, prodList] = await Promise.all([
          dbService.getSales(business.id),
          dbService.getPurchases(business.id),
          dbService.getProducts(business.id)
        ]);
        setSales(salesList);
        setPurchases(purchaseList);
        setProducts(prodList);
      } catch (err) {
        console.error("Error loading report databases:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReportData();
  }, [business]);

  if (loading) {
    return <div style={styles.loadingText}>Compiling financial analytics...</div>;
  }

  // Helper: currency formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Helper: Get product buying price to compute true profits
  const getProductBuyingPrice = (productId) => {
    const prod = products.find(p => p.id === productId);
    return prod ? Number(prod.buyingPrice) || 0 : 0;
  };

  // --- FILTER AND COMPILE DATA BASED ON PERIOD ---
  const today = new Date();
  
  let filteredSales = [];
  let filteredPurchases = [];
  let chartData = []; // Array of { label, revenue, expense }

  if (reportPeriod === 'daily') {
    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      // format label (e.g. "Jul 10")
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      last7Days.push({ dateString, label });
    }

    filteredSales = sales.filter(s => {
      const saleDate = s.saleDate?.split('T')[0];
      return last7Days.some(day => day.dateString === saleDate);
    });

    filteredPurchases = purchases.filter(p => {
      const purDate = p.purchaseDate?.split('T')[0];
      return last7Days.some(day => day.dateString === purDate);
    });

    chartData = last7Days.map(day => {
      const daySales = sales.filter(s => s.saleDate?.split('T')[0] === day.dateString);
      const dayPurchases = purchases.filter(p => p.purchaseDate?.split('T')[0] === day.dateString);
      
      const rev = daySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
      const exp = dayPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      return { label: day.label, revenue: rev, expense: exp };
    });

  } else if (reportPeriod === 'monthly') {
    // Last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      last6Months.push({ year, month, label });
    }

    filteredSales = sales.filter(s => {
      if (!s.saleDate) return false;
      const sDate = new Date(s.saleDate);
      return last6Months.some(m => m.year === sDate.getFullYear() && m.month === sDate.getMonth());
    });

    filteredPurchases = purchases.filter(p => {
      if (!p.purchaseDate) return false;
      const pDate = new Date(p.purchaseDate);
      return last6Months.some(m => m.year === pDate.getFullYear() && m.month === pDate.getMonth());
    });

    chartData = last6Months.map(month => {
      const mSales = sales.filter(s => {
        const d = new Date(s.saleDate);
        return d.getFullYear() === month.year && d.getMonth() === month.month;
      });
      const mPurchases = purchases.filter(p => {
        const d = new Date(p.purchaseDate);
        return d.getFullYear() === month.year && d.getMonth() === month.month;
      });

      const rev = mSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
      const exp = mPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      return { label: month.label, revenue: rev, expense: exp };
    });

  } else if (reportPeriod === 'yearly') {
    // Last 3 years
    const last3Years = [];
    for (let i = 2; i >= 0; i--) {
      const year = today.getFullYear() - i;
      last3Years.push({ year, label: String(year) });
    }

    filteredSales = sales.filter(s => {
      if (!s.saleDate) return false;
      const sDate = new Date(s.saleDate);
      return last3Years.some(y => y.year === sDate.getFullYear());
    });

    filteredPurchases = purchases.filter(p => {
      if (!p.purchaseDate) return false;
      const pDate = new Date(p.purchaseDate);
      return last3Years.some(y => y.year === pDate.getFullYear());
    });

    chartData = last3Years.map(yearObj => {
      const ySales = sales.filter(s => new Date(s.saleDate).getFullYear() === yearObj.year);
      const yPurchases = purchases.filter(p => new Date(p.purchaseDate).getFullYear() === yearObj.year);

      const rev = ySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
      const exp = yPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      return { label: yearObj.label, revenue: rev, expense: exp };
    });
  }

  // Calculate high-level stats for selected period
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const totalCost = filteredPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  
  // Gross Profit Margin (Revenue - cost price of items actually sold)
  let totalCostOfGoodsSold = 0;
  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      const buyPrice = getProductBuyingPrice(item.productId);
      totalCostOfGoodsSold += (buyPrice * (item.quantity || 0));
    });
  });

  const estimatedGrossProfit = Math.max(0, totalRevenue - totalCostOfGoodsSold);

  // --- SVG CHART RENDER LOGIC ---
  const renderSvgChart = () => {
    const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.expense)), 100);
    const height = 240;
    const width = 600;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartHeight = height - paddingTop - paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    // Number of gridlines
    const yTicks = 4;
    const gridlines = Array.from({ length: yTicks + 1 }, (_, i) => {
      const val = (maxVal / yTicks) * i;
      const y = height - paddingBottom - (chartHeight / yTicks) * i;
      return { val, y };
    });

    const colWidth = chartWidth / chartData.length;
    const barWidth = Math.max(10, colWidth * 0.3);

    return (
      <div style={styles.chartWrapper}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          width="100%" 
          height="100%" 
          style={styles.svgElement}
        >
          {/* Y-Axis Gridlines & Labels */}
          {gridlines.map((tick, idx) => (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={tick.y} 
                x2={width - paddingRight} 
                y2={tick.y} 
                stroke="var(--border-color)" 
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text 
                x={paddingLeft - 10} 
                y={tick.y + 4} 
                textAnchor="end" 
                fontSize={10} 
                fill="var(--text-secondary)"
                fontWeight="500"
              >
                ${Math.round(tick.val)}
              </text>
            </g>
          ))}

          {/* Bar groups */}
          {chartData.map((data, idx) => {
            const xCenter = paddingLeft + (colWidth * idx) + (colWidth / 2);
            
            // Heights
            const revHeight = (data.revenue / maxVal) * chartHeight;
            const expHeight = (data.expense / maxVal) * chartHeight;

            // Y coords
            const revY = height - paddingBottom - revHeight;
            const expY = height - paddingBottom - expHeight;

            return (
              <g key={idx}>
                {/* Revenue Bar */}
                <rect 
                  x={xCenter - barWidth - 2} 
                  y={revY} 
                  width={barWidth} 
                  height={revHeight} 
                  fill="var(--primary)" 
                  rx={2}
                  style={{ transition: 'all 0.3s ease' }}
                  title={`Revenue: $${data.revenue}`}
                />
                
                {/* Expense Bar */}
                <rect 
                  x={xCenter + 2} 
                  y={expY} 
                  width={barWidth} 
                  height={expHeight} 
                  fill="var(--secondary)" 
                  rx={2}
                  style={{ transition: 'all 0.3s ease' }}
                  title={`Expense: $${data.expense}`}
                />

                {/* X-axis Label */}
                <text 
                  x={xCenter} 
                  y={height - paddingBottom + 20} 
                  textAnchor="middle" 
                  fontSize={11} 
                  fill="var(--text-secondary)"
                  fontWeight="500"
                >
                  {data.label}
                </text>
              </g>
            );
          })}

          {/* Bottom baseline */}
          <line 
            x1={paddingLeft} 
            y1={height - paddingBottom} 
            x2={width - paddingRight} 
            y2={height - paddingBottom} 
            stroke="var(--border-color)" 
            strokeWidth={1.5}
          />
        </svg>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      
      {/* Time interval filter bar */}
      <div style={styles.filterBar}>
        <div style={styles.periodSelector}>
          <button 
            className={`btn ${reportPeriod === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportPeriod('daily')}
            style={styles.periodBtn}
          >
            Weekly Report
          </button>
          <button 
            className={`btn ${reportPeriod === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportPeriod('monthly')}
            style={styles.periodBtn}
          >
            Monthly Report
          </button>
          <button 
            className={`btn ${reportPeriod === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportPeriod('yearly')}
            style={styles.periodBtn}
          >
            Yearly Report
          </button>
        </div>

        <div style={styles.metadataBadge}>
          <Calendar size={15} />
          <span>Active Period: {reportPeriod === 'daily' ? 'Last 7 Days' : reportPeriod === 'monthly' ? 'Last 6 Months' : 'Last 3 Years'}</span>
        </div>
      </div>

      {/* KPI summaries cards */}
      <div style={styles.metricsGrid}>
        <div className="card animate-fade-in" style={styles.metricCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: 'var(--primary-light)' }}>
            <DollarSign size={20} color="var(--primary)" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.metricLabel}>Gross Sales Revenue</span>
            <strong style={styles.metricVal}>{formatCurrency(totalRevenue)}</strong>
            <span style={styles.metricSubText}>{filteredSales.length} invoices generated</span>
          </div>
        </div>

        <div className="card animate-fade-in" style={styles.metricCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(71, 85, 105, 0.1)' }}>
            <Briefcase size={20} color="var(--secondary)" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.metricLabel}>Purchases Cost</span>
            <strong style={styles.metricVal}>{formatCurrency(totalCost)}</strong>
            <span style={styles.metricSubText}>{filteredPurchases.length} stock inflows logged</span>
          </div>
        </div>

        <div className="card animate-fade-in" style={styles.metricCard}>
          <div style={{ ...styles.iconContainer, backgroundColor: 'var(--success-light)' }}>
            <TrendingUp size={20} color="var(--success)" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.metricLabel}>Gross Profit Margin</span>
            <strong style={{ ...styles.metricVal, color: 'var(--success)' }}>{formatCurrency(estimatedGrossProfit)}</strong>
            <span style={styles.metricSubText}>
              Margin: {totalRevenue > 0 ? ((estimatedGrossProfit / totalRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="card animate-fade-in" style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <BarChart3 size={18} color="var(--primary)" />
            Revenue vs Expenditures Comparison
          </h3>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'var(--primary)' }}></span>
              <span>Sales Revenue</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'var(--secondary)' }}></span>
              <span>Purchases Cost</span>
            </div>
          </div>
        </div>

        {renderSvgChart()}
      </div>

      {/* Transaction List details in this period */}
      <div className="card animate-fade-in">
        <h3 className="card-title">Statement Logs</h3>
        {filteredSales.length === 0 && filteredPurchases.length === 0 ? (
          <p style={styles.emptyText}>No financial transactions recorded in this period.</p>
        ) : (
          <div style={styles.tableGrid}>
            <div style={{ flex: 1 }}>
              <h4 style={styles.tableHeading}>Sales Billing Logs</h4>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="classic-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.slice(0, 8).map(sale => (
                      <tr key={sale.id}>
                        <td>{sale.saleDate?.split('T')[0]}</td>
                        <td style={{ fontWeight: '500' }}>{sale.customerName}</td>
                        <td style={{ fontWeight: '600', color: 'var(--success)' }}>${Number(sale.grandTotal).toFixed(2)}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sales.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h4 style={styles.tableHeading}>Purchasing Cost Logs</h4>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="classic-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.slice(0, 8).map(pur => (
                      <tr key={pur.id}>
                        <td>{pur.purchaseDate?.split('T')[0]}</td>
                        <td style={{ fontWeight: '500' }}>{pur.productName}</td>
                        <td style={{ fontWeight: '600', color: 'var(--danger)' }}>${Number(pur.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                    {filteredPurchases.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No purchases.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loadingText: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-secondary)',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  periodSelector: {
    display: 'flex',
    gap: '0.5rem',
  },
  periodBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  metadataBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    padding: '0.5rem 0.875rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 1.5rem',
  },
  iconContainer: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  metricLabel: {
    fontSize: '0.775rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    margin: '0.15rem 0',
  },
  metricSubText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  chartCard: {
    margin: 0,
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  legend: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  chartWrapper: {
    width: '100%',
    height: '240px',
  },
  svgElement: {
    display: 'block',
  },
  tableGrid: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  tableHeading: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    marginBottom: '0.75rem',
    textAlign: 'left',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    padding: '2rem 0',
  }
};
