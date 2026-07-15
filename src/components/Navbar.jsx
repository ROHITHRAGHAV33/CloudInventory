import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cloud, User, Menu } from 'lucide-react';

export default function Navbar({ onMenuClick }) {
  const { userProfile } = useAuth();
  const location = useLocation();

  // Convert pathname to title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/products')) return 'Product Inventory';
    if (path.startsWith('/suppliers')) return 'Supplier Directory';
    if (path.startsWith('/purchases')) return 'Purchase Orders';
    if (path.startsWith('/sales')) return 'Sales Billing (POS)';
    if (path.startsWith('/reports')) return 'Sales Analytics Reports';
    return 'Cloud Inventory';
  };

  return (
    <header style={styles.header}>
      <div style={styles.leftSection}>
        <button className="menu-btn" onClick={onMenuClick} title="Open menu">
          <Menu size={20} />
        </button>
        <h2 style={styles.pageTitle}>{getPageTitle()}</h2>
      </div>


      <div style={styles.rightSection}>
        {/* Database Mode Status Indicator */}
        <div 
          style={{
            ...styles.statusBadge,
            ...styles.cloudBadge
          }}
          title="Connected to Firebase Cloud."
        >
          <Cloud size={14} />
          <span>Firebase Connected</span>
        </div>

        {/* User profile dropdown pill */}
        {userProfile && (
          <div style={styles.profilePill}>
            <div style={styles.avatar}>
              <User size={14} color="var(--primary)" />
            </div>
            <div style={styles.profileText}>
              <span style={styles.profileEmail}>{userProfile.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '70px',
    backgroundColor: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    boxShadow: 'var(--shadow-sm)',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  pageTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-heading)',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'help',
  },
  cloudBadge: {
    backgroundColor: 'var(--success-light)',
    color: 'var(--success)',
    border: '1px solid rgba(22, 163, 74, 0.15)',
  },
  profilePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem',
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  profileEmail: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
};
