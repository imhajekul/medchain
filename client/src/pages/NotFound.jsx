import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <div className="not-found-bg-decor" />
      
      {/* Dynamic floating background elements */}
      <motion.div 
        className="not-found-floating float-1"
        animate={{ y: [-20, 20, -20], rotate: [0, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        4
      </motion.div>
      <motion.div 
        className="not-found-floating float-2"
        animate={{ y: [20, -20, 20], rotate: [0, -5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        4
      </motion.div>

      <motion.div
        className="not-found-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div 
          className="not-found-icon-wrapper"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <div className="not-found-icon-bg" />
          <FileQuestion size={80} className="not-found-icon" strokeWidth={1.5} />
        </motion.div>

        <motion.h1 
          className="not-found-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          404
        </motion.h1>

        <motion.h2 
          className="not-found-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Page Not Found
        </motion.h2>

        <motion.p 
          className="not-found-desc"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          The medical record or page you are looking for has been moved, 
          deleted, or never existed in the vault.
        </motion.p>

        <motion.div 
          className="not-found-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary btn-lg"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-primary btn-lg"
          >
            <Home size={18} />
            <span>Return Home</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
