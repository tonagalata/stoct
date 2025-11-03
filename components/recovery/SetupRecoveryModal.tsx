'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { syncManager } from '@/lib/sync/sync-manager';

interface SetupRecoveryModalProps {
  open: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

export function SetupRecoveryModal({ open, onClose, onSetupComplete }: SetupRecoveryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetupSync = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // For now, we'll use a simple PIN. In production, this should be derived from the user's passcode
      const tempPin = 'sync-setup-' + Date.now();
      
      await syncManager.initializeSync(tempPin);
      
      onSetupComplete();
      onClose();
    } catch (err: any) {
      if (err.message === 'exists') {
        setError('Sync already set up for this account.');
      } else {
        setError('Failed to set up sync. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupLater = () => {
    // Mark that user was prompted but chose to setup later
    localStorage.setItem('stoct-recovery-setup-later', 'true');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      BackdropProps={{
        sx: {
          backgroundColor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.9)' 
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6">Enable Cross-Browser Sync?</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Keep your Stoct cards synchronized across all your devices and browsers.
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SecurityIcon color="success" />
            <Typography variant="body2" color="text.secondary">
              Zero-knowledge encryption - your data is encrypted before leaving your device
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Your cards will be securely stored in the cloud and automatically synchronized when you make changes.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
        <DialogActions>
        <Button onClick={handleSetupLater} disabled={isLoading}>
          Setup Later
        </Button>
        <Button
          variant="contained"
          onClick={handleSetupSync}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <CloudIcon />}
        >
          {isLoading ? 'Setting Up...' : 'Enable Quick Sync'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
