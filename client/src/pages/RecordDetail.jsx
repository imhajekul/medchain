import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Lock, Shield, Clock, Copy, Check, Share2,
  Activity, X, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCountdown, formatDate, formatRelativeTime } from '../hooks/useHelpers';
import { api } from '../services/api';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import './RecordDetail.css';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const expiryPresets = [
  { label: '1 Hour', value: 3600 },
  { label: '24 Hours', value: 86400 },
  { label: '7 Days', value: 604800 },
  { label: '30 Days', value: 2592000 }
];

function RecordDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, authLoading, getRecordGrants, getRecordAuditEvents, createGrant, addToast } = useApp();

  const [record, setRecord] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [liveAuditEvents, setLiveAuditEvents] = useState([]);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newGrant, setNewGrant] = useState(null);

  // 1. Fetch & Hydrate Record Data
  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setFetching(false);
      setFetchError('No record ID specified in the URL.');
      return;
    }

    async function resolveRecord() {
      // Check existing context state first
      const existing = records?.find(r => r?.id === id || r?.recordId === id);
      if (existing) {
        setRecord(existing);
        setFetching(false);
      }

      // Fetch fresh data from backend API
      try {
        const fresh = await api.getRecordById(id);
        if (isMounted && fresh) {
          const grantsArray = Array.isArray(fresh.activeGrants) ? fresh.activeGrants : [];
          setRecord(prev => ({
            ...(prev || {}),
            id: fresh.recordId || id,
            label: fresh.label || prev?.label || 'Medical Health Record',
            storageCID: fresh.storageCID || prev?.storageCID || 'N/A',
            createdAt: fresh.createdAt || prev?.createdAt,
            activeGrants: typeof fresh.activeGrants === 'number' ? fresh.activeGrants : grantsArray.length,
            grantsList: grantsArray,
            fileType: prev?.fileType || 'PDF',
            fileSize: prev?.fileSize || 'Standard',
            status: prev?.status || 'encrypted'
          }));
          setFetchError(null);
        }
      } catch (err) {
        if (!existing && isMounted) {
          console.warn('[RecordDetail] Direct fetch note:', err.message);
          if (!authLoading) {
            setFetchError(err.message || 'Record not found or access denied.');
          }
        }
      } finally {
        if (isMounted) {
          setFetching(false);
        }
      }
    }

    resolveRecord();
    return () => { isMounted = false; };
  }, [id, records, authLoading]);

  // 2. Fetch Audit Events
  useEffect(() => {
    let isMounted = true;
    if (id && getRecordAuditEvents) {
      Promise.resolve(getRecordAuditEvents(id))
        .then(evts => {
          if (isMounted && Array.isArray(evts)) {
            setLiveAuditEvents(evts);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [id, getRecordAuditEvents]);

  // Combine context grants and API grants safely
  const contextGrants = (id && getRecordGrants) ? getRecordGrants(id) : [];
  const recordGrants = (contextGrants && contextGrants.length > 0)
    ? contextGrants
    : (record?.grantsList || []);

  const auditEvents = Array.isArray(liveAuditEvents) ? liveAuditEvents : [];

  const handleGrantCreated = (grant) => {
    setNewGrant(grant);
    setShowGrantModal(false);
    setShowConfirmation(true);
    // Refresh record activeGrants count
    setRecord(prev => prev ? {
      ...prev,
      activeGrants: (typeof prev.activeGrants === 'number' ? prev.activeGrants : 0) + 1
    } : prev);
  };

  // Loading State
  if (authLoading || (fetching && !record)) {
    return (
      <div className="record-detail page-wrapper">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <motion.div
            className="auth-spinner"
            style={{ width: '40px', height: '40px', margin: '0 auto 16px', borderTopColor: 'var(--color-primary)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Decrypting Record Metadata...</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Verifying your sovereign on-chain ownership.</p>
        </div>
      </div>
    );
  }

  // Record Not Found State
  if (!record) {
    return (
      <div className="record-detail page-wrapper">
        <div className="container">
          <div className="empty-state glass-card" style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
            <div className="empty-state-icon" style={{ margin: '0 auto 16px' }}><FileText size={36} /></div>
            <h3 className="empty-state-title" style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Record Not Found</h3>
            <p className="empty-state-text" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              {fetchError || `Medical record with ID "${id}" could not be located or you don't have access.`}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeGrantsDisplayCount = typeof record.activeGrants === 'number'
    ? record.activeGrants
    : (Array.isArray(record.activeGrants) ? record.activeGrants.length : recordGrants.length);

  return (
    <div className="record-detail page-wrapper">
      <div className="bg-orb bg-orb-1" />

      <motion.div
        className="container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.button
          className="btn btn-ghost upload-back"
          onClick={() => navigate('/dashboard')}
          whileHover={{ x: -3 }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </motion.button>

        {/* Record Header */}
        <motion.div
          className="record-header glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="record-header-top">
            <div className="record-header-icon">
              <FileText size={24} />
            </div>
            <div className="record-header-info">
              <h1 className="record-header-title">{record.label || 'Medical Record'}</h1>
              <div className="record-header-meta">
                <motion.span
                  className="badge badge-success"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}
                >
                  <Lock size={10} /> Encrypted
                </motion.span>
                <span>{record.fileType || 'PDF'} • {record.fileSize || 'Standard'}</span>
                <span>Uploaded {formatDate(record.createdAt)}</span>
              </div>
            </div>
            <motion.button
              className="btn btn-primary"
              onClick={() => setShowGrantModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Share2 size={16} />
              Grant Access
            </motion.button>
          </div>

          <div className="record-header-details">
            <div className="detail-item">
              <span className="detail-label">Storage CID</span>
              <code className="detail-value">{record.storageCID || 'N/A'}</code>
            </div>
            <div className="detail-item">
              <span className="detail-label">Active Grants</span>
              <span className="detail-value">{activeGrantsDisplayCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {record.status || 'encrypted'}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="record-grid">
          {/* Grants Section */}
          <motion.div
            className="record-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="section-row">
              <h2 className="section-heading">
                <Shield size={18} />
                Access Grants
              </h2>
              <span className="section-count">{recordGrants.length} total</span>
            </div>

            {recordGrants.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
                <div className="empty-state-icon"><Shield size={28} /></div>
                <h3 className="empty-state-title">No grants yet</h3>
                <p className="empty-state-text">Grant a doctor time-boxed access to this record.</p>
              </div>
            ) : (
              <div className="grants-detail-list">
                {recordGrants.map((grant, i) => (
                  <GrantCard key={grant?.id || grant?.grantId || i} grant={grant} index={i} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Audit Log Section */}
          <motion.div
            className="record-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="section-row">
              <h2 className="section-heading">
                <Activity size={18} />
                Audit Log
              </h2>
              <span className="section-count">{auditEvents.length} events</span>
            </div>

            {auditEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
                <div className="empty-state-icon"><Activity size={28} /></div>
                <h3 className="empty-state-title">No events yet</h3>
                <p className="empty-state-text">On-chain audit events will appear here.</p>
              </div>
            ) : (
              <div className="audit-timeline">
                {auditEvents.map((event, i) => {
                  const eventType = String(event?.eventType || event?.action || 'accessed').toLowerCase();
                  return (
                    <motion.div
                      key={event?.id || event?.txHash || i}
                      className="audit-event"
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className={`audit-event-dot audit-dot-${eventType}`} />
                      <div className="audit-event-content">
                        <div className="audit-event-header">
                          <motion.span
                            className={`badge badge-${
                              eventType === 'issued' ? 'accent' :
                              eventType === 'accessed' ? 'blue' : 'warning'
                            }`}
                          >
                            {eventType === 'issued' ? 'Grant Issued' :
                             eventType === 'accessed' ? 'Record Accessed' :
                             eventType === 'revoked' ? 'Grant Revoked' : 'Audit Event'}
                          </motion.span>
                          <span className="audit-event-time">
                            {formatRelativeTime(event?.timestamp || event?.blockTimestamp)}
                          </span>
                        </div>
                        <p className="audit-event-actor">
                          {eventType === 'issued'
                            ? <>By <strong>{event?.actorName || event?.actorAddress || 'Owner'}</strong> → <strong>{event?.targetName || 'Doctor'}</strong></>
                            : eventType === 'accessed'
                              ? <>By <strong>{event?.actorName || event?.actorAddress || 'Healthcare Provider'}</strong></>
                              : <>Action on <strong>{event?.recordIdHex || id}</strong></>
                          }
                        </p>
                        <div className="audit-event-tx">
                          <code>{event?.txHash || '0x...'}</code>
                          <ExternalLink size={12} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Grant Access Modal */}
      <AnimatePresence>
        {showGrantModal && (
          <GrantModal
            recordId={id}
            onClose={() => setShowGrantModal(false)}
            onCreated={handleGrantCreated}
          />
        )}
      </AnimatePresence>

      {/* Grant Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && newGrant && (
          <GrantConfirmation
            grant={newGrant}
            onClose={() => { setShowConfirmation(false); setNewGrant(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Grant Card --- */
function GrantCard({ grant }) {
  const expiryDate = grant?.expiresAt || grant?.validTo;
  const timeLeft = useCountdown(expiryDate);
  const isActive = (grant?.status === 'active' || !grant?.isRevoked) && !timeLeft.expired;

  return (
    <motion.div
      className="grant-detail-card glass-card"
      whileHover={{ borderColor: 'rgba(2, 132, 199, 0.2)' }}
    >
      <div className="grant-detail-top">
        <div className="grant-detail-info">
          <p className="grant-detail-grantee">{grant?.granteeName || 'Healthcare Provider'}</p>
          <p className="grant-detail-wallet">{grant?.granteeWallet || grant?.granteeAddress || '0x...'}</p>
        </div>
        <motion.div
          className={`badge ${isActive ? 'badge-success' : 'badge-warning'}`}
          whileHover={{ scale: 1.05 }}
        >
          {isActive && <span className="pulse-dot" style={{ width: 6, height: 6 }} />}
          {isActive ? 'Active' : 'Expired'}
        </motion.div>
      </div>
      {isActive && (
        <div className="grant-detail-countdown">
          <Clock size={14} />
          <span>
            Expires in {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        </div>
      )}
      <div className="grant-detail-meta">
        <span>Created {formatRelativeTime(grant?.createdAt || grant?.validFrom)}</span>
      </div>
    </motion.div>
  );
}

/* --- Grant Access Modal --- */
function GrantModal({ recordId, onClose, onCreated }) {
  const { createGrant, loading, addToast } = useApp();
  const [granteeWallet, setGranteeWallet] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState(86400);
  const [customHours, setCustomHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!granteeWallet.trim()) return;
    const expiry = selectedExpiry || (parseInt(customHours, 10) * 3600);
    if (!expiry || expiry <= 0 || isNaN(expiry)) {
      addToast?.('Please specify a valid access duration limit.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const grant = await createGrant(recordId, granteeWallet.trim(), expiry);
      onCreated(grant);
    } catch (err) {
      console.error('[Grant Creation Error]:', err);
      addToast?.(err.message || 'Failed to create access grant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <Share2 size={20} />
            Grant Doctor Access
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="grantee-wallet">Recipient Doctor Wallet Address</label>
            <input
              id="grantee-wallet"
              className="input-field"
              type="text"
              placeholder="0x... doctor wallet or identifier"
              value={granteeWallet}
              onChange={e => setGranteeWallet(e.target.value)}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Access Duration (Auto-Expires)</label>
            <div className="expiry-grid">
              {expiryPresets.map(preset => (
                <motion.button
                  key={preset.label}
                  type="button"
                  className={`expiry-option ${selectedExpiry === preset.value ? 'active' : ''}`}
                  onClick={() => setSelectedExpiry(preset.value)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {preset.label}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {selectedExpiry === null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Enter custom hours"
                    value={customHours}
                    onChange={e => setCustomHours(e.target.value)}
                    min="1"
                    style={{ marginTop: 'var(--space-3)' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="modal-info">
            <Shield size={16} />
            <p>Creates a cryptographic on-chain access grant. The recipient can decrypt and review this record until the time-box expires.</p>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={!granteeWallet.trim() || loading || isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading || isSubmitting ? 'Registering Grant On-Chain...' : 'Create Time-Boxed Grant'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* --- Grant Confirmation --- */
function GrantConfirmation({ grant, onClose }) {
  const [copied, setCopied] = useState(false);
  const expiryDate = grant?.expiresAt || grant?.validTo;
  const timeLeft = useCountdown(expiryDate);
  const shareLink = grant?.shareableLink || (grant?.id ? `${window.location.origin}/doctor-access?code=${grant.id}` : '');

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <Check size={20} />
            Access Grant Registered!
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body confirmation-body">
          <motion.div
            className="confirmation-success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
          >
            <div className="confirmation-check">
              <Check size={32} />
            </div>
          </motion.div>

          <div className="confirmation-countdown">
            <Clock size={16} />
            <span>
              Expires in {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
              {timeLeft.hours}h {timeLeft.minutes}m
            </span>
          </div>

          <div className="confirmation-details">
            <div className="confirmation-detail">
              <span className="detail-label">Recipient</span>
              <span className="detail-value">{grant?.granteeWallet || grant?.granteeAddress || 'Doctor'}</span>
            </div>
            <div className="confirmation-detail">
              <span className="detail-label">Grant ID</span>
              <code className="detail-value">{grant?.id || grant?.grantId || 'grant_id'}</code>
            </div>
          </div>

          <div className="confirmation-link">
            <label className="input-label">Doctor Access Link</label>
            <div className="link-copy-row">
              <input
                className="input-field"
                value={shareLink}
                readOnly
              />
              <motion.button
                className="btn btn-secondary"
                onClick={handleCopy}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
            </div>
            <p className="link-hint">Send this secure link to your healthcare provider to allow in-browser decryption.</p>
          </div>

          <motion.button
            className="btn btn-primary"
            onClick={onClose}
            style={{ width: '100%' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function RecordDetail() {
  return (
    <ErrorBoundary title="Record View Error">
      <RecordDetailContent />
    </ErrorBoundary>
  );
}
