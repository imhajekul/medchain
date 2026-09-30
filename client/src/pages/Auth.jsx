import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Wallet, ArrowRight, User, Mail, Lock,
  Stethoscope, Heart, Eye, EyeOff, CheckCircle, ChevronLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Auth.css';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, loading } = useApp();
  const [mode, setMode] = useState('select'); // select | signin
  const [role, setRole] = useState('patient');
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
    if (!form.walletAddress.trim()) errs.walletAddress = 'Wallet address is required';
    else if (!form.walletAddress.startsWith('0x') && form.walletAddress.length < 6) {
      errs.walletAddress = 'Enter a valid wallet address or use demo';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    await signIn({
      walletAddress: form.walletAddress.trim(),
      role
    });
    navigate(role === 'patient' ? '/dashboard' : '/doctor-access');
  };

  const handleQuickDemo = async (demoRole) => {
    await signIn({ role: demoRole });
    navigate(demoRole === 'patient' ? '/dashboard' : '/doctor-access');
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
                  Patient-owned, blockchain-verified medical records. Choose how you want to continue.
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
                    onClick={() => { setRole('patient'); setMode('signin'); }}
                    whileHover={{ y: -4, borderColor: 'rgba(2, 132, 199, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-card-icon role-card-icon-patient">
                      <Heart size={24} />
                    </div>
                    <h3 className="role-card-title">I'm a Patient</h3>
                    <p className="role-card-desc">Upload records, manage grants, and track access to your medical data.</p>
                    <div className="role-card-arrow"><ArrowRight size={16} /></div>
                  </motion.button>

                  <motion.button
                    className="role-card"
                    onClick={() => { setRole('doctor'); setMode('signin'); }}
                    whileHover={{ y: -4, borderColor: 'rgba(59, 130, 246, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-card-icon role-card-icon-doctor">
                      <Stethoscope size={24} />
                    </div>
                    <h3 className="role-card-title">I'm a Doctor</h3>
                    <p className="role-card-desc">Access shared records from patients with time-boxed, verified grants.</p>
                    <div className="role-card-arrow"><ArrowRight size={16} /></div>
                  </motion.button>
                </motion.div>

                {/* Quick demo access */}
                <motion.div
                  className="auth-demo-section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="auth-divider">
                    <span>Quick Demo</span>
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
                      {loading ? 'Connecting...' : 'Demo as Patient'}
                    </motion.button>
                    <motion.button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuickDemo('doctor')}
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Stethoscope size={14} />
                      {loading ? 'Connecting...' : 'Demo as Doctor'}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' && (
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
                <ChevronLeft size={18} /> Back
              </motion.button>

              {/* Form Header */}
              <div className="auth-form-header">
                <div className={`auth-role-badge ${role === 'patient' ? 'auth-role-patient' : 'auth-role-doctor'}`}>
                  {role === 'patient' ? <Heart size={14} /> : <Stethoscope size={14} />}
                  <span>{role === 'patient' ? 'Patient' : 'Doctor'}</span>
                </div>
                <h2 className="auth-form-title">
                  Sign In
                </h2>
                <p className="auth-form-subtitle">
                  Connect your wallet to access your MedVault account.
                </p>
              </div>

              {/* Auth Form */}
              <form className="auth-form" onSubmit={handleSubmit}>
                {/* Wallet Address */}
                <div className="input-group">
                  <label className="input-label" htmlFor="wallet">
                    <Wallet size={14} /> Wallet Address
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
                      onClick={() => updateField('walletAddress', `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Generate
                    </motion.button>
                  </div>
                  {errors.walletAddress && <span className="field-error">{errors.walletAddress}</span>}
                </div>

                {/* Password (visual only — no real auth) */}
                <div className="input-group">
                  <label className="input-label" htmlFor="password">
                    <Lock size={14} /> Password
                    <span className="input-label-hint">(simulated)</span>
                  </label>
                  <div className="input-with-action">
                    <input
                      id="password"
                      className="input-field"
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
                </div>

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
                      Signing In...
                    </span>
                  ) : (
                    <>
                      Sign In with Wallet
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Security note */}
              <div className="auth-security-note">
                <Shield size={14} />
                <span>MedVault uses wallet-based authentication (SIWE). No passwords are stored. Your medical data is encrypted client-side.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
