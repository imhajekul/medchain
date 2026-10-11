import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Sparkles, Shield, User, RefreshCw, AlertCircle,
  FileText, CheckCircle2, ChevronRight, Stethoscope, HeartHandshake,
  Database, Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import './AiAssistant.css';

const QUICK_PROMPTS = [
  {
    icon: '🔬',
    title: 'Explain Lab Results',
    prompt: 'Can you explain what abnormal liver enzymes (ALT/AST) and high triglycerides typically mean?'
  },
  {
    icon: '🛡️',
    title: 'Access Grants Security',
    prompt: 'How do MedVault time-boxed access grants protect my medical privacy compared to traditional hospitals?'
  },
  {
    icon: '💊',
    title: 'Medication Safety',
    prompt: 'What are essential safety precautions and drug interactions to keep in mind when taking blood pressure medication?'
  },
  {
    icon: '📋',
    title: 'Doctor Visit Prep',
    prompt: 'Help me draft a concise list of 4 key questions to ask my specialist during my next consultation.'
  }
];

export default function AiAssistant() {
  const { user, records, grants } = useApp();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello **${user?.displayName || 'there'}**! I am your **MedVault AI Copilot** 🩺.

I can help you:
- **Demystify complex lab results & imaging reports** (CBC, metabolic panels, MRI findings).
- **Audit your cryptographic access grants** to maintain strict zero-exposure privacy.
- **Formulate targeted questions** for your next physician consultation.
- **Review medication precautions** and safety guidelines.

*Select a quick topic below or type any medical question.*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'records-summary'
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const contextPayload = {
        role: user?.role || 'patient',
        recordsCount: records?.length || 0,
        activeGrantsCount: grants?.filter(g => g.status === 'active')?.length || 0,
        recordLabels: records?.slice(0, 5).map(r => r.label) || []
      };

      const res = await api.aiChat(userMsg.text, historyPayload, contextPayload);

      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: res.reply || 'I processed your request, but could not produce a detailed response.',
        provider: res.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('[AI Chat Error]:', err);
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        isError: true,
        text: `⚠️ **Notice:** ${err.message || 'Unable to connect to MedVault AI Copilot right now. Please verify your server connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist you with your health records today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Render markdown-like simple syntax into bold, lists, and headers
  const renderFormattedText = (raw) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="ai-md-h4">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="ai-md-h3">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="ai-md-quote">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        return (
          <li key={idx} className="ai-md-li">
            <span dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="ai-md-spacer" />;
      }
      return (
        <p key={idx} className="ai-md-p" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    });
  };

  const formatInline = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  return (
    <div className="ai-assistant-page page-wrapper">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="container ai-assistant-container">
        {/* Header Banner */}
        <motion.div
          className="ai-header-card glass-card"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="ai-header-main">
            <div className="ai-avatar-badge">
              <Bot size={28} className="ai-avatar-icon" />
              <span className="ai-live-pulse" />
            </div>
            <div>
              <div className="ai-title-row">
                <h1 className="ai-title">MedVault <span className="gradient-text">AI Copilot</span></h1>
                <span className="ai-pill-badge">Zero-Exposure Protected</span>
              </div>
              <p className="ai-subtitle">
                Clinical-grade record interpretation, grant auditing, and physician visit prep.
              </p>
            </div>
          </div>

          <div className="ai-header-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClearChat}
              title="Reset conversation"
            >
              <RefreshCw size={14} /> Clear Chat
            </button>
          </div>
        </motion.div>

        {/* Zero PHI Privacy Guarantee Alert */}
        <div className="ai-privacy-banner">
          <Shield size={16} className="ai-shield-icon" />
          <span>
            <strong>Zero Plaintext PHI Guarantee:</strong> MedVault stores files encrypted client-side with AES-256-GCM. Conversations with AI Copilot are strictly bounded to metadata & educational explanations without uploading unencrypted patient files.
          </span>
        </div>

        {/* Main Chat Interface */}
        <div className="ai-chat-card glass-card">
          {/* Quick Prompts Bar */}
          <div className="ai-quick-prompts">
            {QUICK_PROMPTS.map((qp, index) => (
              <motion.button
                key={index}
                className="ai-quick-chip"
                onClick={() => handleSend(qp.prompt)}
                disabled={loading}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="quick-chip-emoji">{qp.icon}</span>
                <span className="quick-chip-text">{qp.title}</span>
              </motion.button>
            ))}
          </div>

          {/* Conversation Feed */}
          <div className="ai-messages-scroll">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  className={`ai-message-row ${m.sender === 'user' ? 'msg-user' : 'msg-bot'}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="ai-msg-avatar">
                    {m.sender === 'user' ? <User size={16} /> : <Bot size={18} />}
                  </div>
                  <div className={`ai-msg-bubble ${m.isError ? 'msg-bubble-error' : ''}`}>
                    <div className="ai-msg-content">
                      {m.sender === 'user' ? (
                        <p>{m.text}</p>
                      ) : (
                        renderFormattedText(m.text)
                      )}
                    </div>
                    <div className="ai-msg-footer">
                      <span className="ai-msg-time">{m.timestamp}</span>
                      {m.provider && (
                        <span className="ai-msg-provider">
                          <Sparkles size={10} /> {m.provider}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                className="ai-message-row msg-bot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="ai-msg-avatar">
                  <Bot size={18} />
                </div>
                <div className="ai-msg-bubble ai-typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-text">Analyzing clinical context...</span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <form
            className="ai-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask a medical question, explain a lab test, or query access grants..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <motion.button
              type="submit"
              className="btn btn-primary ai-send-btn"
              disabled={!input.trim() || loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={18} />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
