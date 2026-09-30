import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Menu, X, LogOut, User, ChevronDown,
  LayoutDashboard, Upload, Stethoscope, Heart,
  Activity, FileText, Settings, HelpCircle, Bell, Home,
  Moon, Sun
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const { isConnected, user, disconnectWallet, theme, toggleTheme } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
          { path: '/', label: 'Home', icon: <Home size={16} /> },
          { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
          { path: '/upload', label: 'Upload', icon: <Upload size={16} /> },
        ]
      : [
          { path: '/', label: 'Home', icon: <Home size={16} /> },
          { path: '/doctor-access', label: 'Access Records', icon: <FileText size={16} /> },
        ];

  const handleDisconnect = () => {
    disconnectWallet();
    setProfileOpen(false);
    navigate('/');
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
                        <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)}>
                          <LayoutDashboard size={16} /> Dashboard
                        </Link>
                        <button className="navbar-dropdown-item">
                          <Activity size={16} /> Activity
                        </button>
                        <button className="navbar-dropdown-item">
                          <Settings size={16} /> Settings
                        </button>
                        <button className="navbar-dropdown-item">
                          <HelpCircle size={16} /> Help & Support
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
                  className="btn btn-ghost btn-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Sign In
                </motion.button>
              </Link>
              <Link to="/auth">
                <motion.button
                  className="btn btn-primary btn-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Get Started
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

            <div className="navbar-mobile-divider" />

            {isConnected && (
              <>
                <div className="navbar-mobile-divider" />
                <button className="navbar-mobile-link navbar-mobile-danger" onClick={handleDisconnect}>
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
