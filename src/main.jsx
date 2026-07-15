import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { firebaseInitError } from './firebase.js'

if (firebaseInitError) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '2.5rem',
          borderRadius: '12px',
          border: '1px solid #ef4444',
          maxWidth: '520px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          textAlign: 'left'
        }}>
          <h2 style={{ color: '#ef4444', marginTop: 0, fontSize: '1.5rem', marginBottom: '1rem' }}>
            Firebase Configuration Error
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {firebaseInitError}
          </p>
          <div style={{ 
            borderTop: '1px solid #334155', 
            paddingTop: '1.25rem', 
            color: '#94a3b8', 
            fontSize: '0.85rem',
            lineHeight: '1.5'
          }}>
            <p style={{ fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}>Steps to resolve:</p>
            <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
              <li>Ensure you have a <code>.env</code> file in your project's root folder.</li>
              <li>Verify the file contains valid keys starting with <code>VITE_FIREBASE_</code>.</li>
              <li>Restart your development server (<code>npm run dev</code>).</li>
            </ol>
          </div>
        </div>
      </div>
    </StrictMode>
  )
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
