import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { Search, ShoppingCart, Trash2, Printer, X, CheckCircle, Plus, Minus, User } from 'lucide-react';

export default function Sales() {
  const { business } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('5'); // default 5% tax

  // Post-checkout receipt states
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleRecord, setLastSaleRecord] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!business) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await dbService.getProducts(business.id);
      setProducts(list);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Cart actions
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("This product is currently out of stock!");
      return;
    }

    const existingIdx = cart.findIndex(item => item.id === product.id);
    if (existingIdx !== -1) {
      const currentQty = cart[existingIdx].quantity;
      if (currentQty >= product.stock) {
        alert(`Cannot add more. Available stock is only ${product.stock}.`);
        return;
      }
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (itemId, newQty) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      return removeFromCart(itemId);
    }

    if (newQty > item.stock) {
      alert(`Cannot exceed available stock of ${item.stock}.`);
      return;
    }

    setCart(cart.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('Walk-in Customer');
    setDiscount('0');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const discountAmount = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  // Checkout process
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty. Add products to generate a bill.");
      return;
    }

    try {
      setCheckoutLoading(true);
      
      const salePayload = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.sellingPrice
        })),
        tax: taxAmount,
        discount: discountAmount,
        customerName: customerName.trim()
      };

      const saleRecord = await dbService.addSale(business.id, salePayload);
      setLastSaleRecord(saleRecord);

      // Decrement stock values locally to avoid page refresh latency
      setProducts(products.map(p => {
        const cartItem = cart.find(item => item.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      }));

      // Open printable receipt
      setShowReceipt(true);
      clearCart();
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Checkout failed: " + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter products by query
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pos-container" style={styles.container}>
      {/* POS Billing Screen Split */}
      <div className="pos-grid" style={styles.billingGrid}>

        
        {/* Left Side: Product Selector */}
        <div style={styles.leftColumn}>
          <div className="card" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 className="card-title">Select Items</h3>
            <div style={styles.searchWrapper}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Lookup product by name/SKU..."
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div style={styles.centerText}>Loading inventory directory...</div>
            ) : filteredProducts.length === 0 ? (
              <div style={styles.centerText}>No products match your search.</div>
            ) : (
              <div style={styles.productGrid}>
                {filteredProducts.map(prod => {
                  const isOutOfStock = prod.stock <= 0;
                  return (
                    <button
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      style={{
                        ...styles.productItemCard,
                        ...(isOutOfStock ? styles.disabledProductCard : {})
                      }}
                      disabled={isOutOfStock}
                    >
                      <div style={styles.prodCardHeader}>
                        <strong style={styles.prodName}>{prod.name}</strong>
                        <span style={styles.prodPrice}>${Number(prod.sellingPrice).toFixed(2)}</span>
                      </div>
                      <div style={styles.prodCardFooter}>
                        <span style={styles.prodSku}>SKU: {prod.sku}</span>
                        <span style={{
                          ...styles.prodStock,
                          color: isOutOfStock ? 'var(--danger)' : 'var(--text-secondary)'
                        }}>
                          {isOutOfStock ? 'Out of Stock' : `Stock: ${prod.stock}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Billing Sheet */}
        <div style={styles.rightColumn}>
          <div className="card" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
            <h3 className="card-title">
              <ShoppingCart size={18} color="var(--primary)" />
              Billing Cart
            </h3>

            {/* Customer Information */}
            <div style={styles.customerBox}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <div style={styles.custInputWrapper}>
                  <User size={16} style={styles.custIcon} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={styles.custInput}
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div style={styles.cartContainer}>
              {cart.length === 0 ? (
                <div style={styles.emptyCartMessage}>
                  <ShoppingCart size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  <p>Cart is currently empty.</p>
                </div>
              ) : (
                <div style={styles.cartList}>
                  {cart.map(item => (
                    <div key={item.id} style={styles.cartItemRow}>
                      <div style={styles.cartItemInfo}>
                        <span style={styles.cartItemName}>{item.name}</span>
                        <span style={styles.cartItemUnitPrice}>${Number(item.sellingPrice).toFixed(2)} each</span>
                      </div>
                      
                      <div style={styles.cartItemQtyControls}>
                        <button 
                          style={styles.qtyBtn} 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={styles.qtyVal}>{item.quantity}</span>
                        <button 
                          style={styles.qtyBtn} 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div style={styles.cartItemTotal}>
                        <span>${(item.sellingPrice * item.quantity).toFixed(2)}</span>
                        <button 
                          style={styles.removeItemBtn} 
                          onClick={() => removeFromCart(item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summaries Panel */}
            <div style={styles.summaryPanel}>
              <div style={styles.summaryRow}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div style={styles.adjustmentsRow}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    style={styles.smallInput}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    style={styles.smallInput}
                  />
                </div>
              </div>

              <div style={styles.summaryRow}>
                <span>Tax Total</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              <div style={{ ...styles.summaryRow, borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>Grand Total</strong>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>${grandTotal.toFixed(2)}</strong>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.cartActions}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={clearCart}
                disabled={cart.length === 0 || checkoutLoading}
                style={{ flex: 1 }}
              >
                Clear
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleCheckout}
                disabled={cart.length === 0 || checkoutLoading}
                style={{ flex: 2 }}
              >
                {checkoutLoading ? 'Processing...' : 'Checkout & Print'}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Invoice Receipt Modal Overlay */}
      {showReceipt && lastSaleRecord && (
        <div style={styles.receiptOverlay}>
          <div className="animate-fade-in" style={styles.receiptContainer} id="printable-receipt">
            {/* Header info */}
            <div style={styles.receiptHeader}>
              <div style={styles.receiptHeaderInfo}>
                <CheckCircle size={28} color="var(--success)" />
                <h3 style={{ fontSize: '1.25rem' }}>Checkout Completed Successfully</h3>
              </div>
              <button style={styles.receiptCloseBtn} onClick={() => setShowReceipt(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Printable Invoice Slip Content */}
            <div style={styles.receiptSlip} className="receipt-slip-print">
              <div style={styles.slipBrand}>
                <h2>{business?.name}</h2>
                <p style={{ textTransform: 'capitalize' }}>{business?.type} Operations</p>
                <div style={styles.divider}></div>
              </div>

              <div style={styles.slipDetails}>
                <div>
                  <p>Customer: <strong>{lastSaleRecord.customerName}</strong></p>
                  <p>Invoice ID: <strong>INV-{lastSaleRecord.id?.substring(0, 8).toUpperCase()}</strong></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p>Date: {lastSaleRecord.saleDate ? new Date(lastSaleRecord.saleDate).toLocaleDateString() : ''}</p>
                  <p>Time: {lastSaleRecord.saleDate ? new Date(lastSaleRecord.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
              </div>

              <div style={styles.divider}></div>

              {/* Items List */}
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={styles.receiptTh}>Item</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'center' }}>Qty</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'right' }}>Price</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSaleRecord.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.receiptTd}>{item.name}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'right' }}>${Number(item.unitPrice).toFixed(2)}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'right', fontWeight: '500' }}>${Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={styles.divider}></div>

              {/* Cost Summary lists */}
              <div style={styles.receiptSummary}>
                <div style={styles.receiptSummaryRow}>
                  <span>Subtotal:</span>
                  <span>${Number(lastSaleRecord.totalAmount).toFixed(2)}</span>
                </div>
                <div style={styles.receiptSummaryRow}>
                  <span>Tax:</span>
                  <span>${Number(lastSaleRecord.tax).toFixed(2)}</span>
                </div>
                <div style={styles.receiptSummaryRow}>
                  <span>Discount:</span>
                  <span>-${Number(lastSaleRecord.discount).toFixed(2)}</span>
                </div>
                <div style={{ ...styles.receiptSummaryRow, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Total Amount Paid:</span>
                  <span>${Number(lastSaleRecord.grandTotal).toFixed(2)}</span>
                </div>
              </div>

              <div style={styles.receiptFooter}>
                <p>Thank you for your business!</p>
              </div>
            </div>

            {/* Print trigger button */}
            <div style={styles.receiptActions}>
              <button className="btn btn-secondary" onClick={() => setShowReceipt(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 110px)', // full height minus header & margin
  },
  billingGrid: {
    display: 'flex',
    gap: '1.5rem',
    height: '100%',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  leftColumn: {
    flex: '5',
    minWidth: '400px',
    height: '100%',
  },
  rightColumn: {
    flex: '3',
    minWidth: '350px',
    height: '100%',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
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
  centerText: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-muted)',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '0.75rem',
    overflowY: 'auto',
    flex: '1',
    maxHeight: 'calc(100vh - 250px)',
  },
  productItemCard: {
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.875rem',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '0.5rem',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font-sans)',
  },
  disabledProductCard: {
    opacity: 0.55,
    cursor: 'not-allowed',
    backgroundColor: '#f1f5f9',
  },
  prodCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.375rem',
  },
  prodName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
  },
  prodPrice: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--primary)',
  },
  prodCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  prodSku: {
    fontFamily: 'monospace',
  },
  prodStock: {
    fontWeight: '500',
  },
  customerBox: {
    display: 'flex',
    marginBottom: '1rem',
    backgroundColor: 'var(--bg-app)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  },
  custInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  custIcon: {
    position: 'absolute',
    left: '0.625rem',
    color: 'var(--text-secondary)',
  },
  custInput: {
    paddingLeft: '2rem',
    backgroundColor: 'var(--bg-card)',
  },
  cartContainer: {
    flex: '1',
    overflowY: 'auto',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-app)',
    minHeight: '180px',
    marginBottom: '1rem',
  },
  emptyCartMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    padding: '2rem',
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column',
  },
  cartItemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-card)',
    gap: '0.5rem',
  },
  cartItemInfo: {
    flex: '2',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  cartItemName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  cartItemUnitPrice: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  cartItemQtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  qtyBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-app)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontSize: '0.8rem',
    fontWeight: '600',
    minWidth: '18px',
    textAlign: 'center',
  },
  cartItemTotal: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  removeItemBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s ease',
  },
  summaryPanel: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    textAlign: 'left',
  },
  adjustmentsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    margin: '0.25rem 0',
  },
  smallInput: {
    padding: '0.375rem 0.5rem',
    fontSize: '0.8rem',
    textAlign: 'right',
  },
  cartActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  receiptOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '1rem',
  },
  receiptContainer: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '95vh',
    overflowY: 'auto',
  },
  receiptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  receiptHeaderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  receiptCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
  },
  receiptSlip: {
    padding: '2rem 1.5rem',
    backgroundColor: 'white',
    color: 'black',
    fontFamily: 'var(--font-sans)',
  },
  slipBrand: {
    textAlign: 'center',
    marginBottom: '1.25rem',
  },
  divider: {
    borderBottom: '1px dashed #cbd5e1',
    margin: '1rem 0',
  },
  slipDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#334155',
    lineHeight: '1.5',
    textAlign: 'left',
  },
  receiptTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    color: '#334155',
  },
  receiptTh: {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '0.5rem',
    fontWeight: '600',
    color: '#475569',
    textAlign: 'left',
  },
  receiptTd: {
    padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9',
    textAlign: 'left',
  },
  receiptSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    fontSize: '0.8rem',
    color: '#475569',
  },
  receiptSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  receiptFooter: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.75rem',
    color: '#64748b',
    fontStyle: 'italic',
  },
  receiptActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--border-color)',
  }
};
// Hover enhancements could be defined globally
