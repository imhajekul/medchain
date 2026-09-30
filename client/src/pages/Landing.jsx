import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Clock, ArrowRight, FileText, Users, Activity, Zap, ChevronRight } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  const handleConnect = () => {
    navigate('/auth');
  };

  const features = [
    {
      icon: <Lock size={24} />,
      title: 'Client-Side Encryption',
      desc: 'Records are encrypted in your browser before upload. No one — not even us — can see your data.',
      color: 'accent'
    },
    {
      icon: <Eye size={24} />,
      title: 'Verifiable Audit Trail',
      desc: 'Every access is recorded on-chain. See exactly who viewed your records and when.',
      color: 'blue'
    },
    {
      icon: <Clock size={24} />,
      title: 'Time-Boxed Access',
      desc: 'Grant doctors access that auto-expires. No manual revocation needed.',
      color: 'purple'
    }
  ];

  const stats = [
    { value: '256-bit', label: 'AES Encryption' },
    { value: '100%', label: 'Patient Controlled' },
    { value: 'On-Chain', label: 'Audit Trail' },
    { value: 'Zero', label: 'Data Exposure' },
  ];

  const steps = [
    { num: '01', title: 'Connect Wallet', desc: 'Sign in with your wallet or use abstracted login — no crypto knowledge needed.', icon: <Zap size={20} /> },
    { num: '02', title: 'Upload & Encrypt', desc: 'Upload your lab results. They\'re encrypted in your browser before leaving your device.', icon: <FileText size={20} /> },
    { num: '03', title: 'Grant Access', desc: 'Share with your doctor using a time-boxed grant. Access auto-expires on schedule.', icon: <Users size={20} /> },
    { num: '04', title: 'Track Everything', desc: 'View a tamper-proof log of every access event, stored on the blockchain.', icon: <Activity size={20} /> },
  ];

  return (
    <div className="landing">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="hero-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Shield size={14} />
              <span>Patient-Owned Medical Records</span>
            </motion.div>

            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Your Records.{' '}
              <span className="hero-title-gradient">Your Rules.</span>
            </motion.h1>

            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              Share exactly what you choose, with who you choose, for as long as you choose — with a permanent, verifiable record of every access.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <motion.button
                className="btn btn-primary btn-lg hero-cta"
                onClick={handleConnect}
                whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(2, 132, 199, 0.3)' }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
                <ArrowRight size={18} />
              </motion.button>
              <motion.button
                className="btn btn-secondary btn-lg"
                onClick={() => navigate('/auth')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                I'm a Doctor
                <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hero-image-wrapper">
              <motion.img 
                src="/hero.jpg" 
                alt="MedVault Secure Records" 
                className="hero-main-image"
                style={{ width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 40px rgba(2, 132, 199, 0.2)', border: '1px solid var(--color-border)', display: 'block' }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container">
          <motion.div
            className="stats-grid"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="stat-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-tag">Why MedVault</span>
            <h2 className="section-title">Medical data privacy, reinvented</h2>
            <p className="section-subtitle">
              Raw health data never touches the blockchain. Only access permissions and audit events do — giving you a tamper-proof trail you can trust.
            </p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className={`feature-card glass-card`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ y: -4, borderColor: 'rgba(2, 132, 199, 0.3)' }}
              >
                <div className={`feature-icon feature-icon-${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="steps-section">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-tag">How It Works</span>
            <h2 className="section-title">Four steps to full control</h2>
          </motion.div>

          <div className="steps-grid">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="step-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <div className="step-number">{step.num}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {i < steps.length - 1 && <div className="step-connector" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <motion.div
            className="cta-card glass-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="cta-glow" />
            <h2 className="cta-title">Take control of your medical records</h2>
            <p className="cta-subtitle">
              Your records, your rules. Connect your wallet and start sharing securely.
            </p>
            <motion.button
              className="btn btn-primary btn-lg"
              onClick={handleConnect}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <Shield size={18} />
              <span>MedVault</span>
            </div>
            <p className="footer-text">
              Built for the Journey to Mastery program. Patient-owned, blockchain-verified medical records.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
