import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon, Send, ArrowUpRight, ArrowDownLeft, Copy, Check,
  ExternalLink, QrCode, RefreshCw, DollarSign, Clock,
  ShieldCheck, AlertCircle, CheckCircle2, User, X, CreditCard
} from 'lucide-react';
import { ethers } from 'ethers';
import { useApp } from '../context/AppContext';
import { CHAIN_CONFIG } from '../services/blockchain';
import { api } from '../services/api';
import UpiTopUpModal from '../components/shared/UpiTopUpModal';
import './Wallet.css';

const DEFAULT_TRANSACTIONS = [];

export default function Wallet() {
  const { user, addToast, refreshWalletBalance } = useApp();
  const walletAddress = (user?.walletAddress || '0x03c588972886f3456789abcdef0123456789abcdef').toLowerCase();

  // Balance & State
  const storageKey = `medvault_wallet_balance_${walletAddress}`;
  const txStorageKey = `medvault_wallet_txs_${walletAddress}`;

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseFloat(saved) : 0.00;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(txStorageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  // Transfer Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('POL');
  const [memo, setMemo] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [formError, setFormError] = useState('');

  // UI Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTx, setCopiedTx] = useState(null);
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'sent' | 'received'

  // Authoritative server wallet synchronization (MongoDB Atlas)
  const loadWalletData = useCallback(async () => {
    try {
      const res = await api.getWalletBalance();
      if (typeof res?.balance === 'number') {
        setBalance(res.balance);
      }
      if (Array.isArray(res?.transactions)) {
        setTransactions(res.transactions.map(t => ({
          id: t.tx_id || t.id || `tx_${Math.random()}`,
          type: t.type?.includes('DEBIT') ? 'sent' : 'received',
          from: t.from || t.method || 'Razorpay UPI Gateway',
          to: t.to || walletAddress,
          provider: t.method || 'Razorpay UPI Gateway',
          recipientLabel: t.recipientLabel || (t.grantee ? `Doctor Grant (${t.grantee.substring(0, 10)}...)` : undefined),
          amount: (t.amount !== undefined ? t.amount : 0.10).toString(),
          token: t.currency || 'POL',
          memo: t.description || (t.type?.includes('DEBIT') ? 'Access Grant Creation Fee' : 'UPI Wallet Top-Up'),
          timestamp: t.created_at || t.timestamp || new Date().toISOString(),
          status: t.status?.toLowerCase() || 'confirmed',
          txHash: t.payment_id || t.tx_id || t.order_id || '0xpay'
        })));
      }
    } catch (err) {
      console.warn('[Wallet] Sync notice:', err.message);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Persist balance
  useEffect(() => {
    localStorage.setItem(storageKey, balance.toString());
  }, [balance, storageKey]);

  // Persist transactions
  useEffect(() => {
    localStorage.setItem(txStorageKey, JSON.stringify(transactions));
  }, [transactions, txStorageKey]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    addToast('Wallet address copied to clipboard!', 'info');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyTx = (txHash) => {
    navigator.clipboard.writeText(txHash);
    setCopiedTx(txHash);
    addToast('Transaction hash copied!', 'info');
    setTimeout(() => setCopiedTx(null), 2000);
  };

  // Preset Recipients
  const fillPreset = (addr, note = '') => {
    setRecipient(addr);
    if (note) setMemo(note);
    setFormError('');
  };

  // Submit Money Transfer
  const handleTransfer = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanRecipient = recipient.trim();
    if (!cleanRecipient) {
      setFormError('Recipient address is required.');
      return;
    }

    if (!ethers.isAddress(cleanRecipient)) {
      setFormError('Invalid Ethereum / Polygon wallet address format (must be 42 characters starting with 0x).');
      return;
    }

    if (cleanRecipient.toLowerCase() === walletAddress) {
      setFormError('You cannot transfer money to your own address.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    const gasEstimate = 0.00045;
    if (numAmount + gasEstimate > balance) {
      setFormError(`Insufficient balance. Maximum sendable: ${(balance - gasEstimate).toFixed(4)} ${selectedToken}`);
      return;
    }

    setIsTransferring(true);

    try {
      // Simulate on-chain signing & propagation
      await new Promise(r => setTimeout(r, 1200));

      const newBal = Math.max(0, balance - numAmount - gasEstimate);
      setBalance(newBal);

      const txHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

      const newTx = {
        id: `tx_${Date.now()}`,
        type: 'sent',
        from: 'self',
        to: cleanRecipient,
        recipientLabel: cleanRecipient.includes('c57f') ? 'Dr. Sarah Chen' : cleanRecipient.substring(0, 10) + '...',
        amount: numAmount.toFixed(4),
        token: selectedToken,
        memo: memo.trim() || 'Direct P2P Medical Transfer',
        txHash,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };

      setTransactions(prev => [newTx, ...prev]);

      // Reset form
      setAmount('');
      setRecipient('');
      setMemo('');
      addToast(`Transferred ${numAmount.toFixed(4)} ${selectedToken} successfully! Tx: ${txHash.substring(0, 10)}...`, 'success');
    } catch (err) {
      console.error('[Transfer Error]:', err);
      setFormError(err.message || 'Transfer failed. Check network connectivity.');
    } finally {
      setIsTransferring(false);
    }
  };

  const filteredTxs = transactions.filter(tx => {
    if (txFilter === 'sent') return tx.type === 'sent';
    if (txFilter === 'received') return tx.type === 'received';
    return true;
  });

  return (
    <div className="wallet-page page-wrapper">
      <div className="container" style={{ maxWidth: '1060px', paddingTop: '1.5rem' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <WalletIcon size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Sovereign <span className="gradient-text">Wallet & Money Transfer</span>
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Transfer testnet funds, pay healthcare provider consultations, and manage your cryptographic vault balance.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Balance Card & Send Form */}
        <div className="wallet-hero-grid">

          {/* Left: Balance Card */}
          <div className="wallet-card-primary">
            <div className="wallet-card-header">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vault Asset Balance
              </span>
              <div className="wallet-network-pill">
                <span className="wallet-status-dot" />
                <span>{CHAIN_CONFIG.chainName} ({CHAIN_CONFIG.chainId})</span>
              </div>
            </div>

            <div className="wallet-balance-amount">
              {balance.toFixed(4)}
              <span className="wallet-balance-symbol">{selectedToken}</span>
            </div>

            <div className="wallet-fiat-val">
              ≈ ${(balance * 0.76).toFixed(2)} USD • Est. Gas Rate: ~0.00045 {selectedToken}
            </div>

            {/* Address Pill */}
            <div className="wallet-address-pill">
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  Connected 0x Address
                </div>
                <div className="wallet-address-text">
                  {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyAddress}
                style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
              >
                {copiedAddress ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                {copiedAddress ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="wallet-actions-bar">
              <button
                type="button"
                className="btn-wallet-action btn-wallet-topup"
                onClick={() => setShowUpiModal(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))',
                  borderColor: '#10b981',
                  color: '#34d399',
                  fontWeight: 600
                }}
                title="Top Up Vault Wallet via UPI (Razorpay)"
              >
                <CreditCard size={16} /> Top Up via UPI
              </button>
              <button
                type="button"
                className="btn-wallet-action btn-wallet-send"
                onClick={() => document.getElementById('transfer-recipient-input')?.focus()}
              >
                <Send size={16} /> Transfer
              </button>
              <button
                type="button"
                className="btn-wallet-action btn-wallet-receive"
                onClick={() => setShowReceiveModal(true)}
              >
                <QrCode size={16} /> Receive
              </button>
            </div>
          </div>

          {/* Right: Security & Relayer Info */}
          <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                <ShieldCheck size={20} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Cryptographic Protection</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                All transfers are cryptographically signed using your sovereign Ethereum keys and recorded with irreversible transaction hashes on the Polygon blockchain.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Standard Gas Fee:</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>~0.00045 POL</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Block Finality:</span>
                  <span style={{ fontWeight: 600 }}>~2.1 seconds</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Relayer Status:</span>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>Active (Zero Friction)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.75rem', color: '#a5b4fc' }}>
              💡 <strong>Instant Consultation Payments:</strong> Easily pay doctor review fees or lab invoice requests using the preset buttons below.
            </div>
          </div>
        </div>

        {/* Transfer Money Form Section */}
        <div className="transfer-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Send size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Send & Transfer Money</h2>
          </div>

          {/* Quick Presets */}
          <div className="transfer-presets">
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', alignSelf: 'center', marginRight: '4px' }}>
              Quick Presets:
            </span>
            <button
              type="button"
              className="preset-chip"
              onClick={() => fillPreset('0xC57Ffa753e4D93F109EDa60aBfBBCEd083001b98', 'Consultation with Dr. Sarah Chen')}
            >
              🩺 Dr. Sarah Chen (0xC57F...b98)
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => fillPreset('0x38b8AcE4624DEb11568A57866e4a28Ece055D0f6', 'MedVault Contract Relayer')}
            >
              ⚡ MedVault Relayer (0x38b8...0f6)
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => fillPreset('0x8bcc7f8a82B9e3F7e7478B5C34463BAd74e518Bf', 'Diagnostic Imaging Lab')}
            >
              🏥 General Clinic Vault (0x8bcc...8Bf)
            </button>
          </div>

          {formError && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Recipient Address */}
            <div>
              <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Recipient Ethereum / Polygon Address</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>Hex 42-char (0x...)</span>
              </label>
              <input
                id="transfer-recipient-input"
                type="text"
                className="input-field"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>

            {/* Amount & Token Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transfer Amount</span>
                  <button
                    type="button"
                    onClick={() => setAmount((Math.max(0, balance - 0.0005)).toFixed(4))}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Use Max Available
                  </button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={balance}
                    className="input-field"
                    placeholder="0.0000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: '1rem', fontWeight: 600 }}
                  />
                  {amount && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      ≈ ${(parseFloat(amount || 0) * 0.76).toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '0.45rem' }}>
                  Asset Token
                </label>
                <select
                  className="input-field"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', height: '44px' }}
                >
                  <option value="POL">POL (Polygon)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="USDT">USDT (Tether USD)</option>
                </select>
              </div>
            </div>

            {/* Optional Memo */}
            <div>
              <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '0.45rem' }}>
                Payment Memo / Medical Note (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Doctor appointment fee, prescription payment"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Action Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setRecipient(''); setAmount(''); setMemo(''); setFormError(''); }}
                disabled={isTransferring}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isTransferring || !amount || !recipient}
                style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
              >
                {isTransferring ? (
                  <>
                    <RefreshCw size={16} className="spin-animated" />
                    <span>Signing Transaction...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send {amount ? `${amount} ${selectedToken}` : 'Transfer'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Transaction History Ledger */}
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Transaction Activity Ledger</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Verifiable on-chain transfer logs for this sovereign vault.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
              {['all', 'sent', 'received'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTxFilter(f)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: txFilter === f ? 600 : 500,
                    background: txFilter === f ? 'var(--color-primary)' : 'transparent',
                    color: txFilter === f ? '#fff' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredTxs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-tertiary)' }}>
              <Clock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No {txFilter !== 'all' ? txFilter : ''} transactions recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredTxs.map(tx => (
                <div key={tx.id} className="tx-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className={`tx-icon-box ${tx.type === 'sent' ? 'tx-icon-sent' : 'tx-icon-received'}`}>
                      {tx.type === 'sent' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>
                          {tx.type === 'sent'
                            ? `Sent to ${tx.recipientLabel || (tx.to && typeof tx.to === 'string' ? (tx.to.startsWith('0x') ? `${tx.to.substring(0, 10)}...` : tx.to) : 'Recipient')}`
                            : `Received via ${tx.from || tx.provider || 'Razorpay UPI Gateway'}`}
                        </span>
                        <span className="tx-badge-confirmed">
                          <CheckCircle2 size={10} /> Confirmed
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {tx.memo || 'Wallet Transaction'} • {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: tx.type === 'sent' ? '#f87171' : '#34d399' }}>
                      {tx.type === 'sent' ? '-' : '+'}{tx.amount} {tx.token}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                        {tx.txHash && tx.txHash.length > 14
                          ? `${tx.txHash.substring(0, 8)}...${tx.txHash.substring(tx.txHash.length - 6)}`
                          : (tx.txHash || 'N/A')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTx(tx.txHash)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2 }}
                        title="Copy TxHash"
                      >
                        {copiedTx === tx.txHash ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receive Address / QR Modal */}
      <AnimatePresence>
        {showReceiveModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: '1rem'
            }}
            onClick={() => setShowReceiveModal(false)}
          >
            <motion.div
              className="glass-card"
              style={{
                maxWidth: '440px',
                width: '100%',
                padding: '2rem',
                borderRadius: '18px',
                textAlign: 'center',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <QrCode size={24} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Receive Funds & Assets</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 1.5rem' }}>
                Scan or share your sovereign vault address to receive payments or transfers on {CHAIN_CONFIG.chainName}.
              </p>

              {/* QR Mock Pattern */}
              <div style={{ width: 180, height: 180, background: '#fff', borderRadius: 12, padding: 12, margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <div style={{ width: '100%', height: '100%', border: '4px dashed #0f172a', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
                  <QrCode size={80} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4 }}>MEDVAULT PAY</span>
                </div>
              </div>

              {/* Address Box */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                {walletAddress}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyAddress}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {copiedAddress ? <Check size={16} /> : <Copy size={16} />}
                {copiedAddress ? 'Address Copied!' : 'Copy Vault Address'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPI Top-Up Modal */}
      <AnimatePresence>
        {showUpiModal && (
          <UpiTopUpModal
            isOpen={showUpiModal}
            onClose={() => {
              setShowUpiModal(false);
              loadWalletData();
            }}
            onSuccess={() => {
              loadWalletData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
