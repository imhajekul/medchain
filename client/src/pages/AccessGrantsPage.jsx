import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, X, Share2, Clock, Search,
  RefreshCw, AlertCircle, Check, Copy, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelativeTime, formatWallet, useCountdown } from '../hooks/useHelpers';
import PageLayout from '../components/layout/PageLayout';
import './AccessGrantsPage.css';

function GrantCountdown({ expiresAt }) {
  const time = useCountdown(expiresAt);
  if (time.expired) return <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Expired</span>;
  return (
    <span className="grants-countdown">
      {time.days > 0 && `${time.days}d `}{String(time.hours).padStart(2, '0')}:{String(time.minutes).padStart(2, '0')}:{String(time.seconds).padStart(2, '0')}
    </span>
  );
}

export default function AccessGrantsPage() {
  const { grants, records, loading, refreshRecords, revokeGrant, createGrant, addToast } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Grant creation inline form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [doctorWallet, setDoctorWallet] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState(86400);
  const [isCreating, setIsCreating] = useState(false);

  const expiryPresets = [
    { label: '1 Hour', value: 3600 },
    { label: '24 Hours', value: 86400 },
    { label: '7 Days', value: 604800 },
    { label: '30 Days', value: 2592000 }
  ];

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      try {
        setFetchError(null);
        await refreshRecords();
      } catch (err) {
        if (mounted) setFetchError(err.message || 'Failed to sync grants.');
      }
    };
    sync();
    return () => { mounted = false; };
  }, [refreshRecords]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      await refreshRecords();
      addToast('Access grants synchronized!', 'info');
    } catch (err) {
      setFetchError(err.message || 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateGrant = async (e) => {
    e.preventDefault();
    if (!selectedRecordId || !doctorWallet.trim()) return;
    setIsCreating(true);
    try {
      await createGrant(selectedRecordId, doctorWallet.trim(), selectedExpiry);
      setShowCreateForm(false);
      setSelectedRecordId('');
      setDoctorWallet('');
    } catch (err) {
      // toast handled by context
    } finally {
      setIsCreating(false);
    }
  };

  const filteredGrants = (grants || []).filter(g => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (g.recordLabel || '').toLowerCase().includes(q) ||
      (g.granteeWallet || '').toLowerCase().includes(q) ||
      (g.granteeName || '').toLowerCase().includes(q) ||
      (g.id || '').toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeGrants = filteredGrants.filter(g => g.status === 'active');
  const otherGrants = filteredGrants.filter(g => g.status !== 'active');

  return (
    <PageLayout
      title="Access & Sharing"
      subtitle="Manage time-boxed access grants, share records with doctors, and revoke permissions."
      icon={<Share2 size={24} />}
      breadcrumbs={[{ label: 'Access Grants' }]}
      loading={loading && grants.length === 0 && records.length === 0}
      error={fetchError}
      onRetry={handleRefresh}
      actions={
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-animation' : ''} />
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </motion.button>
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Shield size={16} />
            New Grant
          </motion.button>
        </div>
      }
    >
      {/* Inline New Grant Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            className="grants-create-form glass-card"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          >
            <h3 className="grants-create-title">
              <Shield size={18} className="text-accent" />
              Create Time-Boxed Access Grant
            </h3>
            <form onSubmit={handleCreateGrant} className="grants-create-fields">
              <div className="input-group">
                <label className="input-label">Record to Share</label>
                <select
                  className="input-field"
                  value={selectedRecordId}
                  onChange={e => setSelectedRecordId(e.target.value)}
                  required
                >
                  <option value="">Select a record...</option>
                  {(records || []).map(r => (
                    <option key={r.id || r.recordId} value={r.id || r.recordId}>
                      {r.label} ({r.fileType || 'PDF'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="input-label" style={{ margin: 0 }}>Doctor's Wallet Address</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}
                    onClick={() => setDoctorWallet('0x3e3204EbddCD8E04c7DCB127C29eC7B8208E2247')}
                  >
                    Fill Test Doctor
                  </button>
                </div>
                <input
                  type="text"
                  className="input-field"
                  placeholder="0x... doctor Ethereum address"
                  value={doctorWallet}
                  onChange={e => setDoctorWallet(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Access Duration (Auto-Expires)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {expiryPresets.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSelectedExpiry(preset.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: selectedExpiry === preset.value ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: selectedExpiry === preset.value ? 'var(--color-primary-muted, rgba(2, 132, 199, 0.2))' : 'transparent',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grants-create-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedRecordId || !doctorWallet.trim() || isCreating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isCreating ? 'Creating...' : 'Create Grant'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Bar */}
      <div className="grants-toolbar">
        <div className="records-search-wrapper">
          <Search size={16} className="records-search-icon" />
          <input
            type="text"
            className="input-field records-search-input"
            placeholder="Search grants by record, doctor, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="records-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="grants-filter-group">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="records-filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <span className="page-section-count">
            {filteredGrants.length} grant{filteredGrants.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Active Grants */}
      {grants.length === 0 ? (
        <div className="page-empty-state glass-card">
          <div className="page-empty-icon">
            <Shield size={28} />
          </div>
          <h3 className="page-empty-title">No access grants yet</h3>
          <p className="page-empty-text">
            Share records with healthcare providers by creating time-boxed access grants. They automatically expire.
          </p>
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ marginTop: '1rem' }}
          >
            <Shield size={16} />
            Create First Grant
          </motion.button>
        </div>
      ) : (
        <>
          {/* Active Grants Section */}
          {activeGrants.length > 0 && (
            <div className="page-section">
              <div className="page-section-header">
                <h3 className="page-section-title">Active Grants</h3>
                <span className="page-section-count">{activeGrants.length} active</span>
              </div>
              <div className="grants-list">
                <AnimatePresence>
                  {activeGrants.map(grant => (
                    <motion.div
                      key={grant.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="grant-row glass-card"
                      whileHover={{ borderColor: 'rgba(2, 132, 199, 0.2)' }}
                    >
                      <div className="grant-row-info">
                        <div className="grant-row-icon">
                          <Shield size={16} />
                        </div>
                        <div>
                          <p className="grant-row-record">{grant.recordLabel || 'Medical Record'}</p>
                          <p className="grant-row-meta">
                            Shared with <strong>{formatWallet(grant.granteeWallet) || grant.granteeName || 'Doctor'}</strong> • {formatRelativeTime(grant.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="grant-row-right">
                        <GrantCountdown expiresAt={grant.expiresAt} />
                        <motion.div
                          className="badge badge-accent"
                          whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(2, 132, 199, 0.4)" }}
                        >
                          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
                          Active
                        </motion.div>
                        <motion.button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => revokeGrant(grant.id)}
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          title="Revoke Access Immediately"
                        >
                          <X size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Expired / Revoked Grants */}
          {otherGrants.length > 0 && (
            <div className="page-section">
              <div className="page-section-header">
                <h3 className="page-section-title">Expired & Revoked Grants</h3>
                <span className="page-section-count">{otherGrants.length}</span>
              </div>
              <div className="grants-list">
                {otherGrants.map(grant => (
                  <div
                    key={grant.id}
                    className="grant-row glass-card"
                    style={{ opacity: 0.6 }}
                  >
                    <div className="grant-row-info">
                      <div className="grant-row-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-tertiary)' }}>
                        <Shield size={16} />
                      </div>
                      <div>
                        <p className="grant-row-record">{grant.recordLabel || 'Medical Record'}</p>
                        <p className="grant-row-meta">
                          {formatWallet(grant.granteeWallet) || 'Doctor'} • {formatRelativeTime(grant.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="grant-row-right">
                      <span className={`badge ${grant.status === 'revoked' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                        {grant.status === 'revoked' ? 'Revoked' : 'Expired'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
