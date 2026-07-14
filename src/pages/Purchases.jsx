import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { Plus, Search, FileText, AlertCircle } from 'lucide-react';

export default function Purchases() {
  const { business } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Loaders
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!business) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [prodList, supList, purList] = await Promise.all([
        dbService.getProducts(business.id),
        dbService.getSuppliers(business.id),
        dbService.getPurchases(business.id)
      ]);
      setProducts(prodList);
      setSuppliers(supList);
      
      // Sort purchases by date descending
      const sortedPurchases = purList.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
      setPurchases(sortedPurchases);
    } catch (err) {
      console.error("Error loading purchase directories:", err);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Handle dashboard reorder redirect query parameters
  useEffect(() => {
    if (products.length > 0 && !loading) {
      const params = new URLSearchParams(location.search);
      const prodId = params.get('productId');
      if (prodId) {
        // Pre-fill
        const matchingProd = products.find(p => p.id === prodId);
        if (matchingProd) {
          setTimeout(() => {
            setSelectedProductId(prodId);
            setUnitPrice(matchingProd.buyingPrice || '');
            setIsFormOpen(true);
            navigate('/purchases', { replace: true });
          }, 0);
        }
      }
    }
  }, [location, products, loading, navigate]);

  // Pre-fill buying price when product changes
  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setUnitPrice(prod.buyingPrice || '');
    } else {
      setUnitPrice('');
    }
  };

  const handleOpenForm = () => {
    if (products.length === 0) {
      alert("You need to register at least one product before logging purchases.");
      return;
    }
    if (suppliers.length === 0) {
      alert("You need to register at least one supplier before logging purchases.");
      return;
    }
    setSelectedProductId(products[0]?.id || '');
    setSelectedSupplierId(suppliers[0]?.id || '');
    setUnitPrice(products[0]?.buyingPrice || '');
    setQuantity('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !selectedSupplierId || !quantity || !unitPrice) {
      return setFormError('All fields are required.');
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return setFormError('Quantity must be a positive integer.');
    }

    const price = Number(unitPrice);
    if (isNaN(price) || price <= 0) {
      return setFormError('Unit price must be positive.');
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    try {
      setFormError('');
      setIsSubmitting(true);

      const newPurchaseRecord = await dbService.addPurchase(business.id, {
        productId: selectedProductId,
        productName: selectedProduct.name,
        supplierId: selectedSupplierId,
        supplierName: selectedSupplier.name,
        quantity: qty,
        unitPrice: price,
        purchaseDate
      });

      // Update local state: add record and refresh products stock
      setPurchases([newPurchaseRecord, ...purchases]);
      
      // Update local product stocks to avoid re-fetch latency
      setProducts(products.map(p => {
        if (p.id === selectedProductId) {
          return { ...p, stock: (Number(p.stock) || 0) + qty };
        }
        return p;
      }));

      setIsFormOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to record purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Top action and search controls */}
      <div style={styles.controlsBar}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Product, Supplier..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenForm}>
          <Plus size={18} />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Main split dashboard: purchase form + logs list */}
      <div style={styles.dashboardSplit}>
        {/* Left Form (if active) */}
        {isFormOpen ? (
          <div className="card animate-fade-in" style={styles.formCard}>
            <div style={styles.formHeader}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--primary)" />
                Record Stock Inflow
              </h3>
            </div>

            {formError && (
              <div style={styles.formAlert}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div className="form-group">
                <label className="form-label">Select Product</label>
                <select
                  className="form-select"
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  disabled={isSubmitting}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (In stock: {p.stock} {business?.type === 'medical' ? 'units' : business?.type === 'rice' ? 'bags' : 'items'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Supplier</label>
                <select
                  className="form-select"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  disabled={isSubmitting}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contactPerson})</option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Buying Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Reactive Cost Preview */}
              {quantity && unitPrice && (
                <div style={styles.costPreview}>
                  <span>Total Calculated Price:</span>
                  <strong>${(Number(quantity) * Number(unitPrice)).toFixed(2)}</strong>
                </div>
              )}

              <div style={styles.formActions}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logging...' : 'Confirm Inflow'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Purchase Logs Table */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={styles.loadingText}>Fetching purchase order database...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <p>No purchase records. Click "New Purchase Order" to log stock inflows.</p>
            </div>
          ) : (
            <div className="table-container animate-fade-in" style={{ margin: 0 }}>
              <table className="classic-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map(order => (
                    <tr key={order.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {order.purchaseDate?.split('T')[0]}
                      </td>
                      <td style={{ fontWeight: '500' }}>{order.productName}</td>
                      <td>{order.supplierName}</td>
                      <td>{order.quantity}</td>
                      <td>${Number(order.unitPrice).toFixed(2)}</td>
                      <td style={{ fontWeight: '600' }}>${Number(order.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    gap: '1rem',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: '1',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-sans)',
  },
  dashboardSplit: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    alignItems: 'start',
  },
  formCard: {
    flex: '1',
    minWidth: '320px',
    maxWidth: '450px',
    backgroundColor: 'var(--bg-card)',
    margin: 0,
  },
  formHeader: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
    textAlign: 'left',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  costPreview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  formAlert: {
    padding: '0.75rem',
    backgroundColor: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid rgba(220, 38, 38, 0.15)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    textAlign: 'left',
  },
  loadingText: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-secondary)',
  },
  emptyCard: {
    padding: '3rem 2rem',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    width: '100%',
  }
};
