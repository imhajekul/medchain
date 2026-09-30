import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { mockPatient, mockDoctor, mockRecords, mockGrants, mockAuditEvents, mockStats } from '../data/mockData';

const AppContext = createContext(null);

const AUTH_STORAGE_KEY = 'medvault_auth';

export function AppProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [grants, setGrants] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // initial check
  const [toasts, setToasts] = useState([]);

  // Toast management
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  
  // Theme state
  const [theme, setTheme] = useState('dark');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('medvault_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setIsConnected(true);
        loadUserData(parsed.role);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setAuthLoading(false);
  }, []);

  // Load role-specific data
  const loadUserData = (role) => {
    if (role === 'patient') {
      setRecords(mockRecords);
      setGrants(mockGrants);
      setAuditEvents(mockAuditEvents);
      setStats(mockStats);
    } else {
      // Doctors see only granted records
      setRecords([]);
      setGrants(mockGrants.filter(g => g.status === 'active'));
      setAuditEvents([]);
      setStats(null);
    }
  };

  // Persist session
  const persistSession = (userData) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  };

  // Sign up — create new account (simulated)
  const signUp = useCallback(async ({ displayName, email, role, walletAddress }) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));

    const userData = {
      id: `user_${Date.now()}`,
      walletAddress: walletAddress || `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      fullAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      displayName,
      email,
      role,
      connectedAt: new Date().toISOString(),
      sessionToken: `session_${Date.now()}`
    };

    setIsConnected(true);
    setUser(userData);
    persistSession(userData);
    loadUserData(role);
    setLoading(false);
    addToast(`Account created! Welcome, ${displayName}`, 'success');
    return userData;
  }, []);

  // Sign in — wallet-based login (simulated)
  const signIn = useCallback(async ({ walletAddress, role }) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    // Simulate SIWE challenge-response
    const userData = role === 'patient' ? { ...mockPatient } : { ...mockDoctor };
    userData.walletAddress = walletAddress || userData.walletAddress;
    userData.role = role;
    userData.connectedAt = new Date().toISOString();
    userData.sessionToken = `session_${Date.now()}`;

    setIsConnected(true);
    setUser(userData);
    persistSession(userData);
    loadUserData(role);
    setLoading(false);
    addToast(`Welcome back, ${userData.displayName}`, 'success');
    return userData;
  }, []);

  // Quick wallet connect (legacy — from landing page)
  const connectWallet = useCallback(async (role = 'patient') => {
    return signIn({ role });
  }, [signIn]);

  // Sign out
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setUser(null);
    setRecords([]);
    setGrants([]);
    setAuditEvents([]);
    setStats(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    addToast('Signed out successfully', 'info');
  }, []);

  // Upload a new record
  const uploadRecord = useCallback(async (label, file) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    const newRecord = {
      id: `rec_${Date.now()}`,
      label,
      ownerWallet: user?.walletAddress || '0x0000',
      storageCID: `Qm${Math.random().toString(36).substr(2, 10)}`,
      encryptedKeyMaterial: `enc_key_${Date.now()}`,
      createdAt: new Date().toISOString(),
      fileSize: file ? `${Math.round(file.size / 1024)} KB` : '0 KB',
      fileType: 'PDF',
      activeGrants: 0,
      status: 'encrypted'
    };
    setRecords(prev => [newRecord, ...prev]);
    setStats(prev => prev ? { ...prev, totalRecords: prev.totalRecords + 1 } : prev);
    setLoading(false);
    addToast('Record encrypted & uploaded', 'success');
    return newRecord;
  }, [user]);

  // Create a grant
  const createGrant = useCallback(async (recordId, granteeWallet, expiresInSeconds) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    const record = records.find(r => r.id === recordId);
    const newGrant = {
      id: `grant_${Date.now()}`,
      recordId,
      recordLabel: record?.label || 'Unknown Record',
      granteeWallet,
      granteeName: granteeWallet,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      shareableLink: `https://medvault.app/access/grant_${Date.now()}`
    };

    const newEvent = {
      id: `evt_${Date.now()}`,
      grantId: newGrant.id,
      recordId,
      eventType: 'issued',
      actorWallet: user?.walletAddress || '0x0000',
      actorName: user?.displayName ? `${user.displayName} (You)` : 'You',
      targetWallet: granteeWallet,
      targetName: granteeWallet,
      timestamp: new Date().toISOString(),
      txHash: `0x${Math.random().toString(16).substr(2, 12)}...${Math.random().toString(16).substr(2, 6)}`
    };

    setGrants(prev => [newGrant, ...prev]);
    setAuditEvents(prev => [newEvent, ...prev]);
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, activeGrants: r.activeGrants + 1 } : r
    ));
    setStats(prev => prev ? { ...prev, activeGrants: prev.activeGrants + 1 } : prev);
    setLoading(false);
    addToast('Access grant created on-chain', 'success');
    return newGrant;
  }, [records, user]);

  // Revoke a grant
  const revokeGrant = useCallback(async (grantId) => {
    setGrants(prev => prev.filter(g => g.id !== grantId));
    setRecords(prev => prev.map(r => {
      const isRelated = grants.find(g => g.id === grantId)?.recordId === r.id;
      return isRelated ? { ...r, activeGrants: Math.max(0, r.activeGrants - 1) } : r;
    }));
    setStats(prev => prev ? { ...prev, activeGrants: Math.max(0, prev.activeGrants - 1) } : prev);
    addToast('Access grant revoked', 'info');
  }, [grants, addToast]);

  const getRecordGrants = useCallback((recordId) => {
    return grants.filter(g => g.recordId === recordId);
  }, [grants]);

  const getRecordAuditEvents = useCallback((recordId) => {
    return auditEvents.filter(e => e.recordId === recordId);
  }, [auditEvents]);


  return (
    <AppContext.Provider value={{
      isConnected,
      user,
      records,
      grants,
      auditEvents,
      stats,
      loading,
      authLoading,
      toasts,
      theme,
      toggleTheme,
      signUp,
      signIn,
      connectWallet,
      disconnectWallet,
      uploadRecord,
      createGrant,
      revokeGrant,
      getRecordGrants,
      getRecordAuditEvents,
      addToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

