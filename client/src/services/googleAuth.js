/**
 * MedVault Google OAuth 2.0 & Identity Services Service
 * Project: medvault-auth-512815
 * Client ID: 1029791844039-3qk7mh166006ulo3e3f0qoq570jdj6fi.apps.googleusercontent.com
 */

export const GOOGLE_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env?.VITE_GOOGLE_CLIENT_ID)) ||
  '1029791844039-3qk7mh166006ulo3e3f0qoq570jdj6fi.apps.googleusercontent.com';

let gsiScriptLoadingPromise = null;

export function loadGsiScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);

  if (gsiScriptLoadingPromise) return gsiScriptLoadingPromise;

  gsiScriptLoadingPromise = new Promise((resolve) => {
    // Check if script element already exists
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        return resolve(true);
      }
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[Google Auth] Failed to load Google Identity Services script.');
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return gsiScriptLoadingPromise;
}

/**
 * Initiates Google OAuth 2.0 Popup Flow using Google Identity Services Token Client.
 * Requests 'openid email profile' scopes and fetches verified profile.
 */
export async function signInWithGoogleOAuth() {
  if (typeof window === 'undefined') {
    throw new Error('Google Sign-In is only available in the browser.');
  }

  const loaded = await loadGsiScript();
  if (!loaded || !window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services library failed to load.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            if (tokenResponse.error === 'popup_closed' || tokenResponse.error === 'access_denied') {
              return reject(new Error('Google Sign-In popup was closed'));
            }
            return reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google authorization failed'));
          }

          if (!tokenResponse.access_token) {
            return reject(new Error('No access token returned by Google'));
          }

          try {
            // Retrieve Google user info using the granted access token
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });

            if (!userinfoRes.ok) {
              throw new Error(`Failed to fetch Google profile (status ${userinfoRes.status})`);
            }

            const profile = await userinfoRes.json();
            resolve({
              email: profile.email,
              name: profile.name || profile.given_name || profile.email?.split('@')[0] || 'Google User',
              photoURL: profile.picture || null,
              googleId: profile.sub,
              accessToken: tokenResponse.access_token,
              idToken: tokenResponse.id_token || null
            });
          } catch (profileErr) {
            reject(profileErr);
          }
        },
        error_callback: (error) => {
          if (error?.type === 'popup_closed') {
            return reject(new Error('Google Sign-In popup was closed'));
          }
          reject(new Error(error?.message || 'Google OAuth failed to initialize'));
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}
