import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Lock, Shield, Clock, Eye, Copy, Check, Share2,
  Activity, X, ExternalLink, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCountdown, formatDate, formatDateTime, formatRelativeTime } from '../hooks/useHelpers';
import { expiryPresets } from '../data/mockData';
import './RecordDetail.css';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, getRecordGrants, getRecordAuditEvents, createGrant, addToast } = useApp();
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newGrant, setNewGrant] = useState(null);

  const record = records.find(r => r.id === id);
  const recordGrants = getRecordGrants(id);
  const auditEvents = getRecordAuditEvents(id);

  if (!record) {
    return (
      <div className="record-detail page-wrapper">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={32} /></div>
            <h3 className="empty-state-title">Record not found</h3>
            <p className="empty-state-text">This record doesn't exist or you don't have access.</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGrantCreated = (grant) => {
    setNewGrant(grant);
    setShowGrantModal(false);
    setShowConfirmation(true);
  };

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
              <h1 className="record-header-title">{record.label}</h1>
              <div className="record-header-meta">
                <motion.span 
                  className="badge badge-success"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}
                >
                  <Lock size={10} /> Encrypted
                </motion.span>
                <span>{record.fileType} • {record.fileSize}</span>
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
              <code className="detail-value">{record.storageCID}</code>
            </div>
            <div className="detail-item">
              <span className="detail-label">Active Grants</span>
              <span className="detail-value">{record.activeGrants}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>{record.status}</span>
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
                  <GrantCard key={grant.id} grant={grant} index={i} />
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
                {auditEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    className="audit-event"
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className={`audit-event-dot audit-dot-${event.eventType}`} />
                    <div className="audit-event-content">
                      <div className="audit-event-header">
                        <motion.span 
                          className={`badge badge-${
                            event.eventType === 'issued' ? 'accent' :
                            event.eventType === 'accessed' ? 'blue' : 'warning'
                          }`}
                          whileHover={{ scale: 1.05, boxShadow: `0 0 15px var(--color-${
                            event.eventType === 'issued' ? 'accent' :
                            event.eventType === 'accessed' ? 'blue' : 'warning'
                          }-glow, rgba(168, 85, 247, 0.3))` }}
                        >
                          {event.eventType === 'issued' ? 'Grant Issued' :
                           event.eventType === 'accessed' ? 'Record Accessed' : 'Grant Expired'}
                        </motion.span>
                        <span className="audit-event-time">{formatRelativeTime(event.timestamp)}</span>
                      </div>
                      <p className="audit-event-actor">
                        {event.eventType === 'issued'
                          ? <>By <strong>{event.actorName}</strong> → <strong>{event.targetName}</strong></>
                          : event.eventType === 'accessed'
                            ? <>By <strong>{event.actorName}</strong></>
                            : 'Auto-expired by system'
                        }
                      </p>
                      <div className="audit-event-tx">
                        <code>{event.txHash}</code>
                        <ExternalLink size={12} />
                      </div>
                    </div>
                  </motion.div>
                ))}
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
  const timeLeft = useCountdown(grant.expiresAt);
  const isActive = grant.status === 'active' && !timeLeft.expired;

  return (
    <motion.div
      className="grant-detail-card glass-card"
      whileHover={{ borderColor: 'rgba(2, 132, 199, 0.2)' }}
    >
      <div className="grant-detail-top">
        <div className="grant-detail-info">
          <p className="grant-detail-grantee">{grant.granteeName}</p>
          <p className="grant-detail-wallet">{grant.granteeWallet}</p>
        </div>
        <motion.div 
          className={`badge ${isActive ? 'badge-success' : 'badge-warning'}`}
          whileHover={{ scale: 1.05, boxShadow: isActive ? "0 0 15px rgba(16, 185, 129, 0.4)" : "0 0 15px rgba(245, 158, 11, 0.4)" }}
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
        <span>Created {formatRelativeTime(grant.createdAt)}</span>
      </div>
    </motion.div>
  );
}

/* --- Grant Access Modal (Screen 5) --- */
function GrantModal({ recordId, onClose, onCreated }) {
  const { createGrant, loading, addToast } = useApp();
  const [granteeWallet, setGranteeWallet] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState(86400);
  const [customHours, setCustomHours] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!granteeWallet.trim()) return;
    const expiry = selectedExpiry || (parseInt(customHours) * 3600);
    if (!expiry || expiry <= 0 || isNaN(expiry)) {
      addToast('Please specify a valid access duration limit.', 'error');
      return;
    }
    const grant = await createGrant(recordId, granteeWallet.trim(), expiry);
    onCreated(grant);
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
            Grant Access
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Recipient Wallet Address</label>
            <input
              className="input-field"
              type="text"
              placeholder="0x... or invite code"
              value={granteeWallet}
              onChange={e => setGranteeWallet(e.target.value)}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Access Duration</label>
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
                    placeholder="Enter hours"
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
            <p>This creates an on-chain access grant. The recipient can decrypt and view the record until the grant expires.</p>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={!granteeWallet.trim() || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Creating Grant...' : 'Create Access Grant'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* --- Grant Confirmation (Screen 6) --- */
function GrantConfirmation({ grant, onClose }) {
  const [copied, setCopied] = useState(false);
  const timeLeft = useCountdown(grant.expiresAt);

  const handleCopy = () => {
    navigator.clipboard.writeText(grant.shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Grant Created!
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
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
              <span className="detail-value">{grant.granteeWallet}</span>
            </div>
            <div className="confirmation-detail">
              <span className="detail-label">Grant ID</span>
              <code className="detail-value">{grant.id}</code>
            </div>
          </div>

          <div className="confirmation-link">
            <label className="input-label">Shareable Link</label>
            <div className="link-copy-row">
              <input
                className="input-field"
                value={grant.shareableLink}
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
            <p className="link-hint">Send this link to your doctor. They'll need to connect their wallet to view the record.</p>
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
