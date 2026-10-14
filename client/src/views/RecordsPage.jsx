'use client';

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Search, X, Lock, ArrowRight,
  Shield, Share2, RefreshCw, Filter, Grid, List, Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../hooks/useHelpers';
import PageLayout from '../components/layout/PageLayout';
import './RecordsPage.css';

export default function RecordsPage() {
  const { records, grants, stats, loading, refreshRecords, retrieveAndDecryptRecord, addToast } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleQuickDownload = async (e, record) => {
    e.stopPropagation();
    const recId = record.id || record.recordId;
    setDownloadingId(recId);
    try {
      const result = await retrieveAndDecryptRecord(recId);
      const fileExt = (record.fileType || record.mimeType?.split('/')[1] || 'pdf').toLowerCase();
      const safeLabel = (record.label || 'medical_record').replace(/[^a-zA-Z0-9_-]/g, '_');
      const downloadName = `${safeLabel}_decrypted.${fileExt}`;

      const link = document.createElement('a');
      link.href = result.decryptedUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast(`Decrypted file ${downloadName} downloaded!`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to decrypt and download record', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      try {
        setFetchError(null);
        await refreshRecords();
      } catch (err) {
        if (mounted) setFetchError(err.message || 'Failed to sync records.');
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
      addToast('Records synchronized from vault!', 'info');
    } catch (err) {
      setFetchError(err.message || 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // File type extraction
  const fileTypes = [...new Set((records || []).map(r => (r.fileType || 'PDF').toUpperCase()))];

  const filteredRecords = (records || []).filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (r.label || '').toLowerCase().includes(q) ||
      (r.id || '').toLowerCase().includes(q) ||
      (r.recordId || '').toLowerCase().includes(q) ||
      (r.fileType || '').toLowerCase().includes(q) ||
      (r.storageCID || '').toLowerCase().includes(q)
    );
    const matchesFilter = filterType === 'all' || (r.fileType || 'PDF').toUpperCase() === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <PageLayout
      title="Encrypted Medical Records"
      subtitle="View, search, and manage all your AES-256 encrypted medical records stored in the vault."
      icon={<FileText size={24} />}
      breadcrumbs={[{ label: 'Records' }]}
      loading={loading && records.length === 0}
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
            onClick={() => navigate('/records/upload')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Upload size={16} />
            Upload New Record
          </motion.button>
        </div>
      }
    >
      {/* Toolbar: Search + Filter + View */}
      <div className="records-toolbar">
        <div className="records-search-wrapper">
          <Search size={16} className="records-search-icon" />
          <input
            type="text"
            className="input-field records-search-input"
            placeholder="Search records by title, ID, CID, type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="records-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="records-toolbar-right">
          {/* Filter by type */}
          <div className="records-filter">
            <Filter size={14} />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="records-filter-select"
            >
              <option value="all">All Types</option>
              {fileTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="records-view-toggle">
            <button
              type="button"
              className={`records-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              className={`records-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <span className="page-section-count">
            {filteredRecords.length} of {records.length} record{records.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Records */}
      {records.length === 0 ? (
        <div className="page-empty-state glass-card">
          <div className="page-empty-icon">
            <Upload size={28} />
          </div>
          <h3 className="page-empty-title">No records yet</h3>
          <p className="page-empty-text">
            Upload your first encrypted medical record. Files are encrypted inside your browser before upload.
          </p>
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/records/upload')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ marginTop: '1rem' }}
          >
            <Upload size={16} />
            Upload First Record
          </motion.button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="page-empty-state glass-card">
          <div className="page-empty-icon">
            <Search size={28} />
          </div>
          <h3 className="page-empty-title">No records match your filter</h3>
          <p className="page-empty-text">
            No encrypted records found for "{searchQuery}".
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearchQuery(''); setFilterType('all'); }}
            style={{ marginTop: '0.75rem' }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div className="records-grid" layout>
          <AnimatePresence>
            {filteredRecords.map(record => {
              const targetId = record.id || record.recordId;
              const activeGrantsNum = typeof record.activeGrants === 'number'
                ? record.activeGrants
                : (Array.isArray(record.activeGrants) ? record.activeGrants.length : 0);

              return (
                <motion.div
                  key={targetId}
                  layout
                  className="record-card glass-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4, borderColor: 'rgba(2, 132, 199, 0.3)' }}
                  onClick={() => navigate(`/records/${targetId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="record-card-header">
                    <div className="record-card-icon">
                      <FileText size={20} />
                    </div>
                    <motion.div
                      className="badge badge-success"
                      whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}
                    >
                      <Lock size={10} />
                      Encrypted
                    </motion.div>
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
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                        onClick={(e) => handleQuickDownload(e, record)}
                        disabled={downloadingId === targetId}
                        title="Download decrypted file directly"
                      >
                        <Download size={12} className={downloadingId === targetId ? 'spin-animation' : ''} />
                        {downloadingId === targetId ? 'Decrypting...' : 'Decrypt'}
                      </button>
                      <ArrowRight size={16} className="record-card-arrow" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* List View */
        <div className="records-list-view">
          <AnimatePresence>
            {filteredRecords.map(record => {
              const targetId = record.id || record.recordId;
              const activeGrantsNum = typeof record.activeGrants === 'number'
                ? record.activeGrants
                : (Array.isArray(record.activeGrants) ? record.activeGrants.length : 0);

              return (
                <motion.div
                  key={targetId}
                  className="records-list-item glass-card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  whileHover={{ borderColor: 'rgba(2, 132, 199, 0.3)' }}
                  onClick={() => navigate(`/records/${targetId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="records-list-icon">
                    <FileText size={18} />
                  </div>
                  <div className="records-list-info">
                    <span className="records-list-title">{record.label}</span>
                    <span className="records-list-meta">
                      {record.fileType || 'PDF'} • {record.fileSize || 'Standard'} • {formatDate(record.createdAt)}
                    </span>
                  </div>
                  <div className="records-list-right">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                      onClick={(e) => handleQuickDownload(e, record)}
                      disabled={downloadingId === targetId}
                    >
                      <Download size={12} className={downloadingId === targetId ? 'spin-animation' : ''} />
                      {downloadingId === targetId ? 'Decrypting...' : 'Decrypt & Download'}
                    </button>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                      <Lock size={10} /> Encrypted
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                      {activeGrantsNum} grant{activeGrantsNum !== 1 ? 's' : ''}
                    </span>
                    <ArrowRight size={16} className="record-card-arrow" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </PageLayout>
  );
}

