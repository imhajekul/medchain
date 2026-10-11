import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Wallet, ArrowRight, User, Mail, Lock,
  Stethoscope, Heart, Eye, EyeOff, CheckCircle
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
  const { signIn, loginWithEmail, registerWithEmail, signInWithGoogle, loading } = useApp();

  // Read URL query parameters (?mode=register or ?mode=signin, ?role=patient or ?role=doctor)
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'signin';
  const initialRole = searchParams.get('role') === 'doctor' ? 'doctor' : 'patient';

  const [activeTab, setActiveTab] = useState(initialMode); // 'signin' | 'register'
  const [role, setRole] = useState(initialRole); // 'patient' | 'doctor'
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'wallet'
  const [showPassword, setShowPassword] = useState(false);

  // Sync with search params if they change
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'register' || urlMode === 'signin') {
      setActiveTab(urlMode);
    }
    const urlRole = searchParams.get('role');
    if (urlRole === 'doctor' || urlRole === 'patient') {
      setRole(urlRole);
    }
  }, [searchParams]);

  // Clean form fields (strictly no prefilled defaults)
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
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchParams({ mode: tab, role });
    setErrors({});
  };

  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    setSearchParams({ mode: activeTab, role: newRole });
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    if (authMethod === 'email') {
      if (activeTab === 'register' && !form.displayName.trim()) {
        errs.displayName = 'Full name is required';
      }
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
      } else if (!form.walletAddress.startsWith('0x') || form.walletAddress.length < 10) {
        errs.walletAddress = 'Enter a valid 0x Ethereum address';
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
        if (activeTab === 'register') {
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
      // Differentiated routing based on account role
      navigate(role === 'doctor' ? '/doctor-access' : '/dashboard');
    } catch (err) {
      setErrors(prev => ({ ...prev, general: err.message || 'Authentication failed' }));
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setErrors({});
      await signInWithGoogle(role);
      // Differentiated routing based on account role
      navigate(role === 'doctor' ? '/doctor-access' : '/dashboard');
    } catch (err) {
      if (err.message && !err.message.includes('canceled')) {
        setErrors(prev => ({ ...prev, general: err.message || 'Google authentication failed' }));
      }
    }
  };

  const isRegister = activeTab === 'register';

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
          <div className="auth-brand" style={{ marginBottom: '20px' }}>
            <motion.div
              className="auth-brand-logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            >
              <Shield size={32} />
            </motion.div>
            <h1 className="auth-brand-title">
              Med<span className="gradient-text">Vault</span> Access
            </h1>
            <p className="auth-brand-subtitle">
              Patient-owned, zero-knowledge encrypted medical records.
            </p>
          </div>

          {/* Primary Top Tabs: [Sign In] vs [Register / Create Account] */}
          <div className="auth-main-tabs" role="tablist" aria-label="Authentication Options">
            <button
              type="button"
              className={`auth-main-tab ${!isRegister ? 'active' : ''}`}
              onClick={() => handleTabSwitch('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-main-tab ${isRegister ? 'active' : ''}`}
              onClick={() => handleTabSwitch('register')}
            >
              Create Account
            </button>
          </div>

          {/* Role Selector: Separate Patient vs Doctor */}
          <div className="auth-role-selector">
            <div className="auth-role-label">Select Account Type:</div>
            <div className="auth-role-grid">
              <button
                type="button"
                className={`auth-role-option ${role === 'patient' ? 'selected-patient' : ''}`}
                onClick={() => handleRoleSwitch('patient')}
              >
                <div className="auth-role-icon patient-icon">
                  <Heart size={18} />
                </div>
                <div className="auth-role-text">
                  <span className="auth-role-name">Patient Account</span>
                  <span className="auth-role-desc">Own & encrypt your medical records</span>
                </div>
              </button>

              <button
                type="button"
                className={`auth-role-option ${role === 'doctor' ? 'selected-doctor' : ''}`}
                onClick={() => handleRoleSwitch('doctor')}
              >
                <div className="auth-role-icon doctor-icon">
                  <Stethoscope size={18} />
                </div>
                <div className="auth-role-text">
                  <span className="auth-role-name">Healthcare Provider</span>
                  <span className="auth-role-desc">Doctor portal to review granted records</span>
                </div>
              </button>
            </div>
          </div>

          {/* One-Click Firebase Google Registration & Authentication */}
          <div className="auth-google-wrapper">
            <motion.button
              type="button"
              className="btn-google-auth"
              onClick={handleGoogleAuth}
              disabled={loading}
              whileHover={{ scale: 1.01, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
              whileTap={{ scale: 0.99 }}
            >
              <GoogleIcon />
              <div className="google-btn-content">
                <span className="google-btn-main">
                  {isRegister ? '1-Click Register with Google' : '1-Click Sign In with Google'}
                </span>
                <span className="google-role-sub">
                  Firebase Auth • {role === 'doctor' ? 'Healthcare Provider' : 'Patient Portal'}
                </span>
              </div>
            </motion.button>
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <span>Or continue with credentials</span>
          </div>

          {/* Auth Method Selector (Email & Password vs Web3 Wallet) */}
          <div className="auth-method-tabs">
            <button
              type="button"
              className={`auth-method-tab ${authMethod === 'email' ? 'active' : ''}`}
              onClick={() => { setAuthMethod('email'); setErrors({}); }}
            >
              <Mail size={14} /> Email & Password
            </button>
            <button
              type="button"
              className={`auth-method-tab ${authMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => { setAuthMethod('wallet'); setErrors({}); }}
            >
              <Wallet size={14} /> Web3 Wallet
            </button>
          </div>

          {/* General Error Alert */}
          {errors.general && (
            <div className="auth-alert-error">
              {errors.general}
            </div>
          )}

          {/* Authentication Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {authMethod === 'email' ? (
              <>
                {/* Full Name (Only on Registration) */}
                {isRegister && (
                  <div className="input-group">
                    <label className="input-label" htmlFor="name">
                      <User size={14} /> Full Name
                    </label>
                    <input
                      id="name"
                      className={`input-field ${errors.displayName ? 'input-error' : ''}`}
                      type="text"
                      placeholder={role === 'doctor' ? 'Dr. Sarah Smith' : 'Alex Morgan'}
                      value={form.displayName}
                      onChange={e => updateField('displayName', e.target.value)}
                      autoComplete="name"
                    />
                    {errors.displayName && <span className="field-error">{errors.displayName}</span>}
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
                    placeholder={role === 'doctor' ? 'dr.smith@hospital.org' : 'alex@example.com'}
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    autoComplete="email"
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
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={e => updateField('password', e.target.value)}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm input-action-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <span className="field-error">{errors.password}</span>}
                </div>
              </>
            ) : (
              <>
                {/* Web3 Wallet Address */}
                <div className="input-group">
                  <label className="input-label" htmlFor="wallet">
                    <Wallet size={14} /> Ethereum Wallet Address (EIP-4361)
                  </label>
                  <div className="input-with-action">
                    <input
                      id="wallet"
                      className={`input-field ${errors.walletAddress ? 'input-error' : ''}`}
                      type="text"
                      placeholder="0x..."
                      value={form.walletAddress}
                      onChange={e => updateField('walletAddress', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm input-action-btn"
                      onClick={() => updateField('walletAddress', `0x${Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`)}
                    >
                      Generate Key
                    </button>
                  </div>
                  {errors.walletAddress && <span className="field-error">{errors.walletAddress}</span>}
                </div>
              </>
            )}

            {/* Submit Action */}
            <motion.button
              type="submit"
              className="btn btn-primary btn-lg auth-submit-btn"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loading ? (
                <span className="auth-loading">
                  <motion.span
                    className="auth-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Processing...
                </span>
              ) : (
                <>
                  {authMethod === 'email' ? (
                    isRegister
                      ? `Create ${role === 'doctor' ? 'Doctor' : 'Patient'} Account`
                      : `Sign In as ${role === 'doctor' ? 'Healthcare Provider' : 'Patient'}`
                  ) : (
                    'Verify Wallet Signature'
                  )}
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle between Register and Sign In */}
          <div className="auth-toggle-footer">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => handleTabSwitch('signin')}
                >
                  Sign In here
                </button>
              </p>
            ) : (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => handleTabSwitch('register')}
                >
                  Create Account / Register
                </button>
              </p>
            )}
          </div>

          {/* Security Guarantee Note */}
          <div className="auth-security-note">
            <CheckCircle size={14} />
            <span>
              {role === 'doctor'
                ? 'Doctor Portal: Authorized access only. All patient record reviews generate cryptographic audit events.'
                : 'Patient Portal: Zero Data Exposure. Health data is encrypted on your device with AES-256-GCM before upload.'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
