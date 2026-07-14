import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Calendar, Scale } from 'lucide-react';

export default function Products() {
  const { business } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('5');
  
  // Shop specific form states
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [riceType, setRiceType] = useState('');
  const [bagWeight, setBagWeight] = useState('');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setName('');
    setSku('');
    setCategory('');
    setBuyingPrice('');
    setSellingPrice('');
    setStock('');
    setMinStockAlert('5');
    setExpiryDate('');
    setBatchNumber('');
    setBrand('');
    setRiceType('');
    setBagWeight('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setModalMode('edit');
    setEditingId(prod.id);
    setName(prod.name || '');
    setSku(prod.sku || '');
    setCategory(prod.category || '');
    setBuyingPrice(prod.buyingPrice || '');
    setSellingPrice(prod.sellingPrice || '');
    setStock(prod.stock || '');
    setMinStockAlert(prod.minStockAlert || '5');
    
    // Shop specific
    setExpiryDate(prod.expiryDate || '');
    setBatchNumber(prod.batchNumber || '');
    setBrand(prod.brand || '');
    setRiceType(prod.riceType || '');
    setBagWeight(prod.bagWeight || '');
    
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await dbService.deleteProduct(business.id, id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !buyingPrice || !sellingPrice || !stock) {
      return setFormError('Please fill in all required fields.');
    }

    const productPayload = {
      name,
      sku: sku.trim() || 'N/A',
      category: category.trim() || 'General',
      buyingPrice: Number(buyingPrice),
      sellingPrice: Number(sellingPrice),
      stock: Number(stock),
      minStockAlert: Number(minStockAlert),
    };

    // Append shop-specific fields
    if (business.type === 'medical') {
      productPayload.expiryDate = expiryDate;
      productPayload.batchNumber = batchNumber.trim();
    } else if (business.type === 'rice') {
      productPayload.brand = brand.trim();
      productPayload.riceType = riceType.trim();
      productPayload.bagWeight = bagWeight.trim();
    }

    try {
      setFormError('');
      setIsSubmitting(true);

      if (modalMode === 'add') {
        const added = await dbService.addProduct(business.id, productPayload);
        setProducts([...products, added]);
      } else {
        const updated = await dbService.updateProduct(business.id, editingId, productPayload);
        setProducts(products.map(p => p.id === editingId ? updated : p));
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand && p.brand?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      {/* Top search & add controls */}
      <div style={styles.controlsBar}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Name, SKU, Category..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingText}>Fetching products directory...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={styles.emptyCard}>
          <p>No products found. Click "Add Product" to begin building your inventory.</p>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <table className="classic-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                {business?.type === 'grocery' && <th>Category</th>}
                {business?.type === 'medical' && (
                  <>
                    <th>Batch No</th>
                    <th>Expiry Date</th>
                  </>
                )}
                {business?.type === 'rice' && (
                  <>
                    <th>Brand</th>
                    <th>Rice Type</th>
                    <th>Bag Weight</th>
                  </>
                )}
                <th>Buying Price</th>
                <th>Selling Price</th>
                <th>Current Stock</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(prod => {
                const isLowStock = prod.stock <= (prod.minStockAlert || 5);
                return (
                  <tr key={prod.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '500' }}>{prod.sku}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{prod.name}</span>
                        {isLowStock && (
                          <span 
                            title="Low Stock Warning" 
                            style={{ display: 'inline-flex', color: 'var(--danger)' }}
                          >
                            <AlertTriangle size={14} />
                          </span>
                        )}
                      </div>
                    </td>
                    {business?.type === 'grocery' && <td>{prod.category}</td>}
                    {business?.type === 'medical' && (
                      <>
                        <td><span style={styles.tableStub}>{prod.batchNumber || 'N/A'}</span></td>
                        <td>
                          <span style={{ 
                            ...styles.tableStub,
                            color: prod.expiryDate && new Date(prod.expiryDate) < new Date() ? 'var(--danger)' : 'inherit'
                          }}>
                            {prod.expiryDate || 'N/A'}
                          </span>
                        </td>
                      </>
                    )}
                    {business?.type === 'rice' && (
                      <>
                        <td>{prod.brand || 'N/A'}</td>
                        <td>{prod.riceType || 'N/A'}</td>
                        <td>{prod.bagWeight ? `${prod.bagWeight}` : 'N/A'}</td>
                      </>
                    )}
                    <td>${Number(prod.buyingPrice).toFixed(2)}</td>
                    <td>${Number(prod.sellingPrice).toFixed(2)}</td>
                    <td style={{ fontWeight: '600', color: isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {prod.stock}
                    </td>
                    <td style={styles.actionsColumn}>
                      <button 
                        style={styles.actionBtnEdit} 
                        onClick={() => openEditModal(prod)}
                        title="Edit Product"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        style={styles.actionBtnDelete} 
                        onClick={() => handleDelete(prod.id)}
                        title="Delete Product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Overlay Form Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div className="animate-fade-in" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalMode === 'add' ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={styles.formAlert}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.modalForm}>
              {/* Row 1: Name & SKU */}
              <div style={styles.formRow}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Paracetamol / Premium Basmati"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU / Barcode</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SKU-1002"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Buying Price, Selling Price, Min stock */}
              <div style={styles.formGridThree}>
                <div className="form-group">
                  <label className="form-label">Buying Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Threshold Alert</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="5"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Initial Stock & Category (only if adding) */}
              <div style={styles.formRow}>
                <div className="form-group">
                  <label className="form-label">Current Stock *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Beverages, Tablets"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              {/* --- SHOP SPECIFIC SECTION --- */}
              {business?.type === 'medical' && (
                <div style={styles.specificSection}>
                  <h4 style={styles.sectionHeading}>
                    <Calendar size={16} />
                    Medicine Fields
                  </h4>
                  <div style={styles.formRow}>
                    <div className="form-group">
                      <label className="form-label">Batch Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. B-99881"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {business?.type === 'rice' && (
                <div style={styles.specificSection}>
                  <h4 style={styles.sectionHeading}>
                    <Scale size={16} />
                    Rice Specifications
                  </h4>
                  <div style={styles.formGridThree}>
                    <div className="form-group">
                      <label className="form-label">Brand</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Fortune, Daawat"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rice Type</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Basmati, Miniket"
                        value={riceType}
                        onChange={(e) => setRiceType(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bag Weight (e.g. 25kg)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 25kg, 50kg"
                        value={bagWeight}
                        onChange={(e) => setBagWeight(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit panel */}
              <div style={styles.formActions}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
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
  loadingText: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-secondary)',
  },
  emptyCard: {
    padding: '3rem 2rem',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  actionsColumn: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  actionBtnEdit: {
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0.35rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  actionBtnDelete: {
    backgroundColor: 'var(--danger-light)',
    border: '1px solid rgba(220, 38, 38, 0.1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
    cursor: 'pointer',
    padding: '0.35rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // transparent slate
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '1rem',
  },
  modalCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '650px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
  },
  modalForm: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  formGridThree: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
  },
  specificSection: {
    backgroundColor: 'var(--bg-app)',
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionHeading: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontWeight: '600',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.25rem',
  },
  formAlert: {
    margin: '1.5rem 1.5rem 0',
    padding: '0.75rem',
    backgroundColor: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid rgba(220, 38, 38, 0.15)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1rem',
  },
  tableStub: {
    fontSize: '0.85rem',
    fontWeight: '500',
  }
};
