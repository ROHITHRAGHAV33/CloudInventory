import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  Calendar, 
  Activity, 
  Layers, 
  Scale 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { business } = useAuth();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!business) return;
      try {
        setLoading(true);
        const [prodList, salesList, purchaseList] = await Promise.all([
          dbService.getProducts(business.id),
          dbService.getSales(business.id),
          dbService.getPurchases(business.id)
        ]);
        setProducts(prodList);
        setSales(salesList);
        setPurchases(purchaseList);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [business]);

  if (loading) {
    return <div style={styles.loadingContainer}>Loading dashboard statistics...</div>;
  }

  // Calculate KPIs
  const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  const totalProductsCount = products.length;
  
  // Low stock check
  const lowStockItems = products.filter(p => p.stock <= (p.minStockAlert || 5));
  const lowStockCount = lowStockItems.length;

  // Format currency helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // --- BUSINESS TYPE SPECIFIC LOGIC ---
  const renderShopSpecificWidget = () => {
    if (!business) return null;

    switch (business.type) {
      case 'medical':
        // Medicine Expiry Tracker
        // Calculate items that are expired or expiring within 90 days
        const today = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(today.getDate() + 90);

        const expiryAlerts = products
          .filter(p => p.expiryDate)
          .map(p => {
            const expDate = new Date(p.expiryDate);
            const isExpired = expDate < today;
            const isNearExpiry = !isExpired && expDate <= ninetyDaysFromNow;
            return { ...p, expDate, isExpired, isNearExpiry };
          })
          .filter(p => p.isExpired || p.isNearExpiry)
          .sort((a, b) => a.expDate - b.expDate);

        return (
          <div className="card animate-fade-in" style={{ flex: 1 }}>
            <h3 className="card-title">
              <Calendar size={18} color="var(--danger)" />
              Medicine Expiry Alerts
            </h3>
            {expiryAlerts.length === 0 ? (
              <p style={styles.emptyText}>All medicines are well within their expiry periods.</p>
            ) : (
              <div style={styles.alertListContainer}>
                {expiryAlerts.map(item => (
                  <div 
                    key={item.id} 
                    style={{
                      ...styles.alertItem,
                      ...(item.isExpired ? styles.dangerAlertItem : styles.warningAlertItem)
                    }}
                  >
                    <div style={styles.alertItemHeader}>
                      <span style={{ fontWeight: '600' }}>{item.name}</span>
                      <span className={`badge ${item.isExpired ? 'badge-danger' : 'badge-rice'}`}>
                        {item.isExpired ? 'Expired' : 'Near Expiry'}
                      </span>
                    </div>
                    <div style={styles.alertItemDetails}>
                      <span>Batch: <strong>{item.batchNumber || 'N/A'}</strong></span>
                      <span>Expiry Date: <strong>{item.expiryDate}</strong></span>
                      <span>Current Stock: <strong>{item.stock} units</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'rice':
        // Rice Stock Distribution (Brands & Weight)
        // Group bag stocks by weight and brand
        const brandGroups = {};
        const weightGroups = {};

        products.forEach(p => {
          if (p.brand) {
            brandGroups[p.brand] = (brandGroups[p.brand] || 0) + (Number(p.stock) || 0);
          }
          if (p.bagWeight) {
            const wtKey = p.bagWeight.toLowerCase().includes('kg') ? p.bagWeight : `${p.bagWeight}kg`;
            weightGroups[wtKey] = (weightGroups[wtKey] || 0) + (Number(p.stock) || 0);
          }
        });

        return (
          <div className="card animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 className="card-title">
                <Scale size={18} color="var(--warning)" />
                Rice Stock Metrics
              </h3>
            </div>
            
            <div style={styles.statsGridRow}>
              <div style={styles.subStatsBox}>
                <h4 style={styles.subStatsTitle}>Stocks by Brand</h4>
                {Object.keys(brandGroups).length === 0 ? (
                  <p style={styles.emptyText}>No brands logged.</p>
                ) : (
                  <div style={styles.metricList}>
                    {Object.entries(brandGroups).map(([brand, stock]) => (
                      <div key={brand} style={styles.metricRow}>
                        <span>{brand}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{stock} bags</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.subStatsBox}>
                <h4 style={styles.subStatsTitle}>Stocks by Bag Weight</h4>
                {Object.keys(weightGroups).length === 0 ? (
                  <p style={styles.emptyText}>No bag weights logged.</p>
                ) : (
                  <div style={styles.metricList}>
                    {Object.entries(weightGroups).map(([weight, stock]) => (
                      <div key={weight} style={styles.metricRow}>
                        <span>{weight} Bags</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{stock} units</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'grocery':
      default:
        // Grocery Store category split
        const categories = {};
        products.forEach(p => {
          const cat = p.category || 'Uncategorized';
          categories[cat] = (categories[cat] || 0) + 1;
        });

        return (
          <div className="card animate-fade-in" style={{ flex: 1 }}>
            <h3 className="card-title">
              <Layers size={18} color="var(--primary)" />
              Product Category Split
            </h3>
            {Object.keys(categories).length === 0 ? (
              <p style={styles.emptyText}>No products added to categories yet.</p>
            ) : (
              <div style={styles.categoryList}>
                {Object.entries(categories).map(([cat, count]) => (
                  <div key={cat} style={styles.categoryItem}>
                    <span style={styles.categoryLabel}>{cat}</span>
                    <span style={styles.categoryBadge}>{count} {count === 1 ? 'Product' : 'Products'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* Welcome banner */}
      <div className="welcome-banner" style={styles.welcomeBanner}>
        <div style={styles.welcomeInfo}>
          <h1 className="welcome-title" style={styles.welcomeTitle}>Welcome back!</h1>
          <p style={styles.welcomeSubtitle}>
            Here is the operational overview for <strong>{business?.name}</strong> today.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={styles.kpiGrid}>
        <div className="kpi-card" style={styles.kpiCard}>
          <div className="kpi-icon-wrapper" style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--primary-light)' }}>
            <DollarSign size={22} color="var(--primary)" />
          </div>
          <div style={styles.kpiContent}>
            <span className="kpi-label" style={styles.kpiLabel}>Total Revenue</span>
            <span className="kpi-val" style={styles.kpiValue}>{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className="kpi-card" style={styles.kpiCard}>
          <div className="kpi-icon-wrapper" style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--warning-light)' }}>
            <ShoppingBag size={22} color="var(--warning)" />
          </div>
          <div style={styles.kpiContent}>
            <span className="kpi-label" style={styles.kpiLabel}>Purchases Cost</span>
            <span className="kpi-val" style={styles.kpiValue}>{formatCurrency(totalPurchases)}</span>
          </div>
        </div>

        <div className="kpi-card" style={styles.kpiCard}>
          <div className="kpi-icon-wrapper" style={{ ...styles.kpiIconWrapper, backgroundColor: 'var(--info-light)' }}>
            <Package size={22} color="var(--info)" />
          </div>
          <div style={styles.kpiContent}>
            <span className="kpi-label" style={styles.kpiLabel}>Active Products</span>
            <span className="kpi-val" style={styles.kpiValue}>{totalProductsCount}</span>
          </div>
        </div>

        <div className={`kpi-card ${lowStockCount > 0 ? 'kpi-card-alert' : ''}`} style={{
          ...styles.kpiCard,
          ...(lowStockCount > 0 ? styles.kpiCardAlert : {})
        }}>
          <div className="kpi-icon-wrapper" style={{
            ...styles.kpiIconWrapper,
            backgroundColor: lowStockCount > 0 ? 'var(--danger-light)' : 'rgba(148, 163, 184, 0.1)'
          }}>
            <AlertTriangle size={22} color={lowStockCount > 0 ? 'var(--danger)' : 'var(--text-secondary)'} />
          </div>
          <div style={styles.kpiContent}>
            <span className="kpi-label" style={styles.kpiLabel}>Low Stock Alerts</span>
            <span className="kpi-val" style={{
              ...styles.kpiValue,
              color: lowStockCount > 0 ? 'var(--danger)' : 'var(--text-primary)'
            }}>{lowStockCount}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Specific Widget + Low Stock Widget */}
      <div className="bottom-grid" style={styles.bottomGrid}>
        {/* Dynamic widget */}
        {renderShopSpecificWidget()}

        {/* Low Stock Warning Card */}
        <div className="card animate-fade-in" style={{ flex: 1 }}>

          <h3 className="card-title">
            <AlertTriangle size={18} color="var(--danger)" />
            Stock Replenishment Required
          </h3>
          {lowStockItems.length === 0 ? (
            <p style={styles.emptyText}>All products are sufficiently stocked.</p>
          ) : (
            <div style={styles.lowStockListContainer}>
              <div style={styles.lowStockTableWrapper}>
                <table style={styles.smallTable}>
                  <thead>
                    <tr>
                      <th style={styles.smallTh}>Item Name</th>
                      <th style={styles.smallTh}>Stock</th>
                      <th style={styles.smallTh}>Alert At</th>
                      <th style={styles.smallTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.slice(0, 5).map(item => (
                      <tr key={item.id}>
                        <td style={styles.smallTd}>{item.name}</td>
                        <td style={{ ...styles.smallTd, color: 'var(--danger)', fontWeight: '600' }}>{item.stock}</td>
                        <td style={styles.smallTd}>{item.minStockAlert || 5}</td>
                        <td style={styles.smallTd}>
                          <Link 
                            to={`/purchases?productId=${item.id}&productName=${encodeURIComponent(item.name)}`}
                            style={styles.reorderLink}
                          >
                            Order Stock
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lowStockItems.length > 5 && (
                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                  <Link to="/products" style={styles.seeMoreLink}>
                    View all {lowStockItems.length} items &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
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
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  welcomeBanner: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  welcomeInfo: {
    textAlign: 'left',
  },
  welcomeTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  welcomeSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  },
  kpiCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: 'var(--shadow-card)',
  },
  kpiCardAlert: {
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  kpiIconWrapper: {
    width: '46px',
    height: '46px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiContent: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  kpiLabel: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  kpiValue: {
    fontSize: '1.35rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.5rem',
    alignItems: 'start',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '2rem 0',
  },
  alertListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '280px',
    overflowY: 'auto',
    textAlign: 'left',
  },
  alertItem: {
    padding: '0.875rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
  },
  dangerAlertItem: {
    backgroundColor: 'var(--danger-light)',
    borderColor: 'rgba(220, 38, 38, 0.15)',
    color: '#991b1b',
  },
  warningAlertItem: {
    backgroundColor: 'var(--warning-light)',
    borderColor: 'rgba(217, 119, 6, 0.15)',
    color: '#92400e',
  },
  alertItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.375rem',
  },
  alertItemDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    fontSize: '0.775rem',
  },
  statsGridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    textAlign: 'left',
  },
  subStatsBox: {
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
  },
  subStatsTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '0.75rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.375rem',
  },
  metricList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
    textAlign: 'left',
  },
  categoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
  },
  categoryLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  categoryBadge: {
    fontSize: '0.75rem',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    fontWeight: '600',
    padding: '0.15rem 0.5rem',
    borderRadius: '9999px',
  },
  lowStockListContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  lowStockTableWrapper: {
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
  },
  smallTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.8rem',
  },
  smallTh: {
    backgroundColor: 'var(--bg-app)',
    color: 'var(--text-secondary)',
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--border-color)',
    fontWeight: '600',
  },
  smallTd: {
    padding: '0.625rem 0.75rem',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  },
  reorderLink: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: '600',
  },
  seeMoreLink: {
    fontSize: '0.8rem',
    color: 'var(--primary)',
    fontWeight: '500',
  }
};
