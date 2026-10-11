import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Smartphone, CheckCircle2, AlertCircle, X,
  ShieldCheck, ArrowRight, RefreshCw, AlertTriangle, Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import './UpiTopUpModal.css';

const PRESET_AMOUNTS = [
  { inr: 50, pol: 0.10, label: '1 Grant (0.10 POL)' },
  { inr: 100, pol: 0.20, label: '2 Grants (0.20 POL)' },
  { inr: 250, pol: 0.50, label: '5 Grants (0.50 POL)' },
  { inr: 500, pol: 1.00, label: '10 Grants (1.00 POL)' }
];

export default function UpiTopUpModal({ isOpen, onClose, onSuccess, initialAmountInr = 50 }) {
  const { user, addToast, refreshWalletBalance } = useApp();
  const [selectedInr, setSelectedInr] = useState(initialAmountInr);
  const [customInr, setCustomInr] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [testModeNotice, setTestModeNotice] = useState(null);
  const [isAwaitingWebhook, setIsAwaitingWebhook] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const currentAmountInr = customInr ? Number(customInr) : selectedInr;
  const calculatedPol = Number((currentAmountInr / 500).toFixed(4));

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayViaRazorpay = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      if (currentAmountInr < 10) {
        throw new Error('Minimum top-up amount is ₹10.');
      }

      // 1. Request real order_id from backend
      const order = await api.createRazorpayOrder(currentAmountInr);

      // 2. If Gateway is in Test Mode / credentials unconfigured, halt and display test notice
      if (order.isTestMode || !order.keyId) {
        setIsProcessing(false);
        setTestModeNotice({
          orderId: order.orderId,
          amountInr: currentAmountInr,
          polAmount: order.polAmount,
          message: order.message || 'UPI Gateway in Test Mode: Real funds transfer is disabled'
        });
        return;
      }

      // 3. Live Mode: Load official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay payment gateway script. Please check your internet connection.');
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'MedVault Healthcare',
        description: `Vault Wallet Top-Up (${order.polAmount} POL)`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || 'MedVault User',
          email: user?.email || 'patient@medvault.app',
          contact: ''
        },
        theme: {
          color: '#3b82f6'
        },
        handler: async function (response) {
          try {
            setIsAwaitingWebhook(true);

            // Send signature to backend for verification
            await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amountInr: currentAmountInr,
              polAmount: order.polAmount
            });

            // Poll server for webhook confirmation (funds credited strictly via server webhook)
            let confirmed = false;
            for (let attempt = 0; attempt < 3; attempt++) {
              await new Promise(r => setTimeout(r, 2000));
              const balData = await api.getWalletBalance();
              const hasPaymentTx = balData?.transactions?.some(
                t => t.payment_id === response.razorpay_payment_id || t.order_id === response.razorpay_order_id
              );
              if (hasPaymentTx || typeof balData?.balance === 'number') {
                confirmed = true;
                await refreshWalletBalance();
                setPaymentSuccess({
                  amountInr: currentAmountInr,
                  polAmount: order.polAmount,
                  txId: response.razorpay_payment_id,
                  newBalance: balData.balance,
                  provider: 'Razorpay UPI Gateway'
                });
                if (onSuccess) onSuccess(balData.balance);
                break;
              }
            }

            if (!confirmed) {
              await refreshWalletBalance();
              addToast('Payment captured. Vault balance will update upon webhook settlement.', 'info');
              setIsAwaitingWebhook(false);
              setIsProcessing(false);
              onClose();
            }
          } catch (verErr) {
            console.error('[Verification Error]:', verErr);
            setErrorMsg(verErr.message || 'Signature verification failed.');
            addToast(verErr.message || 'Payment signature verification failed', 'error');
          } finally {
            setIsProcessing(false);
            setIsAwaitingWebhook(false);
          }
        },
        modal: {
          ondismiss: function () {
            // Do NOT credit tokens or record a transaction on modal close or dismiss
            setIsProcessing(false);
            addToast('Payment checkout closed. No funds were debited or credited.', 'info');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setIsProcessing(false);
        addToast(`Payment failed: ${resp.error?.description || 'Unknown error'}`, 'error');
      });
      rzp.open();
    } catch (err) {
      console.error('[UPI Payment Error]:', err);
      setErrorMsg(err.message || 'Failed to initiate UPI checkout');
      addToast(err.message || 'Failed to initiate payment', 'error');
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setTestModeNotice(null);
    setPaymentSuccess(null);
    setIsAwaitingWebhook(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="upi-modal-overlay" onClick={resetModal}>
      <motion.div
        className="upi-modal-card"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="upi-modal-header">
          <div className="upi-modal-title-row">
            <div className="upi-icon-badge">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="upi-modal-title">Top Up Wallet via UPI</h2>
              <p className="upi-modal-subtitle">Razorpay Gateway • Verified Webhook Settlement</p>
            </div>
          </div>
          <button className="upi-close-btn" onClick={resetModal} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* View 1: Test Mode Warning Card (No Artificial Credits) */}
        {testModeNotice ? (
          <div className="upi-test-mode-view">
            <div className="upi-test-mode-icon">
              <AlertTriangle size={48} />
            </div>
            <h3 className="upi-test-mode-title">UPI Gateway in Test Mode</h3>
            <p className="upi-test-mode-subtitle">
              <strong>Real funds transfer is disabled.</strong>
            </p>
            <p className="upi-test-mode-desc">
              Live Razorpay credentials (<code>RAZORPAY_KEY_ID</code> &amp; <code>RAZORPAY_KEY_SECRET</code>)
              are not yet configured on this server. In accordance with MedVault security invariants,
              artificial client-side tokens and unverified mock balances are strictly disabled.
            </p>

            <div className="upi-receipt-card">
              <div className="upi-receipt-row">
                <span>Order Reference:</span>
                <code>{testModeNotice.orderId}</code>
              </div>
              <div className="upi-receipt-row">
                <span>Requested Amount:</span>
                <span>₹{testModeNotice.amountInr} ({testModeNotice.polAmount} POL)</span>
              </div>
              <div className="upi-receipt-row">
                <span>Gateway Status:</span>
                <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  Test Mode • Zero Artificial Credit
                </span>
              </div>
              <div className="upi-receipt-row">
                <span>Action Required:</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Add Razorpay API keys to server <code>.env</code></span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-lg"
              style={{ width: '100%', marginTop: '1.5rem' }}
              onClick={resetModal}
            >
              Acknowledge &amp; Close
            </button>
          </div>
        ) : paymentSuccess ? (
          /* View 2: Verified Webhook Payment Success */
          <div className="upi-success-view">
            <motion.div
              className="upi-success-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h3>Payment Confirmed via Webhook!</h3>
            <p className="upi-success-text">
              Credited <strong>{paymentSuccess.polAmount} POL</strong> (₹{paymentSuccess.amountInr}) to your vault wallet.
            </p>
            <div className="upi-receipt-card">
              <div className="upi-receipt-row">
                <span>Provider:</span>
                <strong>{paymentSuccess.provider || 'Razorpay UPI Gateway'}</strong>
              </div>
              <div className="upi-receipt-row">
                <span>Payment Reference:</span>
                <code>{paymentSuccess.txId}</code>
              </div>
              <div className="upi-receipt-row">
                <span>Updated Balance:</span>
                <strong>{paymentSuccess.newBalance?.toFixed(4)} POL</strong>
              </div>
              <div className="upi-receipt-row">
                <span>Database Sync:</span>
                <span className="badge badge-success">MongoDB Cluster0 • Verified</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.25rem' }}
              onClick={resetModal}
            >
              Done &amp; Return
            </button>
          </div>
        ) : isAwaitingWebhook ? (
          /* View 3: Awaiting Webhook Finalization */
          <div className="upi-awaiting-view">
            <RefreshCw size={44} className="spin-animation" style={{ color: '#38bdf8', marginBottom: '1rem' }} />
            <h3>Verifying Webhook Settlement...</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', maxWidth: '360px', margin: '0.5rem auto 1.5rem' }}>
              Your UPI payment was received by Razorpay. MedVault server is validating the cryptographic HMAC webhook signature.
            </p>
          </div>
        ) : (
          /* View 4: Standard Top-Up Form */
          <div className="upi-modal-body">
            {errorMsg && (
              <div className="upi-error-banner">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Amount Selection */}
            <div className="upi-section">
              <label className="upi-label">Select Top-Up Amount</label>
              <div className="upi-preset-grid">
                {PRESET_AMOUNTS.map(preset => (
                  <button
                    key={preset.inr}
                    type="button"
                    className={`upi-preset-btn ${selectedInr === preset.inr && !customInr ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedInr(preset.inr);
                      setCustomInr('');
                    }}
                  >
                    <div className="preset-inr">₹{preset.inr}</div>
                    <div className="preset-pol">+{preset.pol} POL</div>
                    <div className="preset-note">{preset.label}</div>
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="upi-custom-input-wrap">
                <span className="upi-currency-symbol">₹</span>
                <input
                  type="number"
                  className="upi-custom-input"
                  placeholder="Or enter custom INR amount (min ₹10)"
                  value={customInr}
                  onChange={e => setCustomInr(e.target.value)}
                  min="10"
                />
              </div>
            </div>

            {/* Conversion Summary Banner */}
            <div className="upi-conversion-card">
              <div className="conversion-row">
                <span>You Pay:</span>
                <strong className="text-white">₹{currentAmountInr} INR</strong>
              </div>
              <div className="conversion-arrow">
                <ArrowRight size={16} />
              </div>
              <div className="conversion-row">
                <span>You Receive:</span>
                <strong className="text-neon-cyan">{calculatedPol} POL</strong>
              </div>
            </div>

            {/* Supported UPI Apps */}
            <div className="upi-apps-row">
              <span className="upi-apps-title">Supported UPI Options:</span>
              <div className="upi-badge-list">
                <span className="upi-app-badge">GPay</span>
                <span className="upi-app-badge">PhonePe</span>
                <span className="upi-app-badge">Paytm</span>
                <span className="upi-app-badge">BHIM</span>
                <span className="upi-app-badge">Cred</span>
                <span className="upi-app-badge">Any UPI ID / QR</span>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="upi-security-note">
              <ShieldCheck size={16} />
              <span>Secured by Razorpay HMAC-SHA256 Webhook Verification.</span>
            </div>

            {/* Pay Button */}
            <motion.button
              type="button"
              className="btn btn-primary btn-lg upi-submit-btn"
              onClick={handlePayViaRazorpay}
              disabled={isProcessing || currentAmountInr < 10}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="spin-animation" />
                  Initiating Razorpay Checkout...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Pay ₹{currentAmountInr} via UPI (Razorpay)
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
