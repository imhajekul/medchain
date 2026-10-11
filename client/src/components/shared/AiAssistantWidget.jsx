import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Shield, Maximize2, Minimize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import './AiAssistantWidget.css';

export default function AiAssistantWidget() {
  const { isConnected, user, records, grants } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hi! I am your MedVault AI Copilot. How can I assist with your medical records or access grants today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

  if (!isConnected) return null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg = { id: `u_${Date.now()}`, sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-4).map(m => ({ sender: m.sender, text: m.text }));
      const context = {
        role: user?.role || 'patient',
        recordsCount: records?.length || 0,
        activeGrantsCount: grants?.filter(g => g.status === 'active')?.length || 0
      };

      const res = await api.aiChat(userText, history, context);
      const botMsg = {
        id: `b_${Date.now()}`,
        sender: 'assistant',
        text: res.reply || 'I processed your request.'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: `err_${Date.now()}`, sender: 'assistant', text: `⚠️ ${err.message || 'AI Copilot unavailable.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-widget-wrapper">
      <AnimatePresence>
        {open && (
          <motion.div
            className="ai-widget-popup glass-card"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="ai-widget-header">
              <div className="ai-widget-header-title">
                <Bot size={20} className="ai-widget-icon" />
                <div>
                  <div className="ai-widget-name">MedVault Copilot</div>
                  <div className="ai-widget-badge">Zero Plaintext Exposure</div>
                </div>
              </div>
              <div className="ai-widget-header-actions">
                <button
                  className="ai-widget-btn-icon"
                  onClick={() => {
                    setOpen(false);
                    navigate('/assistant');
                  }}
                  title="Full Screen Assistant"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  className="ai-widget-btn-icon"
                  onClick={() => setOpen(false)}
                  title="Close Widget"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="ai-widget-messages">
              {messages.map((m) => (
                <div key={m.id} className={`ai-widget-msg ${m.sender === 'user' ? 'msg-user' : 'msg-bot'}`}>
                  <div className="ai-widget-bubble">
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ai-widget-msg msg-bot">
                  <div className="ai-widget-bubble ai-widget-typing">
                    <span>Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="ai-widget-footer" onSubmit={handleSend}>
              <input
                type="text"
                className="ai-widget-input"
                placeholder="Ask about labs or grants..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="ai-widget-send-btn"
                disabled={!input.trim() || loading}
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="ai-widget-launcher"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title="Chat with MedVault AI Copilot"
      >
        <Bot size={24} />
        <span className="ai-launcher-pulse" />
      </motion.button>
    </div>
  );
}
