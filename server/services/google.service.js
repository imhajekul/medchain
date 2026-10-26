import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1029791844039-3qk7mh166006ulo3e3f0qoq570jdj6fi.apps.googleusercontent.com';

/**
 * Verifies a Google ID token using Google's public tokeninfo endpoint.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new Error('Missing Google ID token');

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || `Google tokeninfo returned status ${res.status}`);
    }
    const data = await res.json();

    if (GOOGLE_CLIENT_ID && data.aud && data.aud !== GOOGLE_CLIENT_ID) {
      throw new Error(`Google ID token audience mismatch: expected ${GOOGLE_CLIENT_ID}, received ${data.aud}`);
    }

    if (data.email_verified === false || data.email_verified === 'false') {
      throw new Error('Google account email has not been verified');
    }

    return {
      email: data.email,
      name: data.name || data.given_name || (data.email ? data.email.split('@')[0] : 'Google User'),
      photoURL: data.picture || null,
      googleId: data.sub,
      verified: true
    };
  } catch (error) {
    throw new Error(`Google ID token verification failed: ${error.message}`);
  }
}

/**
 * Verifies a Google OAuth2 access token by querying Google's userinfo endpoint.
 */
export async function verifyGoogleAccessToken(accessToken) {
  if (!accessToken) throw new Error('Missing Google access token');

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || `Google userinfo returned status ${res.status}`);
    }
    const data = await res.json();
    return {
      email: data.email,
      name: data.name || data.given_name || (data.email ? data.email.split('@')[0] : 'Google User'),
      photoURL: data.picture || null,
      googleId: data.sub,
      verified: data.email_verified === true || data.email_verified === 'true'
    };
  } catch (error) {
    throw new Error(`Google access token verification failed: ${error.message}`);
  }
}
