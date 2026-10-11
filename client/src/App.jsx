import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import ToastContainer from './components/shared/Toast';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import UploadRecord from './pages/UploadRecord';
import RecordDetail from './pages/RecordDetail';
import DoctorAccess from './pages/DoctorAccess';
import AiAssistant from './pages/AiAssistant';
import DatabaseViewer from './pages/DatabaseViewer';
import AiAssistantWidget from './components/shared/AiAssistantWidget';
import NotFound from './pages/NotFound';

// Page transition wrapper
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } }
};

function PageTransition({ children }) {
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

// Protected route — redirects to /auth if not signed in, and ensures Doctor vs Patient separation
function PatientRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  if (!isConnected) return <Navigate to="/auth?mode=signin&role=patient" replace />;
  if (user?.role === 'doctor') return <Navigate to="/doctor-access" replace />;
  return children;
}

// Doctor portal route — requires doctor credentials
function DoctorRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  if (!isConnected) return <Navigate to="/auth?mode=signin&role=doctor" replace />;
  if (user?.role === 'patient') return <Navigate to="/dashboard" replace />;
  return children;
}

// General authenticated route — requires signed-in session (e.g., Database, AI Copilot)
function AuthenticatedRoute({ children }) {
  const { isConnected, authLoading } = useApp();
  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  if (!isConnected) return <Navigate to="/auth?mode=signin" replace />;
  return children;
}

// Guest-only route — redirects to appropriate role portal if already signed in
function GuestRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  if (isConnected) {
    return <Navigate to={user?.role === 'doctor' ? '/doctor-access' : '/dashboard'} replace />;
  }
  return children;
}

// Animated routes
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition><Landing /></PageTransition>
        } />
        <Route path="/auth" element={
          <GuestRoute>
            <PageTransition><Auth /></PageTransition>
          </GuestRoute>
        } />
        <Route path="/dashboard" element={
          <PatientRoute>
            <PageTransition><Dashboard /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/upload" element={
          <PatientRoute>
            <PageTransition><UploadRecord /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/record/:id" element={
          <PatientRoute>
            <PageTransition><RecordDetail /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/doctor-access" element={
          <DoctorRoute>
            <PageTransition><DoctorAccess /></PageTransition>
          </DoctorRoute>
        } />
        <Route path="/assistant" element={
          <AuthenticatedRoute>
            <PageTransition><AiAssistant /></PageTransition>
          </AuthenticatedRoute>
        } />
        <Route path="/database" element={
          <AuthenticatedRoute>
            <PageTransition><DatabaseViewer /></PageTransition>
          </AuthenticatedRoute>
        } />
        <Route path="*" element={
          <PageTransition><NotFound /></PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary title="MedVault App Error">
        <AppProvider>
          <Navbar />
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
          <ToastContainer />
          <AiAssistantWidget />
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
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
    </BrowserRouter>
  );
}
