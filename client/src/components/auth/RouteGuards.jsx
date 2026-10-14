'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';

// Page transition animations
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } }
};

export function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--color-primary, #6366f1)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
    </div>
  );
}

/**
 * Protected route — redirects to /auth if not signed in, and ensures Doctor vs Patient separation
 */
export function PatientRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!isConnected || !user) {
        router.replace('/auth?mode=signin&role=patient');
      } else if (user?.role === 'doctor') {
        router.replace('/doctor-access');
      }
    }
  }, [authLoading, isConnected, user, router]);

  if (authLoading) return <LoadingSpinner />;
  if (!isConnected || !user || user?.role === 'doctor') return <LoadingSpinner />;

  return children;
}

/**
 * Doctor portal route — requires doctor credentials
 */
export function DoctorRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!isConnected || !user) {
        router.replace('/auth?mode=signin&role=doctor');
      } else if (user?.role === 'patient') {
        router.replace('/dashboard');
      }
    }
  }, [authLoading, isConnected, user, router]);

  if (authLoading) return <LoadingSpinner />;
  if (!isConnected || !user || user?.role === 'patient') return <LoadingSpinner />;

  return children;
}

/**
 * General authenticated route — requires signed-in session (e.g., Database, AI Copilot, Settings)
 */
export function AuthenticatedRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!isConnected || !user)) {
      router.replace('/auth?mode=signin');
    }
  }, [authLoading, isConnected, user, router]);

  if (authLoading) return <LoadingSpinner />;
  if (!isConnected || !user) return <LoadingSpinner />;

  return children;
}

/**
 * Guest-only route — redirects to appropriate role portal if already signed in
 */
export function GuestRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isConnected && user) {
      router.replace(user?.role === 'doctor' ? '/doctor-access' : '/dashboard');
    }
  }, [authLoading, isConnected, user, router]);

  if (authLoading) return <LoadingSpinner />;
  if (isConnected && user) return <LoadingSpinner />;

  return children;
}
