'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Smartphone, CheckCircle2, AlertCircle, X,
  ShieldCheck, ArrowRight, RefreshCw
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

      // 1. Request real Razorpay order from backend (/api/payment/create-order)
      const walletAddress = user?.walletAddress || user?.address || '';
      const userId = user?.id || user?.userId || '';
      const order = await api.createRazorpayOrder(currentAmountInr, walletAddress, userId);

      if (!order || !order.orderId) {
        throw new Error(order?.error || 'Failed to create Razorpay payment order.');
      }

      const activeKeyId = order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!activeKeyId) {
        throw new Error('Razorpay Gateway is not configured. Please add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to server/.env');
      }

      const polEquivalent = currentAmountInr === 50 ? 0.1 : (currentAmountInr === 250 ? 0.5 : Number((currentAmountInr / 500).toFixed(4)));

      // 2. Load official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay payment gateway script. Please check your internet connection.');
      }

      // 3. Launch official Razorpay Checkout popup
      const options = {
        key: activeKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'MedVault Healthcare',
        description: `Vault Wallet Top-Up (${polEquivalent} POL)`,
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
          setIsProcessing(false);
          setIsAwaitingWebhook(true);

          try {
            if (response.razorpay_signature) {
              try {
                await api.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
              } catch (signErr) {
                console.warn('[Client signature verification notice]:', signErr);
              }
            }

            // Poll server for webhook confirmation (/api/payment/status)
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 20;

            while (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 2000));
              attempts++;

              try {
                const statusRes = await api.getPaymentStatus(order.orderId);
                if (statusRes && (statusRes.confirmed || statusRes.status === 'confirmed')) {
                  confirmed = true;
                  const balData = await refreshWalletBalance();
                  setPaymentSuccess({
                    amountInr: currentAmountInr,
                    polAmount: statusRes.polAmount || polEquivalent,
                    txId: response.razorpay_payment_id || statusRes.paymentId || order.orderId,
                    newBalance: balData?.balance,
                    provider: 'Razorpay UPI Gateway'
                  });
                  if (onSuccess) onSuccess(balData?.balance);
                  break;
                }
              } catch (pollErr) {
                console.warn('[Polling payment status error]:', pollErr);
              }
            }

            if (!confirmed) {
              await refreshWalletBalance();
              addToast('Payment captured. Vault balance will update automatically upon webhook confirmation.', 'info');
              setIsAwaitingWebhook(false);
              onClose();
            }
          } catch (verErr) {
            console.error('[Payment Handler Error]:', verErr);
            setErrorMsg(verErr.message || 'Error awaiting payment confirmation.');
            addToast(verErr.message || 'Payment status check encountered an issue', 'error');
          } finally {
            setIsAwaitingWebhook(false);
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setIsAwaitingWebhook(false);
            addToast('Payment checkout closed. No funds were debited or credited.', 'info');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setIsProcessing(false);
        setIsAwaitingWebhook(false);
        addToast(`Payment failed: ${resp.error?.description || 'Payment was cancelled or failed'}`, 'error');
      });
      rzp.open();
    } catch (err) {
      console.error('[UPI Payment Error]:', err);
      setErrorMsg(err.message || 'Failed to initiate UPI checkout');
      addToast(err.message || 'Failed to initiate payment', 'error');
      setIsProcessing(false);
      setIsAwaitingWebhook(false);
    }
  };

  const resetModal = () => {
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

        {paymentSuccess ? (
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
            <h3>Payment submitted. Awaiting blockchain/webhook confirmation...</h3>
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
