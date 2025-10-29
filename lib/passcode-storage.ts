'use client';

import { encryptJsonWithPin, decryptJsonWithPin } from './crypto';

const PASSCODE_KEY = 'stoct-passcode';
const SESSION_KEY = 'stoct-session';
const BIOMETRIC_KEY = 'stoct-biometric';

export interface PasscodeData {
  encryptedPasscode: string;
  salt: string;
  createdAt: number;
}

export interface SessionData {
  isActive: boolean;
  lastActivity: number;
  sessionId: string;
}

export interface BiometricData {
  credentialId: string;
  publicKey: string;
  createdAt: number;
}

/**
 * Generate a random salt for encryption
 */
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a passcode with salt using Web Crypto API
 */
async function hashPasscode(passcode: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Set up passcode with encryption
 */
export async function setupPasscode(passcode: string): Promise<void> {
  if (!window.isSecureContext) {
    throw new Error('Passcode setup requires HTTPS');
  }

  const salt = generateSalt();
  const hashedPasscode = await hashPasscode(passcode, salt);
  
  const passcodeData: PasscodeData = {
    encryptedPasscode: hashedPasscode,
    salt,
    createdAt: Date.now()
  };

  // Encrypt the passcode data with a master key derived from the passcode
  const masterKey = await hashPasscode(passcode, 'stoct-master-salt');
  const encryptedData = await encryptJsonWithPin(passcodeData, masterKey);
  
  localStorage.setItem(PASSCODE_KEY, encryptedData);
  
  // Initialize session
  await initializeSession();
}

/**
 * Verify passcode
 */
export async function verifyPasscode(passcode: string): Promise<boolean> {
  try {
    const encryptedData = localStorage.getItem(PASSCODE_KEY);
    if (!encryptedData) {
      return false;
    }

    const masterKey = await hashPasscode(passcode, 'stoct-master-salt');
    const passcodeData: PasscodeData = await decryptJsonWithPin(encryptedData, masterKey);
    
    const hashedPasscode = await hashPasscode(passcode, passcodeData.salt);
    return hashedPasscode === passcodeData.encryptedPasscode;
  } catch (error) {
    console.error('Passcode verification failed:', error);
    return false;
  }
}

/**
 * Check if passcode is set up
 */
export function isPasscodeSetup(): boolean {
  return localStorage.getItem(PASSCODE_KEY) !== null;
}

/**
 * Clear passcode data
 */
export function clearPasscode(): void {
  localStorage.removeItem(PASSCODE_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(BIOMETRIC_KEY);
}

/**
 * Save biometric credential
 */
export function saveBiometricCredential(credentialId: string, publicKey: string): void {
  const biometricData: BiometricData = {
    credentialId,
    publicKey,
    createdAt: Date.now()
  };
  
  localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(biometricData));
}

/**
 * Get saved biometric credential
 */
export function getBiometricCredential(): BiometricData | null {
  try {
    const biometricStr = localStorage.getItem(BIOMETRIC_KEY);
    return biometricStr ? JSON.parse(biometricStr) : null;
  } catch {
    return null;
  }
}

/**
 * Check if biometric is set up
 */
export function isBiometricSetup(): boolean {
  return getBiometricCredential() !== null;
}

/**
 * Initialize or update session
 */
export async function initializeSession(): Promise<void> {
  const sessionId = generateSalt();
  const sessionData: SessionData = {
    isActive: true,
    lastActivity: Date.now(),
    sessionId
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Update session activity
 */
export function updateSessionActivity(): void {
  const sessionData = getSessionData();
  if (sessionData) {
    sessionData.lastActivity = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }
}

/**
 * Get current session data
 */
export function getSessionData(): SessionData | null {
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  } catch {
    return null;
  }
}

/**
 * Check if session is still active (within 5 minutes of last activity)
 */
export function isSessionActive(): boolean {
  const sessionData = getSessionData();
  if (!sessionData) {
    return false;
  }
  
  const fiveMinutes = 5 * 60 * 1000;
  return (Date.now() - sessionData.lastActivity) < fiveMinutes;
}

/**
 * End session
 */
export function endSession(): void {
  const sessionData = getSessionData();
  if (sessionData) {
    sessionData.isActive = false;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }
}

/**
 * Check if we need to show passcode (app was closed, not refreshed)
 */
export function shouldShowPasscode(): boolean {
  // If no passcode is set up, don't show
  if (!isPasscodeSetup()) {
    return false;
  }
  
  // If session is active, don't show
  if (isSessionActive()) {
    return false;
  }
  
  // Check if this is a page refresh vs app close
  const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navigationEntries.length > 0) {
    const navigationType = navigationEntries[0].type;
    // If it's a reload, don't show passcode
    if (navigationType === 'reload') {
      return false;
    }
  }
  
  return true;
}

// Track ongoing biometric requests to prevent concurrent calls
let biometricRequestInProgress = false;

/**
 * Register biometric credential (Face ID/Touch ID)
 */
export async function registerBiometricCredential(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  // Prevent concurrent requests
  if (biometricRequestInProgress) {
    console.log('Biometric request already in progress, skipping...');
    return false;
  }

  biometricRequestInProgress = true;

  try {
    // Check if WebAuthn is supported
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      console.log('Platform authenticator not available');
      return false;
    }

    // Generate a unique challenge for this request
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    // Create a credential for registration
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { 
          name: 'Stoct',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: 'Stoct User',
          displayName: 'Stoct User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 30000,
        attestation: 'none'
      }
    }) as PublicKeyCredential;

    if (credential) {
      // Save the credential for future use
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const publicKey = btoa(String.fromCharCode(...new Uint8Array((credential.response as AuthenticatorAttestationResponse).publicKey!)));
      
      saveBiometricCredential(credentialId, publicKey);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    return false;
  } finally {
    // Reset the flag after a short delay to prevent rapid successive calls
    setTimeout(() => {
      biometricRequestInProgress = false;
    }, 1000);
  }
}

/**
 * Verify biometric authentication (Face ID/Touch ID)
 */
export async function verifyBiometricAuth(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  // Check if biometric is set up
  const biometricData = getBiometricCredential();
  if (!biometricData) {
    console.log('No biometric credential found');
    return false;
  }

  // Prevent concurrent requests
  if (biometricRequestInProgress) {
    console.log('Biometric request already in progress, skipping...');
    return false;
  }

  biometricRequestInProgress = true;

  try {
    // Generate a challenge for verification
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialId = Uint8Array.from(atob(biometricData.credentialId), c => c.charCodeAt(0));

    // Verify the credential
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
          transports: ['internal']
        }],
        userVerification: 'required',
        timeout: 30000
      }
    });

    return !!credential;
  } catch (error) {
    console.error('Biometric verification failed:', error);
    return false;
  } finally {
    // Reset the flag after a short delay to prevent rapid successive calls
    setTimeout(() => {
      biometricRequestInProgress = false;
    }, 1000);
  }
}

/**
 * Request biometric authentication (Face ID/Touch ID) - legacy function for compatibility
 */
export async function requestBiometricAuth(): Promise<boolean> {
  // If biometric is already set up, verify it
  if (isBiometricSetup()) {
    return await verifyBiometricAuth();
  }
  
  // Otherwise, register a new credential
  return await registerBiometricCredential();
}
