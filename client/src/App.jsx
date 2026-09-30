import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import ToastContainer from './components/shared/Toast';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import UploadRecord from './pages/UploadRecord';
import RecordDetail from './pages/RecordDetail';
import DoctorAccess from './pages/DoctorAccess';

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

// Protected route — redirects to /auth if not signed in
function ProtectedRoute({ children }) {
  const { isConnected, authLoading } = useApp();
  if (authLoading) return null; // wait for session restore
  if (!isConnected) return <Navigate to="/auth" replace />;
  return children;
}

// Guest-only route — redirects to /dashboard if already signed in
function GuestRoute({ children }) {
  const { isConnected, authLoading } = useApp();
  if (authLoading) return null;
  if (isConnected) return <Navigate to="/dashboard" replace />;
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
          <ProtectedRoute>
            <PageTransition><Dashboard /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <PageTransition><UploadRecord /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/record/:id" element={
          <ProtectedRoute>
            <PageTransition><RecordDetail /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/doctor-access" element={
          <PageTransition><DoctorAccess /></PageTransition>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Navbar />
        <AnimatedRoutes />
        <ToastContainer />
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
