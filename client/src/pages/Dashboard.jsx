import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Shield, Activity, Clock, Eye,
  ArrowRight, Plus, Lock, Search, X, AlertCircle,
  RefreshCw, Share2, Check, Copy, ExternalLink, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelativeTime, useCountdown } from '../hooks/useHelpers';
import './Dashboard.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const expiryPresets = [
  { label: '1 Hour', value: 3600 },
  { label: '24 Hours', value: 86400 },
  { label: '7 Days', value: 604800 },
  { label: '30 Days', value: 2592000 }
];

export default function Dashboard() {
  const {
    records,
    grants,
    stats,
    loading,
    refreshRecords,
    revokeGrant,
    uploadRecord,
    createGrant,
    addToast
  } = useApp();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // In-Dashboard Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // In-Dashboard Share / Grant Access Modal State
  const [selectedRecordForGrant, setSelectedRecordForGrant] = useState(null);
  const [grantDoctorWallet, setGrantDoctorWallet] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState(86400);
  const [isCreatingGrant, setIsCreatingGrant] = useState(false);
  const [confirmedGrant, setConfirmedGrant] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initial & automatic sync
  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        setFetchError(null);
        await refreshRecords();
      } catch (err) {
        console.error('[Dashboard Sync Notice]:', err);
        if (isMounted) setFetchError(err.message || 'Failed to sync latest records from network.');
      }
    };
    fetchDashboard();
    return () => { isMounted = false; };
  }, [refreshRecords]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      await refreshRecords();
      addToast('Dashboard data synchronized!', 'info');
    } catch (err) {
      console.error('[Manual Refresh Error]:', err);
      setFetchError(err.message || 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Enhanced search filtering across title, ID, fileType, storageCID
  const activeGrants = (grants || []).filter(g => g?.status === 'active');
  const filteredRecords = (records || []).filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r?.label || '').toLowerCase().includes(q) ||
      (r?.id || '').toLowerCase().includes(q) ||
      (r?.recordId || '').toLowerCase().includes(q) ||
      (r?.fileType || '').toLowerCase().includes(q) ||
      (r?.storageCID || '').toLowerCase().includes(q)
    );
  });

  // --- Quick Upload Handler ---
  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files?.[0]) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const handleFileChosen = (f) => {
    setUploadError('');
    if (!f) return;
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadError('Only PDF documents are supported for clinical records.');
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setUploadError('File size must be under 25 MB.');
      return;
    }
    setUploadFile(f);
    if (!uploadLabel) {
      setUploadLabel(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const executeUpload = async (e) => {
    e?.preventDefault();
    if (!uploadFile) {
      setUploadError('Please choose a medical record file to upload.');
      return;
    }
    const finalLabel = (uploadLabel || uploadFile.name).trim();
    if (!finalLabel) {
      setUploadError('Please provide a record name or description.');
      return;
    }

    setIsEncrypting(true);
    setUploadError('');
    try {
      const newRec = await uploadRecord(finalLabel, uploadFile);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadLabel('');
      addToast(`Record "${finalLabel}" encrypted with AES-256 and uploaded!`, 'success');
      if (newRec?.id) {
        // Automatically sync fresh data
        refreshRecords().catch(() => {});
      }
    } catch (err) {
      console.error('[Dashboard Upload Error]:', err);
      setUploadError(err.message || 'Encryption or upload failed.');
    } finally {
      setIsEncrypting(false);
    }
  };

  // --- Quick Grant Handler ---
  const handleOpenGrantModal = (record, e) => {
    e?.stopPropagation();
    setSelectedRecordForGrant(record);
    setGrantDoctorWallet('');
    setSelectedExpiry(86400);
  };

  const executeCreateGrant = async (e) => {
    e?.preventDefault();
    if (!selectedRecordForGrant || !grantDoctorWallet.trim()) return;

    setIsCreatingGrant(true);
    try {
      const recordId = selectedRecordForGrant.id || selectedRecordForGrant.recordId;
      const grant = await createGrant(recordId, grantDoctorWallet.trim(), selectedExpiry);
      setSelectedRecordForGrant(null);
      setConfirmedGrant(grant);
      addToast('Time-Boxed Access Grant registered successfully!', 'success');
    } catch (err) {
      console.error('[Grant Execution Error]:', err);
      addToast(err.message || 'Failed to create access grant', 'error');
    } finally {
      setIsCreatingGrant(false);
    }
  };

  const handleCopyLink = () => {
    const link = confirmedGrant?.shareableLink || (confirmedGrant?.id ? `${window.location.origin}/doctor-access?code=${confirmedGrant.id}` : '');
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      addToast('Doctor access link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className="dashboard page-wrapper">
        <div className="container">
          <div className="dashboard-header">
            <div className="skeleton" style={{ width: 220, height: 36 }} />
            <div className="skeleton" style={{ width: 140, height: 40 }} />
          </div>
          <div className="stats-cards">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton skeleton-card" style={{ height: 110 }} />
            ))}
          </div>
          <div className="records-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-card" style={{ height: 160 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <motion.div
        className="container"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div className="dashboard-header" variants={itemVariants}>
          <div>
            <h1 className="dashboard-title">Patient Vault Dashboard</h1>
            <p className="dashboard-subtitle">
              Sovereign, client-side AES-256 encrypted medical records & time-boxed doctor grants.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <motion.button
              type="button"
              className="btn btn-secondary"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Synchronize records with MongoDB and blockchain"
            >
              <RefreshCw size={16} className={isRefreshing ? 'spin-animation' : ''} />
              {isRefreshing ? 'Syncing...' : 'Sync Vault'}
            </motion.button>
            <motion.button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={18} />
              Upload Record
            </motion.button>
          </div>
        </motion.div>

        {/* Sync Warning Alert */}
        <AnimatePresence>
          {fetchError && (
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                borderLeft: '4px solid var(--color-danger, #ef4444)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(239, 68, 68, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertCircle size={20} style={{ color: 'var(--color-danger, #ef4444)' }} />
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Sync Warning:</strong>{' '}
                  <span style={{ color: 'var(--color-text-secondary)' }}>{fetchError}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleManualRefresh}
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div className="stats-cards" variants={itemVariants}>
          <motion.div
            className="stat-card glass-card"
            whileHover={{ y: -3, borderColor: 'rgba(2, 132, 199, 0.3)' }}
          >
            <div className="stat-card-icon stat-card-icon-accent">
              <FileText size={20} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats?.totalRecords || records.length}</span>
              <span className="stat-card-label">Total Records</span>
            </div>
          </motion.div>

          <motion.div
            className="stat-card glass-card"
            whileHover={{ y: -3, borderColor: 'rgba(59, 130, 246, 0.3)' }}
          >
            <div className="stat-card-icon stat-card-icon-blue">
              <Shield size={20} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats?.activeGrants || activeGrants.length}</span>
              <span className="stat-card-label">Active Grants</span>
            </div>
          </motion.div>

          <motion.div
            className="stat-card glass-card"
            whileHover={{ y: -3, borderColor: 'rgba(168, 85, 247, 0.3)' }}
          >
            <div className="stat-card-icon stat-card-icon-purple">
              <Eye size={20} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats?.totalAccesses || 0}</span>
              <span className="stat-card-label">Total Accesses</span>
            </div>
          </motion.div>

          <motion.div
            className="stat-card glass-card"
            whileHover={{ y: -3, borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            <div className="stat-card-icon stat-card-icon-warning">
              <Clock size={20} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats?.expiredGrants || 0}</span>
              <span className="stat-card-label">Expired Grants</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Records Section */}
        <motion.div className="dashboard-section" variants={itemVariants}>
          <div className="section-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-heading">Encrypted Medical Records</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
              {/* Real-time search bar */}
              <div className="input-group" style={{ margin: 0, maxWidth: 320, width: '100%' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search records by title, ID, tag..."
                    style={{ paddingLeft: 36, paddingRight: searchQuery ? 36 : 12, margin: 0 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
              <span className="section-count">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Upload size={32} />
              </div>
              <h3 className="empty-state-title">Upload your first record</h3>
              <p className="empty-state-text">
                Your medical records are encrypted in your browser before upload. Only you control who sees them.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <motion.button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowUploadModal(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Upload size={18} />
                  Upload Record
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/upload')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Open Upload Studio
                </motion.button>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={32} />
              </div>
              <h3 className="empty-state-title">No records matched filter</h3>
              <p className="empty-state-text">
                No encrypted records found for "{searchQuery}".
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchQuery('')}
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <motion.div className="records-grid" layout>
              <AnimatePresence>
                {filteredRecords.map((record) => {
                  const targetId = record?.id || record?.recordId;
                  const activeGrantsNum = typeof record?.activeGrants === 'number'
                    ? record.activeGrants
                    : (Array.isArray(record?.activeGrants) ? record.activeGrants.length : 0);

                  return (
                    <motion.div
                      key={targetId}
                      layout
                      className="record-card glass-card"
                      variants={itemVariants}
                      whileHover={{ y: -4, borderColor: 'rgba(2, 132, 199, 0.3)' }}
                      onClick={() => navigate(`/record/${targetId}`)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <div className="record-card-header">
                        <div className="record-card-icon">
                          <FileText size={20} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <motion.div
                            className="badge badge-success"
                            whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}
                          >
                            <Lock size={10} />
                            Encrypted
                          </motion.div>
                          <motion.button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => handleOpenGrantModal(record, e)}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.94 }}
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            title="Share with Doctor"
                          >
                            <Share2 size={12} />
                            Share
                          </motion.button>
                        </div>
                      </div>

                      <h3 className="record-card-title">{record.label}</h3>
                      <div className="record-card-meta">
                        <span>{record.fileType || 'PDF'} • {record.fileSize || 'Standard'}</span>
                        <span>{formatDate(record.createdAt)}</span>
                      </div>

                      <div className="record-card-footer">
                        <div className="record-card-grants">
                          <Shield size={14} />
                          <span>{activeGrantsNum} active grant{activeGrantsNum !== 1 ? 's' : ''}</span>
                        </div>
                        <ArrowRight size={16} className="record-card-arrow" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>

        {/* Active Access Grants Section */}
        <motion.div className="dashboard-section" variants={itemVariants}>
          <div className="section-row">
            <h2 className="section-heading">Active Access Grants</h2>
            <span className="section-count">{activeGrants.length} active</span>
          </div>

          {activeGrants.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-10) var(--space-8)' }}>
              <div className="empty-state-icon">
                <Shield size={32} />
              </div>
              <h3 className="empty-state-title">No active grants</h3>
              <p className="empty-state-text">
                When you share a record with a doctor, active grants will appear here. Click "Share" on any record above to create one.
              </p>
            </div>
          ) : (
            <motion.div className="grants-list" layout>
              <AnimatePresence>
                {activeGrants.map((grant) => (
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
                          Shared with <strong>{grant.granteeName || grant.granteeWallet || 'Doctor'}</strong> • {formatRelativeTime(grant.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="grant-row-right" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          revokeGrant(grant.id);
                        }}
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        title="Revoke Access Immediately"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* --- In-Dashboard Quick Upload Modal --- */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isEncrypting && setShowUploadModal(false)}
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
                  <Lock size={20} className="text-accent" />
                  Client-Side Encrypted Upload
                </h2>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost"
                  onClick={() => !isEncrypting && setShowUploadModal(false)}
                  disabled={isEncrypting}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={executeUpload} className="modal-body">
                {/* Dropzone */}
                <div
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragActive ? '2px dashed var(--color-primary)' : '2px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: dragActive ? 'rgba(2, 132, 199, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    marginBottom: '1rem'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
                  />
                  <div style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    <Upload size={28} style={{ margin: '0 auto' }} />
                  </div>
                  {uploadFile ? (
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.875rem' }}>{uploadFile.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        {(uploadFile.size / 1024).toFixed(1)} KB • PDF
                      </span>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Choose or drop medical PDF
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        PDF documents only • Max 25 MB
                      </span>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Record Title / Description</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Cardiology Scan, Blood Work 2026, Clinical Summary"
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    required
                  />
                </div>

                {uploadError && (
                  <div className="auth-alert-error" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                    {uploadError}
                  </div>
                )}

                <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
                  🔒 <strong>Zero Plaintext Guarantee:</strong> File is encrypted inside your browser memory using AES-256-GCM before transmission.
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={!uploadFile || isEncrypting}
                  style={{ width: '100%', justifyContent: 'center' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isEncrypting ? (
                    <span>Encrypting & Uploading...</span>
                  ) : (
                    <>
                      <Lock size={16} />
                      Encrypt & Save Record
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- In-Dashboard Direct Grant Access Modal --- */}
      <AnimatePresence>
        {selectedRecordForGrant && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isCreatingGrant && setSelectedRecordForGrant(null)}
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
                  <Share2 size={20} className="text-accent" />
                  Grant Doctor Access: {selectedRecordForGrant.label}
                </h2>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost"
                  onClick={() => setSelectedRecordForGrant(null)}
                  disabled={isCreatingGrant}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={executeCreateGrant} className="modal-body">
                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="input-label" style={{ margin: 0 }}>Doctor's Wallet Address</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}
                      onClick={() => setGrantDoctorWallet('0x3e3204EbddCD8E04c7DCB127C29eC7B8208E2247')}
                    >
                      Fill Test Doctor
                    </button>
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="0x... doctor Ethereum address"
                    value={grantDoctorWallet}
                    onChange={(e) => setGrantDoctorWallet(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Access Duration (Auto-Expires)</label>
                  <div className="expiry-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {expiryPresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        className={`expiry-option ${selectedExpiry === preset.value ? 'active' : ''}`}
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

                <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
                  ⏳ This access grant will automatically expire and be un-decryptable once the duration ends. You can revoke it manually anytime.
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={!grantDoctorWallet.trim() || isCreatingGrant}
                  style={{ width: '100%', justifyContent: 'center' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isCreatingGrant ? 'Creating Grant...' : 'Create Time-Boxed Grant'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Grant Confirmation Modal --- */}
      <AnimatePresence>
        {confirmedGrant && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmedGrant(null)}
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
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success, #10b981)' }}>
                  <Check size={20} />
                  Access Grant Created!
                </h2>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => setConfirmedGrant(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  A time-boxed key envelope has been created for your healthcare provider. Send them this link to decrypt and review the record:
                </p>

                <div className="input-group">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input-field"
                      value={confirmedGrant.shareableLink || `${window.location.origin}/doctor-access?code=${confirmedGrant.recordId || confirmedGrant.id}`}
                      readOnly
                      style={{ fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyLink}
                    >
                      {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  Recipient: <strong>{confirmedGrant.granteeWallet || 'Doctor'}</strong> • Expires: <strong>{formatRelativeTime(confirmedGrant.expiresAt)}</strong>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setConfirmedGrant(null)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
