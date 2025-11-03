'use client';

import { syncManager } from './sync-manager';

// Rate limiting for sync operations
const rateLimitSync = (() => {
  let lastSyncTime = 0;
  const minInterval = 5000; // 5 seconds minimum between syncs
  
  return async (operation: string, syncFn: () => Promise<void>) => {
    // Skip sync in development mode to prevent excessive KV usage
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log(`Skipping ${operation} sync - development mode`);
      return;
    }
    
    const now = Date.now();
    if (now - lastSyncTime < minInterval) {
      console.log(`Skipping ${operation} sync - too frequent (${now - lastSyncTime}ms ago)`);
      return;
    }
    
    lastSyncTime = now;
    try {
      await syncFn();
      console.log(`${operation} sync completed`);
    } catch (error) {
      console.error(`Failed to sync after ${operation}:`, error);
    }
  };
})();

// Hook into storage operations to trigger sync
export const syncHooks = {
  // Called after a card is created
  onCardCreated: async () => {
    if (syncManager.isEnabled()) {
      await rateLimitSync('card creation', () => syncManager.pushToCloud());
    }
  },

  // Called after a card is updated
  onCardUpdated: async () => {
    if (syncManager.isEnabled()) {
      await rateLimitSync('card update', () => syncManager.pushToCloud());
    }
  },

  // Called after a card is deleted
  onCardDeleted: async () => {
    if (syncManager.isEnabled()) {
      await rateLimitSync('card deletion', () => syncManager.pushToCloud());
    }
  },

  // Called after cards are imported
  onCardsImported: async () => {
    if (syncManager.isEnabled()) {
      await rateLimitSync('cards import', () => syncManager.pushToCloud());
    }
  },

  // Called when passcode is set up for the first time
  onPasscodeSetup: async (passcode: string) => {
    try {
      // Check if user wants to enable sync
      const shouldEnableSync = localStorage.getItem('stoct-enable-sync-on-passcode') === 'true';
      if (shouldEnableSync) {
        await syncManager.setupSyncWithPasscode(passcode);
        localStorage.removeItem('stoct-enable-sync-on-passcode');
      }
    } catch (error) {
      console.error('Failed to setup sync with passcode:', error);
    }
  },

  // Called on app startup to pull latest data (with rate limiting)
  onAppStartup: async () => {
    // Skip sync in development mode to prevent excessive KV usage
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('Skipping startup sync - development mode');
      return;
    }
    
    if (syncManager.isEnabled()) {
      // Rate limit: only sync on startup once per hour
      const lastStartupSync = localStorage.getItem('stoct-last-startup-sync');
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (lastStartupSync && (now - parseInt(lastStartupSync)) < oneHour) {
        console.log('Skipping startup sync - too recent');
        return;
      }
      
      try {
        await syncManager.pullFromCloud();
        localStorage.setItem('stoct-last-startup-sync', now.toString());
      } catch (error) {
        console.error('Failed to sync on app startup:', error);
      }
    }
  }
};

// Utility function to trigger sync manually
export const triggerSync = async () => {
  if (syncManager.isEnabled()) {
    try {
      await syncManager.pushToCloud();
      return true;
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }
  return false;
};

// Utility function to pull latest data
export const pullLatestData = async () => {
  if (syncManager.isEnabled()) {
    try {
      await syncManager.pullFromCloud();
      return true;
    } catch (error) {
      console.error('Pull failed:', error);
      return false;
    }
  }
  return false;
};
