'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Button, Snackbar, Alert, Box, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface ServiceWorkerContextType {
  isUpdateAvailable: boolean;
  updateApp: () => void;
  isOnline: boolean;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  isUpdateAvailable: false,
  updateApp: () => {},
  isOnline: true,
});

export const useServiceWorker = () => useContext(ServiceWorkerContext);

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export const ServiceWorkerProvider = ({ children }: ServiceWorkerProviderProps) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);
        
        console.log('SW: Registered successfully');

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('SW: New version available');
                setIsUpdateAvailable(true);
                setShowUpdatePrompt(true);
              }
            });
          }
        });

        // Listen for controlling service worker changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('SW: Controller changed, reloading page');
          window.location.reload();
        });

        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            console.log('SW: Update available');
            // You could show a notification to the user here
          }
          
          if (event.data && event.data.type === 'CACHE_CLEARED') {
            console.log('SW: Cache cleared in development mode');
            // Optionally show a toast notification
          }
        });

        // Check for updates every 30 seconds when the page is visible
        const checkForUpdates = () => {
          if (!document.hidden) {
            reg.update();
          }
        };

        setInterval(checkForUpdates, 30000);
        document.addEventListener('visibilitychange', checkForUpdates);

        return () => {
          document.removeEventListener('visibilitychange', checkForUpdates);
        };
      } catch (error) {
        console.error('SW: Registration failed:', error);
      }
    };

    registerSW();

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateApp = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
    }
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
    setIsUpdateAvailable(false);
  };

  // Development helper function to manually clear cache
  const clearCacheManually = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        console.log('SW: Manual cache clear result:', event.data);
        // Force reload after cache clear
        window.location.reload();
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    }
  };

  // Add global function for development
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      (window as any).clearSWCache = clearCacheManually;
      console.log('SW: Development mode - use clearSWCache() in console to manually clear cache');
    }
  }, []);

  return (
    <ServiceWorkerContext.Provider value={{ isUpdateAvailable, updateApp, isOnline }}>
      {children}
      
      {/* Update Available Notification */}
      <Snackbar
        open={showUpdatePrompt}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }}
      >
        <Alert
          severity="info"
          sx={{
            width: '100%',
            backgroundColor: 'primary.main',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                onClick={updateApp}
                startIcon={<RefreshIcon />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'white',
                  }
                }}
                variant="outlined"
              >
                Update
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={dismissUpdate}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                Later
              </Button>
            </Box>
          }
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              🚀 New version available!
            </Typography>
            <Typography variant="caption">
              Update now to get the latest features and improvements.
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Offline Indicator */}
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" sx={{ width: '100%' }}>
          <Typography variant="body2">
            📱 You're offline - using cached version
          </Typography>
        </Alert>
      </Snackbar>
    </ServiceWorkerContext.Provider>
  );
};