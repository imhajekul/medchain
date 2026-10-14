'use client';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Menu, X, LogOut, User, ChevronDown,
  LayoutDashboard, Upload, Stethoscope, Heart,
  Activity, FileText, Settings, HelpCircle, Bell, Home,
  Moon, Sun, Bot, Wallet as WalletIcon, Sparkles, Key, Share2
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const { isConnected, user, disconnectWallet, signOut, theme, toggleTheme, records, grants, stats, addToast } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Track scroll for navbar shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const isPatient = user?.role === 'patient';

  const navLinks = !isConnected
    ? [
        { path: '/', label: 'Home', icon: <Home size={16} /> },
      ]
    : isPatient
      ? [
          { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
          { path: '/records', label: 'Records', icon: <FileText size={16} /> },
          { path: '/records/upload', label: 'Upload', icon: <Upload size={16} /> },
          { path: '/grants', label: 'Grants', icon: <Share2 size={16} /> },
          { path: '/activity', label: 'Activity', icon: <Activity size={16} /> },
          { path: '/assistant', label: 'AI Copilot', icon: <Bot size={16} /> },
          { path: '/wallet', label: 'Wallet', icon: <WalletIcon size={16} /> },
        ]
      : [
          { path: '/doctor-access', label: 'Doctor Portal', icon: <FileText size={16} /> },
          { path: '/activity', label: 'Activity', icon: <Activity size={16} /> },
          { path: '/assistant', label: 'AI Copilot', icon: <Bot size={16} /> },
          { path: '/wallet', label: 'Wallet', icon: <WalletIcon size={16} /> },
        ];

  const handleDisconnect = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    await (signOut || disconnectWallet)();
    navigate('/auth?mode=signin&role=patient', { replace: true });
  };

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to={isConnected ? '/dashboard' : '/'} className="navbar-logo">
          <motion.div
            className="navbar-logo-icon"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Shield size={22} />
          </motion.div>
          <span className="navbar-logo-text">MedVault</span>
          {isConnected && (
            <motion.span
              className={`navbar-role-tag ${isPatient ? 'navbar-role-patient' : 'navbar-role-doctor'}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              {isPatient ? <Heart size={10} /> : <Stethoscope size={10} />}
              {isPatient ? 'Patient' : 'Doctor'}
            </motion.span>
          )}
        </Link>

        {/* Desktop Nav Links */}
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path + '/')) ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
              {(location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path + '/'))) && (
                <motion.div
                  className="navbar-link-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="navbar-right">


          {isConnected ? (
            <>
              {/* Notification bell (visual) */}
              <motion.button
                className="navbar-icon-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Notifications"
              >
                <Bell size={18} />
                <span className="navbar-notif-dot" />
              </motion.button>

              {/* Profile dropdown */}
              <div className="navbar-profile-wrapper" ref={dropdownRef}>
                <motion.button
                  className="navbar-profile"
                  onClick={() => setProfileOpen(!profileOpen)}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className={`navbar-profile-avatar ${isPatient ? 'navbar-avatar-patient' : 'navbar-avatar-doctor'}`}>
                    {isPatient ? <Heart size={14} /> : <Stethoscope size={14} />}
                  </div>
                  <div className="navbar-profile-info">
                    <span className="navbar-profile-name">{user?.displayName}</span>
                    <span className="navbar-profile-address">{user?.walletAddress}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: profileOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      className="navbar-dropdown"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="navbar-dropdown-header">
                        <div className={`navbar-dropdown-avatar ${isPatient ? 'navbar-avatar-patient' : 'navbar-avatar-doctor'}`}>
                          {isPatient ? <Heart size={18} /> : <Stethoscope size={18} />}
                        </div>
                        <div>
                          <p className="navbar-dropdown-name">{user?.displayName}</p>
                          <p className="navbar-dropdown-wallet">{user?.walletAddress}</p>
                          {user?.email && <p className="navbar-dropdown-email">{user.email}</p>}
                        </div>
                      </div>

                      <div className="navbar-dropdown-divider" />

                      <div className="navbar-dropdown-section">
                        {isPatient ? (
                          <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                            <LayoutDashboard size={16} /> Patient Dashboard
                          </Link>
                        ) : (
                          <Link to="/doctor-access" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                            <FileText size={16} /> Doctor Portal
                          </Link>
                        )}
                        <Link to="/assistant" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                          <Bot size={16} /> AI Health Copilot
                        </Link>
                        <Link to="/wallet" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                          <WalletIcon size={16} /> My Sovereign Wallet
                        </Link>
                        <Link to="/activity" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                          <Activity size={16} /> Activity & Audit Log
                        </Link>
                        <Link to="/security" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                          <Key size={16} /> Key Management & Security
                        </Link>
                        <Link to="/settings" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                          <Settings size={16} /> Settings & Profile
                        </Link>
                        <button
                          type="button"
                          className="navbar-dropdown-item"
                          onClick={() => { setProfileOpen(false); setSupportModalOpen(true); }}
                        >
                          <HelpCircle size={16} /> Help & Security Guide
                        </button>
                      </div>

                      <div className="navbar-dropdown-divider" />

                      <div className="navbar-dropdown-section">
                        <button className="navbar-dropdown-item navbar-dropdown-danger" onClick={handleDisconnect}>
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="navbar-auth-buttons">
              <Link to="/auth">
                <motion.button
                  className="btn btn-primary btn-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.85rem' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Sign In / Register
                </motion.button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <motion.button
            className="navbar-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={22} />
                </motion.div>
              ) : (
                <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu size={22} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="navbar-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {isConnected && (
              <>
                <div className="navbar-mobile-user">
                  <div className={`navbar-mobile-avatar ${isPatient ? 'navbar-avatar-patient' : 'navbar-avatar-doctor'}`}>
                    {isPatient ? <Heart size={16} /> : <Stethoscope size={16} />}
                  </div>
                  <div>
                    <p className="navbar-mobile-name">{user?.displayName}</p>
                    <p className="navbar-mobile-wallet">{user?.walletAddress}</p>
                  </div>
                </div>
                <div className="navbar-mobile-divider" />
              </>
            )}

            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`navbar-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}

            {!isConnected && (
              <Link
                to="/auth"
                className="navbar-mobile-link"
                style={{ color: 'var(--color-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => setMobileOpen(false)}
              >
                <Shield size={16} /> Continue with Google
              </Link>
            )}

            <div className="navbar-mobile-divider" />

            {isConnected && (
              <>
                <Link
                  to="/activity"
                  className="navbar-mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <Activity size={16} /> Activity & Audit Log
                </Link>
                <Link
                  to="/security"
                  className="navbar-mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <Key size={16} /> Key Management & Security
                </Link>
                <Link
                  to="/settings"
                  className="navbar-mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <Settings size={16} /> Settings & Profile
                </Link>
                <button
                  type="button"
                  className="navbar-mobile-link"
                  onClick={() => { setMobileOpen(false); setSupportModalOpen(true); }}
                >
                  <HelpCircle size={16} /> Help & Security Guide
                </button>
                <div className="navbar-mobile-divider" />
                <button className="navbar-mobile-link navbar-mobile-danger" onClick={handleDisconnect}>
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Activity & Audit Log Modal --- */}
      <AnimatePresence>
        {activityModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivityModalOpen(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="modal-content glass-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 540 }}
            >
              <div className="modal-header">
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} className="text-accent" />
                  Account Activity & Audit Feed
                </h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setActivityModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{stats?.totalRecords || records.length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Encrypted Records</div>
                  </div>
                  <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent)' }}>{stats?.activeGrants || grants.filter(g => g.status === 'active').length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Active Grants</div>
                  </div>
                  <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success, #10b981)' }}>100%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Zero Plaintext</div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Security Events:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Shield size={16} style={{ color: 'var(--color-primary)' }} />
                    <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                      <strong>Google OAuth Session Verified</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Linked to vault {user?.walletAddress ? `${user.walletAddress.substring(0, 8)}...` : '0x...'}</div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>
                  </div>

                  {records.slice(0, 3).map(rec => (
                    <div key={rec.id} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={16} style={{ color: 'var(--color-accent)' }} />
                      <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                        <strong>Encrypted Record: {rec.label}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>CID: {rec.storageCID ? `${rec.storageCID.substring(0, 14)}...` : 'Qmfb...'}</div>
                      </div>
                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>AES-256</span>
                    </div>
                  ))}

                  {grants.slice(0, 3).map(g => (
                    <div key={g.id} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Activity size={16} style={{ color: 'var(--color-warning, #f59e0b)' }} />
                      <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                        <strong>Access Grant Created</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Recipient: {g.granteeWallet ? `${g.granteeWallet.substring(0, 8)}...` : 'Doctor'}</div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Time-Boxed</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Settings & Profile Modal --- */}
      <AnimatePresence>
        {settingsModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsModalOpen(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="modal-content glass-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 500 }}
            >
              <div className="modal-header">
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={20} className="text-accent" />
                  Account Settings & Vault Profile
                </h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setSettingsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Authenticated Google Profile</label>
                  <input
                    className="input-field"
                    value={user?.email || 'Authenticated Google User'}
                    readOnly
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Auto-Provisioned Sovereign Wallet Vault</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input-field"
                      value={user?.walletAddress || '0x...'}
                      readOnly
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (user?.walletAddress) {
                          navigator.clipboard.writeText(user.walletAddress);
                          setCopiedWallet(true);
                          addToast('Wallet address copied to clipboard!', 'success');
                          setTimeout(() => setCopiedWallet(false), 2000);
                        }
                      }}
                    >
                      {copiedWallet ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Portal Account Role</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-accent" style={{ textTransform: 'uppercase', padding: '0.4rem 0.8rem' }}>
                      {user?.role || 'Patient'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      Managed via MongoDB cluster & Firebase
                    </span>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Theme Mode</label>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={toggleTheme}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}
                  >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>

                <div className="glass-card" style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  Blockchain Network: <strong>Polygon Amoy (Chain ID 80002)</strong> • Database: <strong>MongoDB Cluster</strong>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Help & Support Modal --- */}
      <AnimatePresence>
        {supportModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSupportModalOpen(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="modal-content glass-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 520 }}
            >
              <div className="modal-header">
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={20} className="text-accent" />
                  MedVault Help & Security Guide
                </h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setSupportModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>1. How are records encrypted?</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>
                    Your files are encrypted inside your browser memory using 256-bit AES-GCM before upload. Neither MedVault servers nor storage nodes ever see your unencrypted data.
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>2. How do doctors view records?</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>
                    When you create an Access Grant, a dedicated encrypted key envelope is registered for that doctor. When they open the doctor portal, their browser fetches and decrypts the file in-memory.
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>3. What is Time-Boxed Expiry?</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>
                    Grants automatically expire after your chosen duration (1h, 24h, 7d). You can also click Revoke anytime to revoke access immediately.
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>4. Need AI Copilot assistance?</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>
                    Click <strong>AI Copilot</strong> in the top navigation or use the floating assistant widget at the bottom-right corner for clinical guidance and questions.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
