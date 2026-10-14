'use client';

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Lock, Shield, CheckCircle, X, ArrowLeft, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './UploadRecord.css';

export default function UploadRecord() {
  const { uploadRecord, loading } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadStage, setUploadStage] = useState('idle'); // idle, encrypting, uploading, done
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (f) => {
    setError('');
    if (!f) return false;

    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF files are supported for MVP (e.g. lab results, prescriptions, clinical notes).');
      return false;
    }

    if (f.size > 25 * 1024 * 1024) {
      setError('File size must be under 25 MB.');
      return false;
    }

    setFile(f);
    if (!label) {
      // Clean extension for friendly initial label
      const baseName = f.name.replace(/\.[^/.]+$/, '');
      setLabel(baseName);
    }
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const triggerUpload = async (uploadFile, uploadLabel) => {
    if (!uploadFile) {
      setError('Please select a file to encrypt and upload.');
      return;
    }

    const finalLabel = (uploadLabel || uploadFile.name).trim();
    if (!finalLabel) {
      setError('Please provide a record name or description.');
      return;
    }

    setError('');
    try {
      setUploadStage('encrypting');
      await new Promise(r => setTimeout(r, 600));

      setUploadStage('uploading');
      const newRecord = await uploadRecord(finalLabel, uploadFile);

      setUploadStage('done');
      await new Promise(r => setTimeout(r, 600));

      const targetId = newRecord?.id || newRecord?.recordId;
      if (targetId) {
        navigate(`/record/${targetId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[Upload Component Exception]:', err);
      setError(err.message || 'Encryption or upload failed. Please try again.');
      setUploadStage('idle');
    }
  };

  const handleUploadSubmit = () => {
    if (!file) {
      setError('Please select a medical record PDF first.');
      return;
    }
    triggerUpload(file, label || file.name);
  };

  const stages = [
    { key: 'encrypting', label: 'Encrypting client-side with AES-256-GCM...', icon: <Lock size={20} /> },
    { key: 'uploading', label: 'Persisting encrypted ciphertext to IPFS...', icon: <Upload size={20} /> },
    { key: 'done', label: 'Record secured on-chain!', icon: <CheckCircle size={20} /> },
  ];

  return (
    <div className="upload-page page-wrapper">
      <div className="bg-orb bg-orb-1" />

      <motion.div
        className="container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <motion.button
          className="btn btn-ghost upload-back"
          onClick={() => navigate('/dashboard')}
          whileHover={{ x: -3 }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </motion.button>

        <div className="upload-layout">
          {/* Main Upload Area */}
          <div className="upload-main">
            <h1 className="upload-title">Upload Record</h1>
            <p className="upload-subtitle">
              Your file is encrypted in your browser before upload — no one sees the plaintext.
            </p>

            {/* File Drop Zone */}
            <motion.div
              className={`drop-zone glass-card ${dragActive ? 'drop-zone-active' : ''} ${file ? 'drop-zone-has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              whileHover={!file ? { borderColor: 'rgba(2, 132, 199, 0.4)' } : {}}
              layout
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="drop-zone-input"
              />

              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.div
                    key="empty"
                    className="drop-zone-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="drop-zone-icon"
                      animate={{ y: dragActive ? -8 : 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Upload size={32} />
                    </motion.div>
                    <p className="drop-zone-text">
                      <strong>Drop your medical PDF here</strong> or click to browse
                    </p>
                    <p className="drop-zone-hint">PDF only • Up to 25 MB • Zero Plaintext Exposure</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="file"
                    className="drop-zone-file"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'var(--color-bg-primary)',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="file-preview">
                      <div className="file-preview-icon">
                        <FileText size={24} />
                      </div>
                      <div className="file-preview-info">
                        <p className="file-preview-name">{file.name}</p>
                        <p className="file-preview-size">{(file.size / 1024).toFixed(1)} KB • PDF</p>
                      </div>
                      <motion.button
                        className="file-preview-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Remove file"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Record Metadata Fields & Upload Button */}
            {file && uploadStage === 'idle' && (
              <motion.div
                className="glass-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '1.25rem', padding: '1.5rem' }}
              >
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    Record Name / Label
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Blood Test Results, MRI Scan, Cardiology Report"
                    style={{ margin: 0, width: '100%' }}
                  />
                </div>

                <motion.button
                  className="btn btn-primary"
                  onClick={handleUploadSubmit}
                  disabled={loading || uploadStage !== 'idle'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem' }}
                >
                  <Lock size={18} />
                  Encrypt & Upload Record
                </motion.button>
              </motion.div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="upload-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: '1rem' }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Progress */}
            <AnimatePresence>
              {uploadStage !== 'idle' && (
                <motion.div
                  className="upload-progress glass-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  style={{ marginTop: '1.5rem' }}
                >
                  {stages.map((stage, i) => {
                    const stageIndex = stages.findIndex(s => s.key === uploadStage);
                    const isActive = stage.key === uploadStage;
                    const isDone = i < stageIndex || uploadStage === 'done';

                    return (
                      <motion.div
                        key={stage.key}
                        className={`upload-stage ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: isActive || isDone ? 1 : 0.4 }}
                      >
                        <div className={`upload-stage-icon ${isDone ? 'done' : ''}`}>
                          {isDone ? <CheckCircle size={20} /> : stage.icon}
                        </div>
                        <span className="upload-stage-label">{stage.label}</span>
                        {isActive && !isDone && (
                          <motion.div
                            className="upload-stage-spinner"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Info */}
          <div className="upload-sidebar">
            <motion.div
              className="upload-info-card glass-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h3 className="upload-info-title">
                <Shield size={18} />
                Zero-Exposure Architecture
              </h3>
              <div className="upload-info-steps">
                <div className="upload-info-step">
                  <div className="upload-info-step-num">1</div>
                  <p>Your PDF is encrypted with 256-bit AES-GCM directly inside your browser memory.</p>
                </div>
                <div className="upload-info-step">
                  <div className="upload-info-step-num">2</div>
                  <p>Only ciphertext leaves your device; plaintext PHI is never sent over the network.</p>
                </div>
                <div className="upload-info-step">
                  <div className="upload-info-step-num">3</div>
                  <p>The encrypted blob is pinned to IPFS referenced by its SHA-256 integrity hash.</p>
                </div>
                <div className="upload-info-step">
                  <div className="upload-info-step-num">4</div>
                  <p>Decryption keys are enveloped with recipient public keys under strict time-boxed grants.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

