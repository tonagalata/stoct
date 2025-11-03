'use client';

import React, { useState } from 'react';
import { Button, Box, Alert, Snackbar } from '@mui/material';
import { DeleteSweep as ClearIcon } from '@mui/icons-material';

export function DevClearCacheButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Only show in development
  if (typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return null;
  }

  const handleClearCache = async () => {
    setIsClearing(true);
    
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const result = event.data;
          setNotification({
            open: true,
            message: result.success ? 'Cache cleared successfully!' : `Failed: ${result.message}`,
            severity: result.success ? 'success' : 'error'
          });
          
          if (result.success) {
            // Reload page after successful cache clear
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        };
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      } else {
        // Fallback: just reload the page
        setNotification({
          open: true,
          message: 'Service worker not available, reloading page...',
          severity: 'success'
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to clear cache',
        severity: 'error'
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Box sx={{ 
        position: 'fixed', 
        bottom: 16, 
        right: 16, 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
          🔧 Development Mode
        </Alert>
        <Button
          variant="contained"
          color="warning"
          size="small"
          onClick={handleClearCache}
          disabled={isClearing}
          startIcon={<ClearIcon />}
          sx={{
            minWidth: 'auto',
            fontSize: '0.75rem',
            px: 1.5,
            py: 0.5
          }}
        >
          {isClearing ? 'Clearing...' : 'Clear Cache'}
        </Button>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity={notification.severity} 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
}
