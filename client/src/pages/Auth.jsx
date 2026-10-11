import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle, Stethoscope, Heart, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Auth.css';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signInWithGoogle, signInWithGoogleManual, loading } = useApp();

  const initialRole = searchParams.get('role') === 'doctor' ? 'doctor' : 'patient';
  const [role, setRole] = useState(initialRole);
  const [errors, setErrors] = useState({});
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => {
    const urlRole = searchParams.get('role');
    if (urlRole === 'doctor' || urlRole === 'patient') {
      setRole(urlRole);
    }
  }, [searchParams]);

  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    setSearchParams({ role: newRole });
    setErrors({});
  };

  const handleGoogleAuth = async () => {
    try {
      setErrors({});
      await signInWithGoogle(role);
      navigate(role === 'doctor' ? '/doctor-access' : '/dashboard');
    } catch (err) {
      if (err.message && !err.message.includes('canceled')) {
        setErrors({ general: err.message || 'Google authentication failed' });
        setShowManualInput(true);
      }
    }
  };

  const handleManualGoogleAuth = async (e) => {
    if (e) e.preventDefault();
    if (!manualEmail || !manualEmail.includes('@')) {
      setErrors({ manual: 'Please enter a valid Google email address.' });
      return;
    }
    try {
      setErrors({});
      await signInWithGoogleManual({ email: manualEmail, role });
      navigate(role === 'doctor' ? '/doctor-access' : '/dashboard');
    } catch (err) {
      setErrors({ manual: err.message || 'Google registration failed' });
    }
  };

  return (
    <div className="auth-page page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="container auth-container">
        <motion.div
          className="auth-panel auth-form-panel"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo & Header */}
          <div className="auth-brand" style={{ marginBottom: '24px' }}>
            <motion.div
              className="auth-brand-logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            >
              <Shield size={34} />
            </motion.div>
            <h1 className="auth-brand-title">
              Med<span className="gradient-text">Vault</span> Portal
            </h1>
            <p className="auth-brand-subtitle">
              Sovereign, client-side encrypted health records backed by MongoDB Cluster & cryptographic vault.
            </p>
          </div>

          {/* Account Role Selector */}
          <div className="auth-role-selector" style={{ marginBottom: '20px' }}>
            <div className="auth-role-label">Choose Your Portal Role:</div>
            <div className="auth-role-grid">
              <button
                type="button"
                className={`auth-role-option ${role === 'patient' ? 'selected-patient' : ''}`}
                onClick={() => handleRoleSwitch('patient')}
              >
                <div className="auth-role-icon patient-icon">
                  <Heart size={20} />
                </div>
                <div className="auth-role-text">
                  <span className="auth-role-name">Patient Account</span>
                  <span className="auth-role-desc">Personal records & client-side encryption</span>
                </div>
              </button>

              <button
                type="button"
                className={`auth-role-option ${role === 'doctor' ? 'selected-doctor' : ''}`}
                onClick={() => handleRoleSwitch('doctor')}
              >
                <div className="auth-role-icon doctor-icon">
                  <Stethoscope size={20} />
                </div>
                <div className="auth-role-text">
                  <span className="auth-role-name">Healthcare Provider</span>
                  <span className="auth-role-desc">Doctor portal to review granted records</span>
                </div>
              </button>
            </div>
          </div>

          {/* General Error Alert */}
          {errors.general && (
            <div className="auth-alert-error" style={{ marginBottom: '16px' }}>
              {errors.general}
            </div>
          )}

          {/* Primary Action: "Continue with Google" */}
          <div className="auth-google-wrapper">
            <motion.button
              type="button"
              className="btn-google-auth"
              onClick={handleGoogleAuth}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="google-icon-wrapper">
                <GoogleIcon />
              </div>
              <div className="google-btn-content">
                <span className="google-btn-main">
                  Continue with Google
                </span>
                <span className="google-role-sub">
                  1-Click Sign-In • {role === 'doctor' ? 'Doctor Portal' : 'Patient Vault'}
                </span>
              </div>
            </motion.button>

            {/* Seamless Direct Google Account Fallback */}
            {showManualInput ? (
              <form onSubmit={handleManualGoogleAuth} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textAlign: 'left' }}>
                  Direct Google Account Registration (Syncs to MongoDB Cluster0):
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.875rem' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
                    Sign In
                  </button>
                </div>
                {errors.manual && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'left' }}>{errors.manual}</div>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  marginTop: '12px',
                  textDecoration: 'underline'
                }}
              >
                Popup blocked or authorization issue? Enter Google email directly
              </button>
            )}
          </div>

          {/* Auto-Provisioning & Security Explainer */}
          <div
            className="glass-card auth-provisioning-box"
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.15rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--color-accent)' }}>
              <Sparkles size={16} />
              <strong style={{ fontSize: '0.8125rem' }}>Automatic Wallet Auto-Provisioning</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Signing in via Google securely provisions and links your sovereign cryptographic Ethereum vault wallet (<code style={{ color: 'var(--color-primary)' }}>0x...</code>) in MongoDB.
            </p>
          </div>

          {/* Security Guarantee Note */}
          <div className="auth-security-note" style={{ marginTop: '1.25rem' }}>
            <CheckCircle size={14} />
            <span>
              {role === 'doctor'
                ? 'Doctor Portal: Authorized review only. Access events emit cryptographic audit receipts on Polygon.'
                : 'Patient Portal: Zero Plaintext Exposure. Records are encrypted client-side using AES-256-GCM.'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
