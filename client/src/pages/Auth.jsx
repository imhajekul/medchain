import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Wallet, ArrowRight, User, Mail, Lock,
  Stethoscope, Heart, Eye, EyeOff, CheckCircle, ChevronLeft, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Auth.css';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, loginWithEmail, registerWithEmail, loading } = useApp();
  const [mode, setMode] = useState('select'); // select | form
  const [role, setRole] = useState('patient');
  const [authMethod, setAuthMethod] = useState('email'); // email | wallet
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    walletAddress: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (authMethod === 'email') {
      if (!form.email.trim()) {
        errs.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errs.email = 'Enter a valid email address';
      }
      if (!form.password) {
        errs.password = 'Password is required';
      } else if (form.password.length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }
    } else {
      if (!form.walletAddress.trim()) {
        errs.walletAddress = 'Wallet address is required';
      } else if (!form.walletAddress.startsWith('0x') && form.walletAddress.length < 6) {
        errs.walletAddress = 'Enter a valid 0x wallet address or use demo';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (authMethod === 'email') {
        if (isRegister) {
          await registerWithEmail(form.email.trim(), form.password, role, form.displayName.trim());
        } else {
          await loginWithEmail(form.email.trim(), form.password);
        }
      } else {
        await signIn({
          walletAddress: form.walletAddress.trim(),
          role
        });
      }
      navigate(role === 'patient' ? '/dashboard' : '/doctor-access');
    } catch (err) {
      setErrors(prev => ({ ...prev, general: err.message || 'Authentication failed' }));
    }
  };

  const handleQuickDemo = async (demoRole) => {
    const demoEmail = demoRole === 'patient' ? 'patient@medvault.io' : 'doctor@medvault.io';
    try {
      await loginWithEmail(demoEmail, 'Password123!');
      navigate(demoRole === 'patient' ? '/dashboard' : '/doctor-access');
    } catch {
      // Fallback to signature demo
      await signIn({ role: demoRole });
      navigate(demoRole === 'patient' ? '/dashboard' : '/doctor-access');
    }
  };

  const prefillDemoAccount = (demoRole) => {
    setRole(demoRole);
    setAuthMethod('email');
    setIsRegister(false);
    setForm(prev => ({
      ...prev,
      email: demoRole === 'patient' ? 'patient@medvault.io' : 'doctor@medvault.io',
      password: 'Password123!'
    }));
    setMode('form');
  };

  return (
    <div className="auth-page page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="container auth-container">
        <AnimatePresence mode="wait">
          {/* Role Selection Screen */}
          {mode === 'select' && (
            <motion.div
              key="select"
              className="auth-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Left brand area */}
              <div className="auth-brand">
                <motion.div
                  className="auth-brand-logo"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                >
                  <Shield size={32} />
                </motion.div>
                <motion.h1
                  className="auth-brand-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  Welcome to <span className="gradient-text">MedVault</span>
                </motion.h1>
                <motion.p
                  className="auth-brand-subtitle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  Patient-owned, end-to-end encrypted medical data. Authenticate via email credentials or self-sovereign Web3 wallet.
                </motion.p>

                {/* Role Cards */}
                <motion.div
                  className="role-cards"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <motion.button
                    className="role-card"
                    onClick={() => { setRole('patient'); setMode('form'); }}
                    whileHover={{ y: -4, borderColor: 'rgba(2, 132, 199, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-card-icon role-card-icon-patient">
                      <Heart size={24} />
                    </div>
                    <h3 className="role-card-title">I'm a Patient</h3>
                    <p className="role-card-desc">Upload AES-256 records, create time-boxed access grants, and audit accesses.</p>
                    <div className="role-card-arrow"><ArrowRight size={16} /></div>
                  </motion.button>

                  <motion.button
                    className="role-card"
                    onClick={() => { setRole('doctor'); setMode('form'); }}
                    whileHover={{ y: -4, borderColor: 'rgba(59, 130, 246, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-card-icon role-card-icon-doctor">
                      <Stethoscope size={24} />
                    </div>
                    <h3 className="role-card-title">I'm a Doctor</h3>
                    <p className="role-card-desc">Review records granted by patients and verify immutable on-chain audit trails.</p>
                    <div className="role-card-arrow"><ArrowRight size={16} /></div>
                  </motion.button>
                </motion.div>

                {/* Quick Evaluator Access */}
                <motion.div
                  className="auth-demo-section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="auth-divider">
                    <span>⚡ Quick 1-Click Judge Evaluation</span>
                  </div>
                  <div className="auth-demo-buttons">
                    <motion.button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuickDemo('patient')}
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Heart size={14} />
                      {loading ? 'Authenticating...' : 'Sign In as Demo Patient'}
                    </motion.button>
                    <motion.button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuickDemo('doctor')}
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Stethoscope size={14} />
                      {loading ? 'Authenticating...' : 'Sign In as Demo Doctor'}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Sign In / Register Form */}
          {mode === 'form' && (
            <motion.div
              key="form"
              className="auth-panel auth-form-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Back Button */}
              <motion.button
                className="auth-back-btn"
                onClick={() => { setMode('select'); setErrors({}); }}
                whileHover={{ x: -3 }}
              >
                <ChevronLeft size={18} /> Back to roles
              </motion.button>

              {/* Form Header */}
              <div className="auth-form-header">
                <div className={`auth-role-badge ${role === 'patient' ? 'auth-role-patient' : 'auth-role-doctor'}`}>
                  {role === 'patient' ? <Heart size={14} /> : <Stethoscope size={14} />}
                  <span>{role === 'patient' ? 'Patient Portal' : 'Healthcare Provider'}</span>
                </div>
                <h2 className="auth-form-title">
                  {isRegister ? 'Create MedVault Account' : 'Sign In to MedVault'}
                </h2>
                <p className="auth-form-subtitle">
                  {authMethod === 'email'
                    ? (isRegister ? 'Create your profile backed by PostgreSQL persistence.' : 'Enter your credentials to restore your session.')
                    : 'Cryptographically authenticate via EIP-4361 Sign-In with Ethereum.'}
                </p>
              </div>

              {/* Auth Method Toggle (Email vs Web3) */}
              <div className="auth-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--color-bg-card)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: authMethod === 'email' ? 'var(--color-primary)' : 'transparent',
                    color: authMethod === 'email' ? '#fff' : 'var(--color-text-secondary)'
                  }}
                  onClick={() => { setAuthMethod('email'); setErrors({}); }}
                >
                  <Mail size={14} /> Email & Password
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: authMethod === 'wallet' ? 'var(--color-primary)' : 'transparent',
                    color: authMethod === 'wallet' ? '#fff' : 'var(--color-text-secondary)'
                  }}
                  onClick={() => { setAuthMethod('wallet'); setErrors({}); }}
                >
                  <Wallet size={14} /> Web3 Wallet
                </button>
              </div>

              {/* General Error Alert */}
              {errors.general && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
                  {errors.general}
                </div>
              )}

              {/* Auth Form */}
              <form className="auth-form" onSubmit={handleSubmit}>
                {authMethod === 'email' ? (
                  <>
                    {/* Display Name (Register only) */}
                    {isRegister && (
                      <div className="input-group">
                        <label className="input-label" htmlFor="name">
                          <User size={14} /> Full Name
                        </label>
                        <input
                          id="name"
                          className="input-field"
                          type="text"
                          placeholder={role === 'patient' ? 'Alice Patient' : 'Dr. Sarah Smith'}
                          value={form.displayName}
                          onChange={e => updateField('displayName', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Email Address */}
                    <div className="input-group">
                      <label className="input-label" htmlFor="email">
                        <Mail size={14} /> Email Address
                      </label>
                      <input
                        id="email"
                        className={`input-field ${errors.email ? 'input-error' : ''}`}
                        type="email"
                        placeholder={role === 'patient' ? 'patient@medvault.io' : 'doctor@medvault.io'}
                        value={form.email}
                        onChange={e => updateField('email', e.target.value)}
                      />
                      {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="input-group">
                      <label className="input-label" htmlFor="password">
                        <Lock size={14} /> Password
                      </label>
                      <div className="input-with-action">
                        <input
                          id="password"
                          className={`input-field ${errors.password ? 'input-error' : ''}`}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={form.password}
                          onChange={e => updateField('password', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm input-action-btn"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    {/* Fast Fill Demo Credentials */}
                    {!isRegister && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px' }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                          onClick={() => prefillDemoAccount(role)}
                        >
                          Fill demo {role} credentials
                        </button>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                          onClick={() => setIsRegister(!isRegister)}
                        >
                          {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Wallet Address */}
                    <div className="input-group">
                      <label className="input-label" htmlFor="wallet">
                        <Wallet size={14} /> Wallet Address (EIP-4361)
                      </label>
                      <div className="input-with-action">
                        <input
                          id="wallet"
                          className={`input-field ${errors.walletAddress ? 'input-error' : ''}`}
                          type="text"
                          placeholder="0x7a3b4c5d6e..."
                          value={form.walletAddress}
                          onChange={e => updateField('walletAddress', e.target.value)}
                        />
                        <motion.button
                          type="button"
                          className="btn btn-ghost btn-sm input-action-btn"
                          onClick={() => updateField('walletAddress', `0x${Math.random().toString(16).substr(2, 40)}`)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Random 0x
                        </motion.button>
                      </div>
                      {errors.walletAddress && <span className="field-error">{errors.walletAddress}</span>}
                    </div>
                  </>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  className="btn btn-primary btn-lg auth-submit-btn"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <span className="auth-loading">
                      <motion.span
                        className="auth-spinner"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      {authMethod === 'email'
                        ? (isRegister ? 'Create Account & Continue' : 'Sign In with Password')
                        : 'Sign SIWE Challenge'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Security note */}
              <div className="auth-security-note">
                <CheckCircle size={14} />
                <span>
                  {authMethod === 'email'
                    ? 'Protected with PBKDF2 100,000-round password hashing & stateless JWT sessions.'
                    : 'Cryptographically signed via MetaMask or ephemeral sovereign keypairs.'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
