'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  Lock as LockIcon,
  Fingerprint as FingerprintIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { isPasscodeSetup, clearPasscode, isBiometricSetup } from '@/lib/passcode-storage';

interface PasscodeSettingsProps {
  open: boolean;
  onClose: () => void;
  onPasscodeChanged: () => void;
}

export function PasscodeSettings({ open, onClose, onPasscodeChanged }: PasscodeSettingsProps) {
  const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(isPasscodeSetup());
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(isBiometricSetup());

  const handleDisablePasscode = () => {
    if (window.confirm('Are you sure you want to disable passcode protection? This will make your cards less secure.')) {
      clearPasscode();
      setIsPasscodeEnabled(false);
      onPasscodeChanged();
      onClose();
    }
  };

  const handleEnablePasscode = () => {
    // This would trigger the passcode setup flow
    // For now, we'll just show a message
    alert('Passcode setup will be available in the next update. For now, you can disable the current passcode.');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: (t) => (t.palette.mode === 'dark' ? '#121212' : '#ffffff'),
          border: '1px solid',
          borderColor: 'divider'
        }
      }}
      BackdropProps={{ sx: { backgroundColor: 'rgba(0,0,0,0.9)' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Security Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: (t) => (t.palette.mode === 'dark' ? '#121212' : '#ffffff') }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.paper',
              border: '1px solid',
              borderColor: isPasscodeEnabled ? 'success.main' : 'error.main'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <SecurityIcon 
                sx={{ 
                  fontSize: 32, 
                  color: isPasscodeEnabled ? 'success.main' : 'error.main' 
                }} 
              />
              <Box>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Passcode Protection
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {isPasscodeEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </Box>
              {isPasscodeEnabled && (
                <CheckCircleIcon sx={{ color: 'success.main', ml: 'auto' }} />
              )}
            </Box>
            
            <Typography variant="body2" sx={{ color: 'text.primary', mb: 2 }}>
              {isPasscodeEnabled 
                ? 'Your Stoct app is protected with a passcode. You\'ll need to enter it when you close and reopen the app.'
                : 'Your Stoct app is not protected. Anyone with access to your device can view your cards.'
              }
            </Typography>
          </Paper>

          <List>
            <ListItem>
              <ListItemIcon>
                <LockIcon sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Passcode Security"
                secondary="Protects your cards when the app is closed"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <FingerprintIcon sx={{ color: isBiometricEnabled ? 'success.main' : 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Biometric Authentication"
                secondary={isBiometricEnabled ? "Face ID/Touch ID enabled" : "Face ID or Touch ID for quick access"}
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: isBiometricEnabled ? 'success.main' : 'text.secondary' }}
              />
              {isBiometricEnabled && (
                <CheckCircleIcon sx={{ color: 'success.main', ml: 1 }} />
              )}
            </ListItem>
          </List>

          <Divider />

          <Alert severity="info">
            <Typography variant="body2">
              <strong>How it works:</strong> When you close the app (not just refresh), you'll need to enter your passcode or use biometric authentication to access your cards again.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ minWidth: 80 }}
        >
          Close
        </Button>
        
        {isPasscodeEnabled ? (
          <Button
            onClick={handleDisablePasscode}
            variant="contained"
            color="error"
            sx={{ minWidth: 120 }}
          >
            Disable Passcode
          </Button>
        ) : (
          <Button
            onClick={handleEnablePasscode}
            variant="contained"
            sx={{ minWidth: 120 }}
          >
            Enable Passcode
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
