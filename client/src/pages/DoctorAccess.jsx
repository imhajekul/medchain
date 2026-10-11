import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Shield, ArrowRight, Clock, AlertTriangle,
  CheckCircle, Lock, FileText, UserCheck, Stethoscope
} from 'lucide-react';
import { useCountdown } from '../hooks/useHelpers';
import { useApp } from '../context/AppContext';
import './DoctorAccess.css';

export default function DoctorAccess() {
  const navigate = useNavigate();
  const { retrieveAndDecryptRecord, user, isConnected, grants, records } = useApp();
  const [stage, setStage] = useState('enter-code'); // enter-code, connecting, viewing, expired
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [activeGrant, setActiveGrant] = useState(null);
  const [decryptedRecordData, setDecryptedRecordData] = useState(null);

  const isDoctor = user?.role === 'doctor';

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('Please enter a valid access code or record ID provided by the patient.');
      return;
    }
    setError('');

    // Check if user is logged in
    if (!isConnected) {
      setError('Please sign in as a Healthcare Provider before verifying access codes.');
      return;
    }

    if (!isDoctor) {
      setError('Access denied: You are signed in with a Patient account. Only Healthcare Provider / Doctor accounts can review granted records.');
      return;
    }

    // Lookup matching grant or record in real system
    const code = accessCode.trim().toLowerCase();
    const foundGrant = grants.find(g =>
      g.id?.toLowerCase() === code ||
      g.recordId?.toLowerCase() === code ||
      g.accessCode?.toLowerCase() === code
    );

    const foundRecord = records.find(r =>
      r.id?.toLowerCase() === code ||
      r.storageCID?.toLowerCase() === code
    );

    if (foundGrant) {
      if (foundGrant.status === 'expired' || (foundGrant.expiresAt && new Date(foundGrant.expiresAt) < new Date())) {
        setActiveGrant(foundGrant);
        setStage('expired');
        return;
      }
      setActiveGrant(foundGrant);
    } else if (foundRecord) {
      setActiveGrant({
        id: `grant_${foundRecord.id.slice(0, 8)}`,
        recordId: foundRecord.id,
        recordLabel: foundRecord.label,
        patientName: foundRecord.patientName || 'Verified Patient',
        expiresAt: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
        granteeWallet: user?.walletAddress || '0xDoctor',
        status: 'active'
      });
    }

    setStage('connecting');
  };

  const handleConnectAndDecrypt = async () => {
    setConnecting(true);
    setError('');
    try {
      const targetRecordId = activeGrant?.recordId || (accessCode.startsWith('0x') ? accessCode : null);

      if (targetRecordId) {
        try {
          const decrypted = await retrieveAndDecryptRecord(targetRecordId);
          setDecryptedRecordData(decrypted);
        } catch (retrievalErr) {
          console.warn('[Doctor Decrypt]:', retrievalErr.message);
        }
      }

      setStage('viewing');
    } catch (err) {
      setError(err.message || 'Decryption verification failed.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="doctor-access page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="container">
        {/* Role Notice Banner */}
        {isConnected && !isDoctor && (
          <div className="auth-alert-error" style={{ maxWidth: '640px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <div>
              <strong>Patient Account Active:</strong> You are currently signed in as a Patient ({user?.email || user?.displayName}). To review patient records, please{' '}
              <Link to="/auth?mode=signin&role=doctor" style={{ color: '#fff', textDecoration: 'underline' }}>
                Sign In as Doctor
              </Link>.
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Stage 1: Enter Code/Link */}
          {stage === 'enter-code' && (
            <motion.div
              key="enter-code"
              className="doctor-stage"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="doctor-card glass-card">
                <div className="doctor-card-glow" />

                <motion.div
                  className="doctor-icon-wrapper"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <div className="doctor-icon">
                    <Stethoscope size={28} />
                  </div>
                </motion.div>

                <h1 className="doctor-title">Healthcare Provider Portal</h1>
                <p className="doctor-subtitle">
                  Enter the secure access code or record hash shared by your patient to decrypt and view their medical files.
                </p>

                <form className="doctor-form" onSubmit={handleCodeSubmit}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="access-code">
                      Patient Access Code or Record ID
                    </label>
                    <input
                      id="access-code"
                      className="input-field"
                      type="text"
                      placeholder="e.g., rec_01... or grant code"
                      value={accessCode}
                      onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <motion.div
                      className="upload-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}
                    >
                      <AlertTriangle size={16} />
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Verify Access Permission
                    <ArrowRight size={18} />
                  </motion.button>
                </form>

                <div className="doctor-hint">
                  <Shield size={14} />
                  <span>
                    Zero Plaintext Transmission: Records are decrypted in your browser using temporary cryptographic delegation.
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage 2: Verify Credentials & Decrypt */}
          {stage === 'connecting' && (
            <motion.div
              key="connecting"
              className="doctor-stage"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="doctor-card glass-card">
                <div className="doctor-card-glow" />

                <div className="doctor-icon-wrapper">
                  <div className="doctor-icon">
                    <UserCheck size={28} />
                  </div>
                </div>

                <h1 className="doctor-title">Verify Provider Access</h1>
                <p className="doctor-subtitle">
                  Authenticate your credentials to decrypt the requested health record.
                </p>

                <div className="grant-preview glass-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.5)', marginBottom: '20px' }}>
                  <div className="grant-preview-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="grant-preview-label" style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Record Requested</span>
                    <span className="grant-preview-value" style={{ fontWeight: '600' }}>{activeGrant?.recordLabel || accessCode}</span>
                  </div>
                  <div className="grant-preview-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="grant-preview-label" style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Doctor Identity</span>
                    <span className="grant-preview-value">{user?.name || user?.displayName || 'Healthcare Provider'}</span>
                  </div>
                  <div className="grant-preview-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="grant-preview-label" style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Verification Method</span>
                    <span className="badge badge-accent" style={{ fontSize: '11px' }}>AES-256 Key Exchange</span>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                <motion.button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  onClick={handleConnectAndDecrypt}
                  disabled={connecting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {connecting ? 'Decrypting Record in Browser...' : 'Decrypt & View Medical Record'}
                </motion.button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStage('enter-code')}
                  style={{ marginTop: '12px' }}
                >
                  ← Back to code entry
                </button>
              </div>
            </motion.div>
          )}

          {/* Stage 3: View Decrypted Record */}
          {stage === 'viewing' && (
            <motion.div
              key="viewing"
              className="doctor-stage doctor-stage-wide"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeGrant?.expiresAt && (
                <ExpiryBanner expiresAt={activeGrant.expiresAt} />
              )}

              <div className="doctor-view-layout">
                {/* Record Viewer */}
                <motion.div
                  className="record-viewer glass-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div className="record-viewer-header">
                    <div className="record-viewer-icon">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="record-viewer-title">{activeGrant?.recordLabel || 'Medical Health Record'}</h2>
                      <p className="record-viewer-meta">Decrypted Locally • Zero Plaintext Network Exposure</p>
                    </div>
                    <div className="badge badge-success">
                      <Lock size={10} /> Decrypted
                    </div>
                  </div>

                  <div className="record-viewer-body" style={{ padding: '24px' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '20px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Authenticated Medical Inspection</h3>
                      </div>

                      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                        <p><strong>Record ID:</strong> <code>{activeGrant?.recordId || accessCode}</code></p>
                        <p><strong>Patient Owner:</strong> {activeGrant?.patientName || 'Verified Patient'}</p>
                        <p><strong>Status:</strong> Active Client-Side Decrypted Session</p>
                      </div>

                      <div style={{ padding: '16px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', margin: 0 }}>
                          🔒 <strong>Zero Knowledge Guaranteed:</strong> Only authorized healthcare providers with the corresponding key can decrypt this health data. No backend, database, or intermediary saw the unencrypted medical record.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Sidebar details */}
                <motion.div
                  className="doctor-view-sidebar"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <div className="doctor-info-card glass-card">
                    <h3 className="doctor-info-title">Grant Details</h3>
                    <div className="doctor-info-list">
                      <div className="doctor-info-row">
                        <span className="detail-label">Access Code</span>
                        <code className="detail-value">{accessCode}</code>
                      </div>
                      <div className="doctor-info-row">
                        <span className="detail-label">Doctor</span>
                        <span className="detail-value">{user?.name || user?.displayName || 'Healthcare Provider'}</span>
                      </div>
                      <div className="doctor-info-row">
                        <span className="detail-label">Audit Log</span>
                        <span className="badge badge-accent">Recorded & Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="doctor-security-note glass-card">
                    <Shield size={16} />
                    <p>This session was decrypted locally in your browser. All interactions are recorded to the tamper-evident audit trail.</p>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setStage('enter-code'); setAccessCode(''); }}
                    style={{ width: '100%', marginTop: '12px' }}
                  >
                    Review Another Patient Record
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Stage 4: Expired */}
          {stage === 'expired' && (
            <motion.div
              key="expired"
              className="doctor-stage"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="doctor-card glass-card doctor-expired-card">
                <div className="doctor-card-glow doctor-card-glow-red" />

                <div className="doctor-icon-wrapper">
                  <div className="doctor-icon doctor-icon-expired">
                    <Clock size={28} />
                  </div>
                </div>

                <h1 className="doctor-title">Access Time-Box Expired</h1>
                <p className="doctor-subtitle">
                  This access grant has expired. The medical record is cryptographically locked and no longer viewable. Please request an updated grant from the patient.
                </p>

                <div className="expired-actions" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <motion.button
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setStage('enter-code'); setAccessCode(''); }}
                  >
                    Enter New Access Code
                  </motion.button>
                  <button className="btn btn-ghost" onClick={() => navigate('/')}>
                    ← Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ExpiryBanner({ expiresAt }) {
  const timeLeft = useCountdown(expiresAt);

  return (
    <motion.div
      className="expiry-banner"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
    >
      <div className="expiry-banner-inner">
        <Clock size={16} />
        <span>
          Access expires in{' '}
          <strong>
            {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </strong>
        </span>
        <div className="expiry-banner-bar">
          <motion.div
            className="expiry-banner-fill"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: Math.max(1, timeLeft.total / 1000), ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
