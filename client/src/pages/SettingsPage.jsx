import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Shield, Wallet, Moon, Sun, Copy, Check,
  ExternalLink, LogOut, Download, AlertTriangle, Key,
  Heart, Stethoscope, Sparkles, CheckCircle2, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatWallet, formatDate } from '../hooks/useHelpers';
import PageLayout from '../components/layout/PageLayout';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, isConnected, theme, toggleTheme, disconnectWallet, signOut, records, grants, addToast } = useApp();
  const navigate = useNavigate();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const handleCopyWallet = () => {
    if (!user?.walletAddress) return;
    navigator.clipboard.writeText(user.walletAddress);
    setCopiedWallet(true);
    addToast('Vault wallet address copied to clipboard!', 'success');
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleSignOut = async () => {
    await (signOut || disconnectWallet)();
    navigate('/auth?mode=signin&role=patient', { replace: true });
  };

  const handleExportProfile = () => {
    const profileData = {
      profile: {
        displayName: user?.displayName,
        email: user?.email,
        walletAddress: user?.walletAddress,
        role: user?.role,
        exportedAt: new Date().toISOString()
      },
      stats: {
        totalEncryptedRecords: records.length,
        totalAccessGrants: grants.length,
        network: 'Polygon Amoy (80002)',
        encryptionSuite: 'AES-256-GCM + ECIES-secp256k1'
      }
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profileData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medvault_profile_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Vault profile configuration exported!', 'success');
  };

  const isPatient = user?.role === 'patient';

  return (
    <PageLayout
      title="Account & Profile Settings"
      subtitle="Manage your authenticated Google profile, sovereign wallet vault, and application preferences."
      badge={{ text: isPatient ? "Patient Vault" : "Doctor Portal", type: isPatient ? "primary" : "accent" }}
      breadcrumbs={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Settings & Profile" }
      ]}
      actions={
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleExportProfile}
        >
          <Download size={15} /> Export Profile JSON
        </button>
      }
    >
      <div className="settings-container">
        {/* Profile Card */}
        <div className="glass-card settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className={`settings-avatar ${isPatient ? 'avatar-patient' : 'avatar-doctor'}`}>
                {isPatient ? <Heart size={24} /> : <Stethoscope size={24} />}
              </div>
              <div>
                <h3 className="settings-card-name">{user?.displayName || 'Authenticated User'}</h3>
                <p className="settings-card-email">{user?.email || 'OAuth Verified Account'}</p>
              </div>
            </div>
            <span className={`badge ${isPatient ? 'badge-primary' : 'badge-accent'}`} style={{ textTransform: 'uppercase', padding: '0.4rem 0.8rem' }}>
              {user?.role || 'Patient'}
            </span>
          </div>

          <div className="settings-divider" />

          <div className="settings-grid">
            <div className="settings-field">
              <label className="field-label">Account Role</label>
              <div className="field-value">
                <Shield size={16} className="field-icon text-primary" />
                <span>{isPatient ? 'Patient (Vault Owner)' : 'Licensed Healthcare Provider'}</span>
              </div>
            </div>

            <div className="settings-field">
              <label className="field-label">Authentication Method</label>
              <div className="field-value">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google OAuth / Firebase Enterprise Session</span>
              </div>
            </div>

            <div className="settings-field">
              <label className="field-label">Active Database Cluster</label>
              <div className="field-value">
                <CheckCircle2 size={16} className="field-icon text-success" />
                <span>MongoDB Cluster (Database: <code>medvault</code>)</span>
              </div>
            </div>

            <div className="settings-field">
              <label className="field-label">Security Invariant</label>
              <div className="field-value">
                <Key size={16} className="field-icon text-accent" />
                <span>Zero-Exposure Client Encryption</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sovereign Wallet Card */}
        <div className="glass-card settings-card">
          <h3 className="settings-section-title">
            <Wallet size={18} className="text-primary" />
            Auto-Provisioned Sovereign Vault Address
          </h3>
          <p className="settings-section-desc">
            Your cryptographic keypairs and access permissions are anchored to this EVM address on Polygon Amoy.
          </p>

          <div className="settings-wallet-box">
            <span className="settings-wallet-text">
              {user?.walletAddress || '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97'}
            </span>
            <div className="settings-wallet-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyWallet}
              >
                {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
                {copiedWallet ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`https://amoy.polygonscan.com/address/${user?.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                title="View on Polygonscan"
              >
                <ExternalLink size={14} /> Explorer
              </a>
            </div>
          </div>

          <div className="settings-field-row" style={{ marginTop: '1rem' }}>
            <span className="field-label">Blockchain Network</span>
            <span className="badge badge-accent">Polygon Amoy Testnet (Chain ID 80002)</span>
          </div>
        </div>

        {/* UI & Application Preferences */}
        <div className="glass-card settings-card">
          <h3 className="settings-section-title">
            <Sparkles size={18} className="text-accent" />
            Appearance & Preferences
          </h3>

          <div className="settings-preference-row">
            <div>
              <strong>Theme Mode</strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                Switch between high-contrast Dark Mode and clean Light Mode
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="settings-preference-row">
            <div>
              <strong>Background Cloud Sync</strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                Automatically synchronize records with MongoDB cluster on route navigation
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Danger Zone / Sign Out */}
        <div className="glass-card settings-card settings-danger-zone">
          <h3 className="settings-section-title text-danger">
            <LogOut size={18} />
            Session Termination
          </h3>
          <p className="settings-section-desc">
            Clears browser memory session tokens and local cryptographic state. Your encrypted records on the network remain completely safe.
          </p>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={handleSignOut}
            style={{ width: 'fit-content' }}
          >
            <LogOut size={15} /> Sign Out of MedVault
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
