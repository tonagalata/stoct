'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Fade
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Fingerprint as FingerprintIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { setupPasscode, registerBiometricCredential, isBiometricSetup } from '@/lib/passcode-storage';

interface PasscodeSetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export function PasscodeSetup({ open, onComplete, onSkip }: PasscodeSetupProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [showConfirmPasscode, setShowConfirmPasscode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [step, setStep] = useState<'setup' | 'biometric'>('setup');

  useEffect(() => {
    let isMounted = true;
    
    // Check if biometric authentication is supported and already set up
    const checkBiometricSupport = async () => {
      try {
        // Check if WebAuthn is available
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (isMounted) {
            setBiometricSupported(available);
          }
        } else {
          if (isMounted) {
            setBiometricSupported(false);
          }
        }
      } catch {
        if (isMounted) {
          setBiometricSupported(false);
        }
      }
    };
    
    checkBiometricSupport();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value);
    setError('');
  };

  const handleConfirmPasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPasscode(e.target.value);
    setError('');
  };

  const handleSetup = async () => {
    if (passcode.length < 4) {
      setError('Passcode must be at least 4 characters');
      return;
    }

    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await setupPasscode(passcode);
      
      if (biometricSupported) {
        setStep('biometric');
      } else {
        onComplete();
      }
    } catch (error: any) {
      setError(error.message || 'Failed to setup passcode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSetup = async () => {
    if (isLoading) {
      return; // Prevent multiple simultaneous requests
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await registerBiometricCredential();
      if (success) {
        setError('');
        onComplete();
      } else {
        setError('Biometric registration failed. You can still use your passcode.');
        onComplete();
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled. You can still use your passcode.');
      } else if (error.name === 'OperationError') {
        setError('Biometric authentication is already in progress. Please wait.');
      } else {
        setError('Biometric setup failed. You can still use your passcode.');
      }
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const resetForm = () => {
    setPasscode('');
    setConfirmPasscode('');
    setError('');
    setStep('setup');
  };

  const handleClose = () => {
    resetForm();
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'divider'
        }
      }}
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
          <LockIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {step === 'setup' ? 'Setup Passcode' : 'Enable Biometric Authentication'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {step === 'setup' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Secure your Stoct app with a passcode. This will be required when you close and reopen the app.
              </Typography>
            </Alert>

            <TextField
              fullWidth
              label="Enter Passcode"
              type={showPasscode ? 'text' : 'password'}
              value={passcode}
              onChange={handlePasscodeChange}
              placeholder="At least 4 characters"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasscode(!showPasscode)}
                    edge="end"
                    size="small"
                  >
                    {showPasscode ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
              error={!!error && passcode.length > 0 && passcode.length < 4}
              helperText={passcode.length > 0 && passcode.length < 4 ? 'At least 4 characters required' : ''}
            />

            <TextField
              fullWidth
              label="Confirm Passcode"
              type={showConfirmPasscode ? 'text' : 'password'}
              value={confirmPasscode}
              onChange={handleConfirmPasscodeChange}
              placeholder="Confirm your passcode"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowConfirmPasscode(!showConfirmPasscode)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPasscode ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
              error={!!error && confirmPasscode.length > 0 && passcode !== confirmPasscode}
              helperText={confirmPasscode.length > 0 && passcode !== confirmPasscode ? 'Passcodes do not match' : ''}
            />

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(33, 150, 243, 0.05)',
                border: '1px solid',
                borderColor: 'primary.main'
              }}
            >
              <FingerprintIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                Enable Face ID / Touch ID
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Use your biometric authentication for quick and secure access to Stoct.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                You can always use your passcode as a backup.
              </Typography>
            </Paper>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        {step === 'setup' ? (
          <>
            <Button
              onClick={handleSkip}
              variant="outlined"
              sx={{ minWidth: 80 }}
            >
              Skip
            </Button>
            <Button
              onClick={handleSetup}
              variant="contained"
              disabled={isLoading || passcode.length < 4 || passcode !== confirmPasscode}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? <CircularProgress size={20} /> : 'Setup Passcode'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setStep('setup')}
              variant="outlined"
              sx={{ minWidth: 80 }}
            >
              Back
            </Button>
            <Button
              onClick={handleBiometricSetup}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <FingerprintIcon />}
              sx={{ minWidth: 160 }}
            >
              {isLoading ? 'Setting up...' : 'Enable Biometric'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
