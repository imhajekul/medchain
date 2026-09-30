import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Shield, ArrowRight, Eye, Clock, AlertTriangle,
  CheckCircle, Lock, FileText, ExternalLink, Wallet
} from 'lucide-react';
import { useCountdown } from '../hooks/useHelpers';
import { mockGrants, mockRecords } from '../data/mockData';
import './DoctorAccess.css';

export default function DoctorAccess() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('enter-code'); // enter-code, connecting, viewing, expired
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Simulated grant lookup
  const activeGrant = mockGrants.find(g => g.status === 'active');
  const expiredGrant = mockGrants.find(g => g.status === 'expired');

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('Please enter an access code or link');
      return;
    }
    setError('');
    setStage('connecting');
  };

  const handleConnect = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1500));
    setConnecting(false);
    setStage('viewing');
  };

  const handleViewExpired = () => {
    setStage('expired');
  };

  return (
    <div className="doctor-access page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="container">
        <AnimatePresence mode="wait">
          {/* Stage 1: Enter Code/Link (Screen 7) */}
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
                    <Link2 size={28} />
                  </div>
                </motion.div>

                <motion.h1
                  className="doctor-title"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Access Shared Record
                </motion.h1>
                <motion.p
                  className="doctor-subtitle"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Enter the access code or link provided by your patient to view their medical record.
                </motion.p>

                <motion.form
                  className="doctor-form"
                  onSubmit={handleCodeSubmit}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="input-group">
                    <label className="input-label" htmlFor="access-code">Access Code or Link</label>
                    <input
                      id="access-code"
                      className="input-field"
                      type="text"
                      placeholder="e.g., grant_001 or https://medvault.app/access/..."
                      value={accessCode}
                      onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                      autoFocus
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        className="upload-error"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <AlertTriangle size={16} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Verify Access
                    <ArrowRight size={18} />
                  </motion.button>
                </motion.form>

                <div className="doctor-hint">
                  <Shield size={14} />
                  <span>You'll need to connect your wallet to prove your identity matches the grant.</span>
                </div>
              </div>

              {/* Demo buttons */}
              <motion.div
                className="demo-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <p className="demo-label">Demo shortcuts:</p>
                <div className="demo-buttons">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setAccessCode('grant_001'); setTimeout(() => setStage('connecting'), 300); }}
                  >
                    <Eye size={14} /> Active Grant Demo
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleViewExpired}
                  >
                    <Clock size={14} /> Expired Grant Demo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Stage 2: Connect Wallet (Screen 8) */}
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

                <motion.div
                  className="doctor-icon-wrapper"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <div className="doctor-icon doctor-icon-blue">
                    <Wallet size={28} />
                  </div>
                </motion.div>

                <h1 className="doctor-title">Connect Your Wallet</h1>
                <p className="doctor-subtitle">
                  To verify your identity matches the access grant, please connect the wallet specified by the patient.
                </p>

                <div className="grant-preview glass-card">
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Grant ID</span>
                    <code className="grant-preview-value">{activeGrant?.id}</code>
                  </div>
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Record</span>
                    <span className="grant-preview-value">{activeGrant?.recordLabel}</span>
                  </div>
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Status</span>
                    <span className="badge badge-success">
                      <span className="pulse-dot" style={{ width: 6, height: 6 }} /> Active
                    </span>
                  </div>
                </div>

                <motion.button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  onClick={handleConnect}
                  disabled={connecting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {connecting ? (
                    <span className="btn-loading-text">
                      <motion.span
                        className="upload-stage-spinner"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%' }}
                      />
                      Verifying identity...
                    </span>
                  ) : (
                    <>
                      <Wallet size={18} />
                      Connect Wallet
                    </>
                  )}
                </motion.button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStage('enter-code')}
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  ← Back to code entry
                </button>
              </div>
            </motion.div>
          )}

          {/* Stage 3: View Record (Screen 9) */}
          {stage === 'viewing' && (
            <motion.div
              key="viewing"
              className="doctor-stage doctor-stage-wide"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Expiry Banner */}
              <ExpiryBanner expiresAt={activeGrant?.expiresAt} />

              <div className="doctor-view-layout">
                {/* Record Viewer */}
                <motion.div
                  className="record-viewer glass-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <div className="record-viewer-header">
                    <div className="record-viewer-icon">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="record-viewer-title">{activeGrant?.recordLabel}</h2>
                      <p className="record-viewer-meta">Decrypted in browser • PDF • 245 KB</p>
                    </div>
                    <div className="badge badge-success">
                      <Lock size={10} /> Decrypted
                    </div>
                  </div>

                  <div className="record-viewer-body">
                    {/* Simulated PDF content */}
                    <div className="pdf-simulation">
                      <div className="pdf-header-sim">
                        <div className="pdf-logo-sim" />
                        <div>
                          <div className="skeleton" style={{ width: 200, height: 18, marginBottom: 6 }} />
                          <div className="skeleton" style={{ width: 140, height: 12 }} />
                        </div>
                      </div>

                      <div className="pdf-title-sim">Complete Blood Count (CBC)</div>
                      <div className="pdf-subtitle-sim">Patient: Alex Morgan | Date: Sept 15, 2026</div>

                      <table className="pdf-table-sim">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Result</th>
                            <th>Reference Range</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>White Blood Cells</td>
                            <td>6.8 × 10³/µL</td>
                            <td>4.5 – 11.0</td>
                            <td><span className="pdf-status-normal">Normal</span></td>
                          </tr>
                          <tr>
                            <td>Red Blood Cells</td>
                            <td>4.9 × 10⁶/µL</td>
                            <td>4.5 – 5.5</td>
                            <td><span className="pdf-status-normal">Normal</span></td>
                          </tr>
                          <tr>
                            <td>Hemoglobin</td>
                            <td>14.2 g/dL</td>
                            <td>13.5 – 17.5</td>
                            <td><span className="pdf-status-normal">Normal</span></td>
                          </tr>
                          <tr>
                            <td>Hematocrit</td>
                            <td>42.1%</td>
                            <td>38.8 – 50.0</td>
                            <td><span className="pdf-status-normal">Normal</span></td>
                          </tr>
                          <tr>
                            <td>Platelets</td>
                            <td>245 × 10³/µL</td>
                            <td>150 – 400</td>
                            <td><span className="pdf-status-normal">Normal</span></td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="pdf-footer-sim">
                        <p>Ordering Physician: Dr. R. Patel | Lab: MedLab Diagnostics</p>
                        <p>Report generated: Sept 15, 2026 | Verified by: Lab Director</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Side Info */}
                <motion.div
                  className="doctor-view-sidebar"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <div className="doctor-info-card glass-card">
                    <h3>Access Details</h3>
                    <div className="doctor-info-rows">
                      <div className="doctor-info-row">
                        <span className="detail-label">Grant ID</span>
                        <code className="detail-value">{activeGrant?.id}</code>
                      </div>
                      <div className="doctor-info-row">
                        <span className="detail-label">Granted By</span>
                        <span className="detail-value">Alex Morgan</span>
                      </div>
                      <div className="doctor-info-row">
                        <span className="detail-label">Your Wallet</span>
                        <span className="detail-value">{activeGrant?.granteeWallet}</span>
                      </div>
                      <div className="doctor-info-row">
                        <span className="detail-label">Verification</span>
                        <span className="badge badge-accent">On-chain Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="doctor-security-note glass-card">
                    <Shield size={16} />
                    <p>This record was decrypted locally in your browser. No plaintext data was transmitted over the network.</p>
                  </div>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleViewExpired}
                    style={{ width: '100%' }}
                  >
                    Demo: View expired state →
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Stage 4: Expired (Screen 10) */}
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

                <motion.div
                  className="doctor-icon-wrapper"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <div className="doctor-icon doctor-icon-expired">
                    <Clock size={28} />
                  </div>
                </motion.div>

                <h1 className="doctor-title">Access Expired</h1>
                <p className="doctor-subtitle">
                  This access grant has expired. The record is no longer viewable. Contact the patient to request a new grant.
                </p>

                <div className="expired-details glass-card">
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Grant ID</span>
                    <code className="grant-preview-value">{expiredGrant?.id || 'grant_004'}</code>
                  </div>
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Record</span>
                    <span className="grant-preview-value">{expiredGrant?.recordLabel || 'HbA1c Test'}</span>
                  </div>
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Status</span>
                    <span className="badge badge-error">Expired</span>
                  </div>
                  <div className="grant-preview-row">
                    <span className="grant-preview-label">Expired At</span>
                    <span className="grant-preview-value">Sept 20, 2026</span>
                  </div>
                </div>

                <div className="expired-actions">
                  <motion.button
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStage('enter-code')}
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

/* Expiry Banner Component */
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
            transition={{ duration: timeLeft.total / 1000, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
