'use client';

import { syncManager } from './sync-manager';

// Hook into storage operations to trigger sync
export const syncHooks = {
  // Called after a card is created
  onCardCreated: async () => {
    if (syncManager.isEnabled()) {
      try {
        await syncManager.pushToCloud();
      } catch (error) {
        console.error('Failed to sync after card creation:', error);
      }
    }
  },

  // Called after a card is updated
  onCardUpdated: async () => {
    if (syncManager.isEnabled()) {
      try {
        await syncManager.pushToCloud();
      } catch (error) {
        console.error('Failed to sync after card update:', error);
      }
    }
  },

  // Called after a card is deleted
  onCardDeleted: async () => {
    if (syncManager.isEnabled()) {
      try {
        await syncManager.pushToCloud();
      } catch (error) {
        console.error('Failed to sync after card deletion:', error);
      }
    }
  },

  // Called after cards are imported
  onCardsImported: async () => {
    if (syncManager.isEnabled()) {
      try {
        await syncManager.pushToCloud();
      } catch (error) {
        console.error('Failed to sync after cards import:', error);
      }
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

  // Called on app startup to pull latest data
  onAppStartup: async () => {
    if (syncManager.isEnabled()) {
      try {
        await syncManager.pullFromCloud();
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
