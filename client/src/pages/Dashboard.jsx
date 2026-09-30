import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Shield, Activity, Clock, Eye, ArrowRight, Plus, Lock, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelativeTime } from '../hooks/useHelpers';
import './Dashboard.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export default function Dashboard() {
  const { records, grants, stats, loading, revokeGrant } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeGrants = grants.filter(g => g.status === 'active');
  const filteredRecords = records.filter(r => r.label.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="dashboard page-wrapper">
        <div className="container">
          <div className="dashboard-header">
            <div className="skeleton" style={{ width: 200, height: 32 }} />
            <div className="skeleton" style={{ width: 120, height: 40 }} />
          </div>
          <div className="stats-cards">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton skeleton-card" style={{ height: 120 }} />
            ))}
          </div>
          <div className="records-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-card" />
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
            <h1 className="dashboard-title">My Records</h1>
            <p className="dashboard-subtitle">Manage your encrypted medical records and access grants</p>
          </div>
          <motion.button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={18} />
            Upload Record
          </motion.button>
        </motion.div>

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
              <span className="stat-card-value">{stats?.totalRecords || 0}</span>
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
              <span className="stat-card-value">{stats?.activeGrants || 0}</span>
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

        {/* Records */}
        <motion.div className="dashboard-section" variants={itemVariants}>
          <div className="section-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-heading">Encrypted Records</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
              <div className="input-group" style={{ margin: 0, maxWidth: 300, width: '100%' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Search records..." 
                    style={{ paddingLeft: 36, margin: 0 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <span className="section-count">{filteredRecords.length} records</span>
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
              <motion.button
                className="btn btn-primary"
                onClick={() => navigate('/upload')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Upload size={18} />
                Upload Record
              </motion.button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={32} />
              </div>
              <h3 className="empty-state-title">No records found</h3>
              <p className="empty-state-text">No records match your search filter.</p>
            </div>
          ) : (
            <motion.div className="records-grid" layout>
              <AnimatePresence>
                {filteredRecords.map((record, i) => (
                  <motion.div
                    key={record.id}
                    layout
                  className="record-card glass-card"
                  variants={itemVariants}
                  whileHover={{ y: -4, borderColor: 'rgba(2, 132, 199, 0.2)' }}
                  onClick={() => navigate(`/record/${record.id}`)}
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
                    <span>{record.fileType} • {record.fileSize}</span>
                    <span>{formatDate(record.createdAt)}</span>
                  </div>
                  <div className="record-card-footer">
                    <div className="record-card-grants">
                      <Shield size={14} />
                      <span>{record.activeGrants} active grant{record.activeGrants !== 1 ? 's' : ''}</span>
                    </div>
                    <ArrowRight size={16} className="record-card-arrow" />
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>

        {/* Active Grants */}
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
                When you share a record with a doctor, active grants will appear here.
              </p>
            </div>
          ) : (
            <motion.div className="grants-list" layout>
              <AnimatePresence>
                {activeGrants.map((grant, i) => (
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
                      <p className="grant-row-record">{grant.recordLabel}</p>
                      <p className="grant-row-meta">
                        Shared with <strong>{grant.granteeName}</strong> • {formatRelativeTime(grant.createdAt)}
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
                      className="btn btn-icon btn-ghost" 
                      style={{ color: 'var(--color-danger)' }}
                      onClick={(e) => { e.stopPropagation(); revokeGrant(grant.id); }}
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      title="Revoke Access"
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
    </div>
  );
}
