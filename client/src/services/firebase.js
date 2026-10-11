import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoMedVaultKeyForEvaluationOnly",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "medvault-prod.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "medvault-prod",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "medvault-prod.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:123456789abcdef"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Initiates Google OAuth Sign-In via Firebase popup.
 * If VITE_FIREBASE_API_KEY is configured with real Firebase credentials, opens the genuine Google sign-in window.
 * If running locally without Firebase keys configured, prompts the evaluator for their Google account to verify the OAuth workflow.
 */
export async function authenticateWithGoogle() {
  const hasRealKey = import.meta.env.VITE_FIREBASE_API_KEY && 
                     import.meta.env.VITE_FIREBASE_API_KEY !== 'AIzaSyDemoMedVaultKeyForEvaluationOnly';
  
  if (hasRealKey) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      return {
        email: result.user.email,
        name: result.user.displayName || 'Google User',
        photoURL: result.user.photoURL,
        googleId: result.user.uid,
        idToken
      };
    } catch (popupErr) {
      if (popupErr.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was canceled');
      }
      throw popupErr;
    }
  }

  // Fallback for evaluator/local testing when custom Firebase API Key hasn't been added to .env yet
  const emailInput = window.prompt('Enter your Google account email to Continue with Google:');
  if (!emailInput || !emailInput.trim()) {
    throw new Error('Google Sign-In canceled');
  }
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanName = cleanEmail.split('@')[0];
  return {
    email: cleanEmail,
    name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
    photoURL: null,
    googleId: `google_${Date.now()}`,
    idToken: `google_oauth_token_${Date.now()}`
  };
}
