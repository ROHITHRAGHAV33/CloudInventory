import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Layers, AlertCircle, ShoppingBag } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('grocery'); // default
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup, currentUser } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!name.trim() || !email.trim() || !phone.trim() || !businessName.trim() || !password.trim()) {
      return setError('Please fill in all fields.');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    try {
      setError('');
      setIsLoading(true);
      await signup(email, password, name, phone, businessName, businessType);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create an account. Email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Layers size={28} color="var(--primary)" />
          </div>
          <h1 style={styles.title}>Register Business</h1>
          <p style={styles.subtitle}>Setup your cloud inventory system</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  className="form-input"
                  style={styles.inputField}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <div style={styles.inputWrapper}>
                <Phone size={18} style={styles.inputIcon} />
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="form-input"
                  style={styles.inputField}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="form-input"
                style={styles.inputField}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="businessName">Shop / Business Name</label>
              <div style={styles.inputWrapper}>
                <ShoppingBag size={18} style={styles.inputIcon} />
                <input
                  id="businessName"
                  type="text"
                  placeholder="Apex Store"
                  className="form-input"
                  style={styles.inputField}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="businessType">Business Type</label>
              <select
                id="businessType"
                className="form-select"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={isLoading}
                style={styles.selectField}
              >
                <option value="grocery">Grocery Store</option>
                <option value="medical">Medical Store</option>
                <option value="rice">Rice Shop</option>
              </select>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  placeholder="Min 6 chars"
                  className="form-input"
                  style={styles.inputField}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  className="form-input"
                  style={styles.inputField}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register Business'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Already have an account? </span>
          <Link to="/login" style={styles.loginLink}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '2rem 1rem',
    backgroundColor: 'var(--bg-app)',
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '600px', // Wider card for side-by-side elements
    padding: '2.5rem',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  logoContainer: {
    backgroundColor: 'var(--primary-light)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    display: 'inline-flex',
    marginBottom: '1rem',
    border: '1px solid rgba(37, 99, 235, 0.1)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  inputField: {
    paddingLeft: '2.25rem',
  },
  selectField: {
    height: '42px', // Match height of input fields
  },
  submitBtn: {
    width: '100%',
    marginTop: '1rem',
    padding: '0.75rem',
    fontSize: '1rem',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    backgroundColor: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid rgba(220, 38, 38, 0.15)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    textAlign: 'left',
    lineHeight: '1.4',
  },
  footer: {
    marginTop: '2rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  loginLink: {
    fontWeight: '500',
  }
};
