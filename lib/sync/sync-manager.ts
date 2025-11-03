'use client';

import { getAllCards, importAllCards, exportAllCards } from '@/lib/storage';
import { fetchMeta, initVault, downloadEncrypted, uploadEncrypted } from './cloudflare';
import { encryptJsonWithPin, decryptJsonWithPin } from '@/lib/crypto';

export interface SyncState {
  enabled: boolean;
  userId: string | null;
  etag: string | null;
  version: number;
  lastSync: Date | null;
  vaultKey: Uint8Array | null;
}

class SyncManager {
  private state: SyncState = {
    enabled: false,
    userId: null,
    etag: null,
    version: 0,
    lastSync: null,
    vaultKey: null
  };

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;
    
    this.state.enabled = localStorage.getItem('stoct-sync-enabled') === 'true';
    this.state.userId = localStorage.getItem('stoct-sync-user-id');
    this.state.etag = localStorage.getItem('stoct-sync-etag');
    this.state.version = parseInt(localStorage.getItem('stoct-sync-version') || '0');
    
    const lastSyncStr = localStorage.getItem('stoct-last-sync');
    if (lastSyncStr) {
      this.state.lastSync = new Date(lastSyncStr);
    }

    // Load vault key from secure storage (simplified - in production, derive from passcode/biometric)
    const vaultKeyStr = localStorage.getItem('stoct-vault-key');
    if (vaultKeyStr) {
      try {
        const keyArray = JSON.parse(vaultKeyStr);
        this.state.vaultKey = new Uint8Array(keyArray);
      } catch (e) {
        console.error('Failed to load vault key:', e);
      }
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('stoct-sync-enabled', this.state.enabled.toString());
    if (this.state.userId) localStorage.setItem('stoct-sync-user-id', this.state.userId);
    if (this.state.etag) localStorage.setItem('stoct-sync-etag', this.state.etag);
    localStorage.setItem('stoct-sync-version', this.state.version.toString());
    if (this.state.lastSync) localStorage.setItem('stoct-last-sync', this.state.lastSync.toISOString());
    
    if (this.state.vaultKey) {
      localStorage.setItem('stoct-vault-key', JSON.stringify(Array.from(this.state.vaultKey)));
    }
  }

  async initializeSync(userPin: string): Promise<void> {
    if (!process.env.NEXT_PUBLIC_STOCT_CF_BASE) {
      throw new Error('Sync service not configured');
    }

    try {
      // Generate user ID and vault key
      const userId = crypto.randomUUID();
      const vaultKey = crypto.getRandomValues(new Uint8Array(32));
      
      // Derive KEK from user PIN (simplified - in production, use proper PBKDF2/Argon2)
      const encoder = new TextEncoder();
      const pinBytes = encoder.encode(userPin);
      const kekMaterial = await crypto.subtle.importKey('raw', pinBytes as BufferSource, 'PBKDF2', false, ['deriveKey']);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      const kek = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        kekMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Wrap vault key with KEK
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const wrappedKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        kek,
        vaultKey
      );

      // Combine IV + wrapped key
      const wrappedVaultKey = new Uint8Array(iv.length + wrappedKey.byteLength);
      wrappedVaultKey.set(iv, 0);
      wrappedVaultKey.set(new Uint8Array(wrappedKey), iv.length);

      const kdf = {
        type: 'pbkdf2-sha256' as const,
        salt: btoa(String.fromCharCode(...salt)),
        params: { iterations: 100000 }
      };

      // Initialize vault on server
      const result = await initVault(userId, kdf, btoa(String.fromCharCode(...wrappedVaultKey)));

      // Update local state
      this.state.enabled = true;
      this.state.userId = userId;
      this.state.etag = result.etag;
      this.state.version = 1;
      this.state.vaultKey = vaultKey;
      this.saveState();

      // Perform initial sync
      await this.pushToCloud();

    } catch (error: any) {
      console.error('Failed to initialize sync:', error);
      if (error.message === 'quota_exceeded') {
        throw new Error('Cloud sync quota exceeded. Please try again tomorrow or upgrade your plan.');
      } else if (error.message === 'network_error') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.message === 'service_unavailable') {
        throw new Error('Cloud sync service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }

  async pushToCloud(): Promise<void> {
    if (!this.state.enabled || !this.state.userId || !this.state.vaultKey || !this.state.etag) {
      return;
    }

    try {
      // Export current cards
      const cardsData = exportAllCards();
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(cardsData);

      // Encrypt with vault key
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await crypto.subtle.importKey('raw', this.state.vaultKey as BufferSource, 'AES-GCM', false, ['encrypt']);
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBytes as BufferSource);

      // Combine IV + ciphertext
      const ivct = new Uint8Array(iv.length + encrypted.byteLength);
      ivct.set(iv, 0);
      ivct.set(new Uint8Array(encrypted), iv.length);

      // Upload to cloud
      const result = await uploadEncrypted(this.state.userId, ivct, this.state.etag);
      
      this.state.etag = result.etag;
      this.state.version = result.version;
      this.state.lastSync = new Date();
      this.saveState();

      console.log('Successfully synced to cloud:', result);

    } catch (error: any) {
      if (error.message === 'precondition') {
        // Conflict detected - need to pull and merge
        console.log('Sync conflict detected, pulling latest...');
        await this.pullFromCloud();
        // After successful pull, try push again
        await this.pushToCloud();
      } else {
        console.error('Failed to push to cloud:', error);
        if (error.message === 'quota_exceeded') {
          throw new Error('Cloud sync quota exceeded. Your data is safe locally. Sync will resume tomorrow.');
        } else if (error.message === 'network_error') {
          throw new Error('Network connection failed. Your data is saved locally.');
        } else if (error.message === 'service_unavailable') {
          throw new Error('Cloud sync service is temporarily unavailable. Your data is safe locally.');
        }
        throw error;
      }
    }
  }

  async pullFromCloud(): Promise<void> {
    if (!this.state.enabled || !this.state.userId || !this.state.vaultKey) {
      return;
    }

    try {
      // Download encrypted data
      const { ivct, etag, version } = await downloadEncrypted(this.state.userId);

      // Decrypt with vault key
      const iv = ivct.slice(0, 12);
      const ciphertext = ivct.slice(12);
      
      const key = await crypto.subtle.importKey('raw', this.state.vaultKey as BufferSource, 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext as BufferSource);
      
      const decoder = new TextDecoder();
      const cardsData = decoder.decode(decrypted);

      // Import cards (this will merge with existing cards)
      importAllCards(cardsData);

      // Update sync state
      if (etag) this.state.etag = etag;
      if (version) this.state.version = version;
      this.state.lastSync = new Date();
      this.saveState();

      console.log('Successfully pulled from cloud');

    } catch (error: any) {
      console.error('Failed to pull from cloud:', error);
      if (error.message === 'quota_exceeded') {
        throw new Error('Cloud sync quota exceeded. Please try again tomorrow.');
      } else if (error.message === 'network_error') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.message === 'service_unavailable') {
        throw new Error('Cloud sync service is temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }

  async setupSyncWithPasscode(passcode: string): Promise<void> {
    if (this.state.enabled) {
      // Already set up, just update vault key derivation
      return;
    }

    await this.initializeSync(passcode);
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  getState(): SyncState {
    return { ...this.state };
  }

  async disableSync(): Promise<void> {
    this.state.enabled = false;
    this.state.userId = null;
    this.state.etag = null;
    this.state.version = 0;
    this.state.lastSync = null;
    this.state.vaultKey = null;

    // Clear from localStorage
    localStorage.removeItem('stoct-sync-enabled');
    localStorage.removeItem('stoct-sync-user-id');
    localStorage.removeItem('stoct-sync-etag');
    localStorage.removeItem('stoct-sync-version');
    localStorage.removeItem('stoct-last-sync');
    localStorage.removeItem('stoct-vault-key');
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
