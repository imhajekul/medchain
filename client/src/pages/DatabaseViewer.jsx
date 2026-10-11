import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, RefreshCw, Server, Users, FileText, Shield,
  Activity, ExternalLink, Terminal, CheckCircle2, AlertTriangle,
  Code2, Eye, Copy, Check
} from 'lucide-react';
import { api } from '../services/api';
import './DatabaseViewer.css';

export default function DatabaseViewer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCollection, setActiveCollection] = useState('records'); // 'records' | 'users' | 'grants' | 'auditLogs'
  const [copiedText, setCopiedText] = useState(null);

  const fetchDatabaseState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.inspectDatabase();
      setData(res);
    } catch (err) {
      console.error('[DB Inspect Error]:', err);
      setError(err.message || 'Failed to inspect database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseState();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getDriverBadge = (driver) => {
    if (driver === 'mongodb-cluster') {
      return (
        <span className="db-badge db-badge-mongo">
          🍃 MongoDB Atlas Cluster
        </span>
      );
    }
    if (driver === 'postgresql') {
      return (
        <span className="db-badge db-badge-postgres">
          📦 PostgreSQL
        </span>
      );
    }
    return (
      <span className="db-badge db-badge-memory">
        💾 In-Memory Storage Driver
      </span>
    );
  };

  const collections = data?.data || { users: [], records: [], grants: [], auditLogs: [] };
  const counts = data?.counts || { users: 0, records: 0, grants: 0, auditLogs: 0 };
  const currentItems = collections[activeCollection] || [];

  return (
    <div className="db-viewer-page page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="container db-viewer-container">
        {/* Header */}
        <motion.div
          className="db-header-card glass-card"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="db-header-left">
            <div className="db-header-icon">
              <Database size={28} />
            </div>
            <div>
              <div className="db-title-row">
                <h1 className="db-title">Database & Cluster Explorer</h1>
                {data && getDriverBadge(data.activeDriver)}
              </div>
              <p className="db-subtitle">
                Live inspection of MedVault persistence collections, document counts, and schema records.
              </p>
            </div>
          </div>

          <div className="db-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchDatabaseState}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
              {loading ? 'Refreshing...' : 'Refresh State'}
            </button>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <div className="glass-card db-alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Collection Metric Cards */}
        <div className="db-stats-grid">
          <motion.div
            className={`db-stat-card glass-card ${activeCollection === 'records' ? 'stat-active' : ''}`}
            onClick={() => setActiveCollection('records')}
            whileHover={{ y: -3 }}
          >
            <div className="db-stat-header">
              <FileText size={18} className="db-stat-icon-records" />
              <span className="db-stat-name">Records</span>
            </div>
            <div className="db-stat-count">{counts.records}</div>
            <div className="db-stat-desc">Encrypted medical files & CIDs</div>
          </motion.div>

          <motion.div
            className={`db-stat-card glass-card ${activeCollection === 'grants' ? 'stat-active' : ''}`}
            onClick={() => setActiveCollection('grants')}
            whileHover={{ y: -3 }}
          >
            <div className="db-stat-header">
              <Shield size={18} className="db-stat-icon-grants" />
              <span className="db-stat-name">Access Grants</span>
            </div>
            <div className="db-stat-count">{counts.grants}</div>
            <div className="db-stat-desc">Time-boxed doctor authorizations</div>
          </motion.div>

          <motion.div
            className={`db-stat-card glass-card ${activeCollection === 'users' ? 'stat-active' : ''}`}
            onClick={() => setActiveCollection('users')}
            whileHover={{ y: -3 }}
          >
            <div className="db-stat-header">
              <Users size={18} className="db-stat-icon-users" />
              <span className="db-stat-name">Users</span>
            </div>
            <div className="db-stat-count">{counts.users}</div>
            <div className="db-stat-desc">Patients & Healthcare Providers</div>
          </motion.div>

          <motion.div
            className={`db-stat-card glass-card ${activeCollection === 'auditLogs' ? 'stat-active' : ''}`}
            onClick={() => setActiveCollection('auditLogs')}
            whileHover={{ y: -3 }}
          >
            <div className="db-stat-header">
              <Activity size={18} className="db-stat-icon-audit" />
              <span className="db-stat-name">Audit Logs</span>
            </div>
            <div className="db-stat-count">{counts.auditLogs}</div>
            <div className="db-stat-desc">On-chain registered events</div>
          </motion.div>
        </div>

        {/* Live Collection Document Viewer */}
        <div className="db-content-card glass-card">
          <div className="db-content-header">
            <div className="db-collection-tabs">
              <button
                className={`db-tab ${activeCollection === 'records' ? 'tab-active' : ''}`}
                onClick={() => setActiveCollection('records')}
              >
                records ({counts.records})
              </button>
              <button
                className={`db-tab ${activeCollection === 'grants' ? 'tab-active' : ''}`}
                onClick={() => setActiveCollection('grants')}
              >
                access_grants ({counts.grants})
              </button>
              <button
                className={`db-tab ${activeCollection === 'users' ? 'tab-active' : ''}`}
                onClick={() => setActiveCollection('users')}
              >
                users ({counts.users})
              </button>
              <button
                className={`db-tab ${activeCollection === 'auditLogs' ? 'tab-active' : ''}`}
                onClick={() => setActiveCollection('auditLogs')}
              >
                audit_logs ({counts.auditLogs})
              </button>
            </div>
          </div>

          <div className="db-documents-list">
            {currentItems.length === 0 ? (
              <div className="db-empty-state">
                <Database size={36} className="db-empty-icon" />
                <p>No documents found in <strong>{activeCollection}</strong>.</p>
                <span className="db-empty-sub">
                  Upload a record, create an access grant, or register an account to populate data.
                </span>
              </div>
            ) : (
              currentItems.map((item, idx) => (
                <div key={item.id || item._id || idx} className="db-document-item">
                  <div className="db-doc-header">
                    <span className="db-doc-index">#{idx + 1}</span>
                    <span className="db-doc-id">ID: {item.id || item._id || item.record_id_hex || item.grant_id_hex}</span>
                    <button
                      className="btn btn-ghost btn-sm db-copy-btn"
                      onClick={() => handleCopy(JSON.stringify(item, null, 2), idx)}
                    >
                      {copiedText === idx ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      {copiedText === idx ? 'Copied' : 'JSON'}
                    </button>
                  </div>
                  <pre className="db-doc-json">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* "How to see database of this?" Guide Section */}
        <div className="db-guide-card glass-card">
          <h3 className="db-guide-title">
            <Server size={20} />
            How to See & Query This Database
          </h3>
          <p className="db-guide-subtitle">
            MedVault supports live MongoDB Atlas clusters, local MongoDB, PostgreSQL, and in-memory evaluation. Here is how you can inspect data across environments:
          </p>

          <div className="db-methods-grid">
            {/* Method 1 */}
            <div className="db-method-box">
              <div className="db-method-badge">Method 1</div>
              <h4>MongoDB Atlas Web UI (Cloud)</h4>
              <ol className="db-method-steps">
                <li>Log in to your account at <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer">cloud.mongodb.com</a>.</li>
                <li>Under <strong>Database Deployments</strong>, click <strong>Browse Collections</strong>.</li>
                <li>Select the <code>medvault</code> database.</li>
                <li>Browse live documents in <code>users</code>, <code>records</code>, <code>access_grants</code>, and <code>audit_logs</code>.</li>
              </ol>
            </div>

            {/* Method 2 */}
            <div className="db-method-box">
              <div className="db-method-badge">Method 2</div>
              <h4>MongoDB Compass (GUI Desktop App)</h4>
              <ol className="db-method-steps">
                <li>Download & launch <strong>MongoDB Compass</strong>.</li>
                <li>Paste your Cluster Connection String:
                  <div className="db-code-snippet">
                    mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.xxxxx.mongodb.net/medvault
                  </div>
                </li>
                <li>Click <strong>Connect</strong> to visually filter, index, and view real-time data.</li>
              </ol>
            </div>

            {/* Method 3 */}
            <div className="db-method-box">
              <div className="db-method-badge">Method 3</div>
              <h4>Direct Browser API Inspection</h4>
              <ol className="db-method-steps">
                <li>MedVault exposes a live API endpoint at:
                  <div className="db-code-snippet">
                    GET /api/admin/db-inspect
                  </div>
                </li>
                <li>Returns real-time JSON metrics, counts, and active collections directly in your browser or Postman.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
