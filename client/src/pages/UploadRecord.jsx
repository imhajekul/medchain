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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    const valid = validateAndSetFile(droppedFile);
    if (valid) {
      setLabel(droppedFile.name);
      await triggerUpload(droppedFile, droppedFile.name);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    const valid = validateAndSetFile(selectedFile);
    if (valid) {
      setLabel(selectedFile.name);
      await triggerUpload(selectedFile, selectedFile.name);
    }
  };

  const validateAndSetFile = (f) => {
    setError('');
    if (!f) return false;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported for MVP');
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB');
      return false;
    }
    setFile(f);
    return true;
  };

  const triggerUpload = async (uploadFile, uploadLabel) => {
    setUploadStage('encrypting');
    await new Promise(r => setTimeout(r, 1500)); // Simulating AES-256 encryption delay

    setUploadStage('uploading');
    const newRecord = await uploadRecord(uploadLabel, uploadFile);

    setUploadStage('done');
    await new Promise(r => setTimeout(r, 1200));

    navigate(`/record/${newRecord.id}`);
  };

  const handleUpload = () => {
    if (!file || !label.trim()) return;
    triggerUpload(file, label.trim());
  };

  const stages = [
    { key: 'encrypting', label: 'Encrypting client-side...', icon: <Lock size={20} /> },
    { key: 'uploading', label: 'Uploading to IPFS...', icon: <Upload size={20} /> },
    { key: 'done', label: 'Record secured!', icon: <CheckCircle size={20} /> },
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
                accept=".pdf"
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
                      <strong>Drop your PDF here</strong> or click to browse
                    </p>
                    <p className="drop-zone-hint">PDF only • Max 10 MB • MVP: Lab results</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="file"
                    className="drop-zone-file"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--color-bg-primary)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="upload-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle size={16} />
                  {error}
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
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h3 className="upload-info-title">
                <Shield size={18} />
                How encryption works
              </h3>
              <div className="upload-info-steps">
                <div className="upload-info-step">
                  <div className="upload-info-step-num">1</div>
                  <p>Your file is encrypted with AES-256 directly in your browser</p>
                </div>
                <div className="upload-info-step">
                  <div className="upload-info-step-num">2</div>
                  <p>Only the encrypted ciphertext leaves your device</p>
                </div>
                <div className="upload-info-step">
                  <div className="upload-info-step-num">3</div>
                  <p>The encrypted blob is stored on IPFS — referenced by its content hash</p>
                </div>
                <div className="upload-info-step">
                  <div className="upload-info-step-num">4</div>
                  <p>Your encryption key is never shared. You control who can decrypt.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
