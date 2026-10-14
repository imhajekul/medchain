'use client';

import React from 'react';
import { AppProvider } from '../context/AppContext';
import Navbar from '../components/layout/Navbar';
import ToastContainer from '../components/shared/Toast';
import AiAssistantWidget from '../components/shared/AiAssistantWidget';
import AmbientGlowCursor from '../components/shared/AmbientGlowCursor';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export default function Providers({ children }) {
  return (
    <ErrorBoundary title="MedVault App Error">
      <AppProvider>
        <AmbientGlowCursor />
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <ToastContainer />
        <AiAssistantWidget />
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/xvivo-hero.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            zIndex: -2,
            opacity: 0.3,
            filter: 'contrast(1.2)'
          }} 
        />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </AppProvider>
    </ErrorBoundary>
  );
}
