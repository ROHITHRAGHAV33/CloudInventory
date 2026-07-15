import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ShoppingCart, 
  Receipt, 
  BarChart3, 
  LogOut,
  Layers,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { logout, business, userProfile } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Products', path: '/products', icon: <Package size={20} /> },
    { name: 'Suppliers', path: '/suppliers', icon: <Truck size={20} /> },
    { name: 'Purchases', path: '/purchases', icon: <ShoppingCart size={20} /> },
    { name: 'Sales Billing', path: '/sales', icon: <Receipt size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> }
  ];

  const getBusinessBadgeClass = (type) => {
    switch (type) {
      case 'grocery': return 'badge-grocery';
      case 'medical': return 'badge-medical';
      case 'rice': return 'badge-rice';
      default: return '';
    }
  };

  const getBusinessTypeText = (type) => {
    switch (type) {
      case 'grocery': return 'Grocery Store';
      case 'medical': return 'Medical Store';
      case 'rice': return 'Rice Shop';
      default: return 'Business';
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile screens */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}

      <aside className={`sidebar-wrapper ${isOpen ? 'open' : ''}`}>
        <div style={styles.brand}>
          <Layers size={24} color="#3b82f6" />
          <span style={styles.brandText}>CloudInventory</span>
          <button className="sidebar-close-btn" onClick={onClose} title="Close menu">
            <X size={18} />
          </button>
        </div>

        {business && (
          <div style={styles.businessCard}>
            <div style={styles.businessName}>{business.name}</div>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`badge ${getBusinessBadgeClass(business.type)}`} style={styles.badgeOverride}>
                {getBusinessTypeText(business.type)}
              </span>
            </div>
          </div>
        )}

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose} // Auto-close drawer on mobile navigation clicks
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.activeNavLink : {})
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={isActive ? styles.activeIcon : styles.icon}>
                    {item.icon}
                  </span>
                  <span style={styles.navText}>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={styles.footer}>
          {userProfile && (
            <div style={styles.userInfo}>
              <div style={styles.userName}>{userProfile.name}</div>
              <div style={styles.userRole}>{userProfile.role}</div>
            </div>
          )}
          <button onClick={logout} style={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}


const styles = {
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--bg-sidebar)',
    color: '#94a3b8', // slate 400
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    borderRight: '1px solid #1e293b', // deep border
    flexShrink: 0,
  },
  brand: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 1.5rem',
    gap: '0.75rem',
    borderBottom: '1px solid #1e293b',
  },
  brandText: {
    fontWeight: '700',
    color: '#f8fafc',
    fontSize: '1.25rem',
    fontFamily: 'var(--font-heading)',
  },
  businessCard: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #1e293b',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  businessName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#f8fafc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badgeOverride: {
    fontSize: '0.7rem',
    padding: '0.15rem 0.5rem',
  },
  nav: {
    flex: 1,
    padding: '1.5rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    color: '#94a3b8',
    gap: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  activeNavLink: {
    backgroundColor: '#1e293b', // dark slate selected
    color: '#f8fafc',
  },
  icon: {
    color: '#64748b',
  },
  activeIcon: {
    color: 'var(--primary)', // dynamic color matching business theme
  },
  navText: {
    fontFamily: 'var(--font-sans)',
  },
  footer: {
    padding: '1rem 0.75rem',
    borderTop: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  userInfo: {
    padding: '0 0.5rem',
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#f8fafc',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'none',
    color: '#ef4444', // red
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background 0.15s ease',
    fontFamily: 'var(--font-sans)',
  },
};
// Add hover behaviors in CSS or standard inline styles
styles.logoutBtn[':hover'] = {
  backgroundColor: 'rgba(239, 68, 68, 0.08)',
};
