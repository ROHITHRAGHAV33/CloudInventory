import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

export default function Suppliers() {
  const { business } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [business]);

  async function loadSuppliers() {
    if (!business) return;
    try {
      setLoading(true);
      const list = await dbService.getSuppliers(business.id);
      setSuppliers(list);
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sup) => {
    setModalMode('edit');
    setEditingId(sup.id);
    setName(sup.name || '');
    setContactPerson(sup.contactPerson || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await dbService.deleteSupplier(business.id, id);
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete supplier:", err);
      alert("Failed to delete supplier.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !contactPerson.trim() || !phone.trim()) {
      return setFormError('Name, Contact Person, and Phone are required.');
    }

    const supplierPayload = {
      name,
      contactPerson,
      phone,
      email: email.trim() || 'N/A',
      address: address.trim() || 'N/A'
    };

    try {
      setFormError('');
      setIsSubmitting(true);

      if (modalMode === 'add') {
        const added = await dbService.addSupplier(business.id, supplierPayload);
        setSuppliers([...suppliers, added]);
      } else {
        const updated = await dbService.updateSupplier(business.id, editingId, supplierPayload);
        setSuppliers(suppliers.map(s => s.id === editingId ? updated : s));
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter suppliers by search query
  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery)
  );

  return (
    <div style={styles.container}>
      {/* Top search & add controls */}
      <div style={styles.controlsBar}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Name, Contact Person..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add Supplier</span>
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingText}>Fetching suppliers directory...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="card" style={styles.emptyCard}>
          <p>No suppliers registered. Click "Add Supplier" to record your vendors.</p>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <table className="classic-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(sup => (
                <tr key={sup.id}>
                  <td style={{ fontWeight: '600' }}>{sup.name}</td>
                  <td>{sup.contactPerson}</td>
                  <td>{sup.phone}</td>
                  <td>{sup.email}</td>
                  <td>{sup.address}</td>
                  <td style={styles.actionsColumn}>
                    <button 
                      style={styles.actionBtnEdit} 
                      onClick={() => openEditModal(sup)}
                      title="Edit Supplier"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      style={styles.actionBtnDelete} 
                      onClick={() => handleDelete(sup.id)}
                      title="Delete Supplier"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
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
                {modalMode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}
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
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Pharmaceuticals / Apex Rice Mills"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div className="form-group">
                  <label className="form-label">Contact Person *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Robert Smith"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. sales@vendor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 100 Main St, Suite 400"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

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
                  {isSubmitting ? 'Saving...' : 'Save Supplier'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
    maxWidth: '550px',
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
  }
};
