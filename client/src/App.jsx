import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import ToastContainer from './components/shared/Toast';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import Landing from './views/Landing';
import Auth from './views/Auth';
import Dashboard from './views/Dashboard';
import UploadRecord from './views/UploadRecord';
import RecordDetail from './views/RecordDetail';
import RecordsPage from './views/RecordsPage';
import AccessGrantsPage from './views/AccessGrantsPage';
import ActivityPage from './views/ActivityPage';
import SecurityPage from './views/SecurityPage';
import SettingsPage from './views/SettingsPage';
import DoctorAccess from './views/DoctorAccess';
import AiAssistant from './views/AiAssistant';
import Wallet from './views/Wallet';
import AiAssistantWidget from './components/shared/AiAssistantWidget';
import NotFound from './views/NotFound';

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
  if (!isConnected || !user) return <Navigate to="/auth?mode=signin&role=patient" replace />;
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
  if (!isConnected || !user) return <Navigate to="/auth?mode=signin&role=doctor" replace />;
  if (user?.role === 'patient') return <Navigate to="/dashboard" replace />;
  return children;
}

// General authenticated route — requires signed-in session (e.g., Database, AI Copilot)
function AuthenticatedRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  if (!isConnected || !user) return <Navigate to="/auth?mode=signin" replace />;
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
  if (isConnected && user) {
    return <Navigate to={user?.role === 'doctor' ? '/doctor-access' : '/dashboard'} replace />;
  }
  return children;
}

// Animated routes
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
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
        {/* Dedicated Records Management Routes */}
        <Route path="/records" element={
          <PatientRoute>
            <PageTransition><RecordsPage /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/records/upload" element={
          <PatientRoute>
            <PageTransition><UploadRecord /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/upload" element={
          <PatientRoute>
            <PageTransition><UploadRecord /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/records/:id" element={
          <PatientRoute>
            <PageTransition><RecordDetail /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/record/:id" element={
          <PatientRoute>
            <PageTransition><RecordDetail /></PageTransition>
          </PatientRoute>
        } />
        {/* Dedicated Access Grants & Permissions */}
        <Route path="/grants" element={
          <PatientRoute>
            <PageTransition><AccessGrantsPage /></PageTransition>
          </PatientRoute>
        } />
        <Route path="/access-grants" element={
          <PatientRoute>
            <PageTransition><AccessGrantsPage /></PageTransition>
          </PatientRoute>
        } />
        {/* Dedicated Activity & Audit Logs */}
        <Route path="/activity" element={
          <AuthenticatedRoute>
            <PageTransition><ActivityPage /></PageTransition>
          </AuthenticatedRoute>
        } />
        <Route path="/audit-logs" element={
          <AuthenticatedRoute>
            <PageTransition><ActivityPage /></PageTransition>
          </AuthenticatedRoute>
        } />
        {/* Dedicated Key Management & Security */}
        <Route path="/security" element={
          <AuthenticatedRoute>
            <PageTransition><SecurityPage /></PageTransition>
          </AuthenticatedRoute>
        } />
        <Route path="/keys" element={
          <AuthenticatedRoute>
            <PageTransition><SecurityPage /></PageTransition>
          </AuthenticatedRoute>
        } />
        {/* Dedicated Account & Profile Settings */}
        <Route path="/settings" element={
          <AuthenticatedRoute>
            <PageTransition><SettingsPage /></PageTransition>
          </AuthenticatedRoute>
        } />
        <Route path="/profile" element={
          <AuthenticatedRoute>
            <PageTransition><SettingsPage /></PageTransition>
          </AuthenticatedRoute>
        } />
        {/* Doctor Portal */}
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
        <Route path="/wallet" element={
          <AuthenticatedRoute>
            <PageTransition><Wallet /></PageTransition>
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
