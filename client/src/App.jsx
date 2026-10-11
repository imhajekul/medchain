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
  if (authLoading) return null; // wait for session restore
  if (!isConnected) return <Navigate to="/auth?mode=signin&role=patient" replace />;
  if (user?.role === 'doctor') return <Navigate to="/doctor-access" replace />;
  return children;
}

// Guest-only route — redirects to appropriate role portal if already signed in
function GuestRoute({ children }) {
  const { isConnected, authLoading, user } = useApp();
  if (authLoading) return null;
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
          <PageTransition><DoctorAccess /></PageTransition>
        } />
        <Route path="/assistant" element={
          <PageTransition><AiAssistant /></PageTransition>
        } />
        <Route path="/database" element={
          <PageTransition><DatabaseViewer /></PageTransition>
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
    </BrowserRouter>
  );
}
