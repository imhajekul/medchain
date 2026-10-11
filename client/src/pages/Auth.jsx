import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, Stethoscope, Heart, Lock, KeyRound, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Auth.css';

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  const {
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithGoogleManual,
    loading
  } = useApp();

  const initialRole = searchParams.get('role') === 'doctor' ? 'doctor' : 'patient';
  const [role, setRole] = useState(initialRole);
  const [showManualGoogle, setShowManualGoogle] = useState(false);
  const [manualGoogleEmail, setManualGoogleEmail] = useState('');
  const [manualGoogleName, setManualGoogleName] = useState('');
  const [errors, setErrors] = useState({});

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
      }
    }
  };

  const handleGoogleRedirect = async () => {
    try {
      setErrors({});
      await signInWithGoogleRedirect(role);
      navigate(role === 'doctor' ? '/doctor-access' : '/dashboard');
    } catch (err) {
      if (err.message && !err.message.includes('canceled')) {
        setErrors({ general: err.message || 'Google redirect failed' });
      }
    }
  };

  const handleManualGoogleSubmit = async (e) => {
    e.preventDefault();
    if (!manualGoogleEmail.trim() || !manualGoogleEmail.includes('@')) {
      setErrors({ manualGoogle: 'Enter a valid Google email address' });
      return;
    }
    try {
      setErrors({});
      await signInWithGoogleManual({
        email: manualGoogleEmail.trim(),
        name: manualGoogleName.trim(),
        role
      });
      navigate(role === 'doctor' ? '/doctor-access' : '/dashboard');
    } catch (err) {
      setErrors({ manualGoogle: err.message || 'Manual Google sign-in failed' });
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
              Med<span className="gradient-text">Vault</span> Access
            </h1>
            <p className="auth-brand-subtitle">
              Patient-owned, zero-knowledge encrypted medical records with Google OAuth & auto-provisioned sovereign vault.
            </p>
          </div>

          {/* Account Role Selector */}
          <div className="auth-role-selector" style={{ marginBottom: '20px' }}>
            <div className="auth-role-label">Choose Your Portal Account Type:</div>
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
                  <span className="auth-role-desc">Manage & client-side encrypt personal records</span>
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
                  <span className="auth-role-desc">Doctor portal to review granted patient records</span>
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

          {/* Primary Action: Standardized "Continue with Google" */}
          <div className="auth-google-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <motion.button
              type="button"
              className="btn-google-auth"
              onClick={handleGoogleAuth}
              disabled={loading}
              whileHover={{ scale: 1.01, boxShadow: '0 6px 20px rgba(66, 133, 244, 0.25)' }}
              whileTap={{ scale: 0.99 }}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                background: 'linear-gradient(180deg, rgba(66, 133, 244, 0.12) 0%, rgba(66, 133, 244, 0.05) 100%)'
              }}
            >
              <GoogleIcon />
              <div className="google-btn-content">
                <span className="google-btn-main" style={{ fontSize: '1rem', fontWeight: 600 }}>
                  Continue with Google
                </span>
                <span className="google-role-sub" style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  1-Click Sign-In • {role === 'doctor' ? 'Healthcare Provider' : 'Patient Vault'}
                </span>
              </div>
            </motion.button>

            {/* Secondary OAuth Helpers: Full-page redirect & manual fallback */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleGoogleRedirect}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.625rem 0.5rem',
                  borderRadius: '8px'
                }}
                title="Full-page browser redirect via Firebase signInWithRedirect"
              >
                <span>🌐 Google Redirect</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowManualGoogle(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.625rem 0.5rem',
                  borderRadius: '8px'
                }}
              >
                <span>✍️ {showManualGoogle ? 'Hide Manual' : 'Manual Google'}</span>
              </button>
            </div>

            {/* Manual Google Account Drawer */}
            <AnimatePresence>
              {showManualGoogle && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.625rem' }}>
                    Enter your verified Google email address directly:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="your.google.account@gmail.com"
                      value={manualGoogleEmail}
                      onChange={(e) => setManualGoogleEmail(e.target.value)}
                      style={{ fontSize: '0.875rem', padding: '0.625rem 0.875rem', margin: 0 }}
                    />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Display Name (optional)"
                      value={manualGoogleName}
                      onChange={(e) => setManualGoogleName(e.target.value)}
                      style={{ fontSize: '0.875rem', padding: '0.625rem 0.875rem', margin: 0 }}
                    />
                    {errors.manualGoogle && (
                      <span className="field-error" style={{ fontSize: '0.75rem' }}>
                        {errors.manualGoogle}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleManualGoogleSubmit}
                      disabled={loading}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Authenticate Google Profile
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auto-Provisioning & Security Explainer */}
          <div
            className="glass-card"
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--color-accent)' }}>
              <Sparkles size={16} />
              <strong style={{ fontSize: '0.8125rem' }}>Automatic Wallet Auto-Provisioning</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Logging in with Google securely auto-provisions and links your sovereign cryptographic Ethereum wallet (<code style={{ color: 'var(--color-primary)' }}>0x...</code>) in MongoDB. No seed phrases or manual passwords required.
            </p>
          </div>

          {/* Security Guarantee Note */}
          <div className="auth-security-note" style={{ marginTop: '1.25rem' }}>
            <CheckCircle size={14} />
            <span>
              {role === 'doctor'
                ? 'Doctor Portal: Authorized review only. All record accesses emit cryptographic audit receipts on Polygon.'
                : 'Patient Portal: Zero Plaintext Exposure. Records are encrypted client-side using AES-256-GCM before transmission.'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
