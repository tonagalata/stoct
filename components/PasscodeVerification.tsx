'use client';

import { useState, useEffect, useRef } from 'react';
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
  Security as SecurityIcon
} from '@mui/icons-material';
import { verifyPasscode, verifyBiometricAuth, updateSessionActivity, isBiometricSetup } from '@/lib/passcode-storage';

interface PasscodeVerificationProps {
  open: boolean;
  onSuccess: () => void;
  onSkip?: () => void;
}

export function PasscodeVerification({ open, onSuccess, onSkip }: PasscodeVerificationProps) {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxAttempts = 5;

  useEffect(() => {
    if (open) {
      // Focus the input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    let isMounted = true;
    
    // Check if biometric authentication is supported and set up
    const checkBiometricSupport = async () => {
      try {
        // Check if WebAuthn is available and biometric is set up
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          const isSetup = isBiometricSetup();
          if (isMounted) {
            setBiometricSupported(available && isSetup);
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

  const handleVerify = async () => {
    if (passcode.length < 4) {
      setError('Please enter your passcode');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isValid = await verifyPasscode(passcode);
      
      if (isValid) {
        // Update session activity
        updateSessionActivity();
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          setError('Too many failed attempts. Please try again later.');
          // Reset attempts after 5 minutes
          setTimeout(() => setAttempts(0), 5 * 60 * 1000);
        } else {
          setError(`Incorrect passcode. ${maxAttempts - newAttempts} attempts remaining.`);
        }
        
        setPasscode('');
      }
    } catch (error: any) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (isBiometricLoading) {
      return; // Prevent multiple simultaneous requests
    }

    setIsBiometricLoading(true);
    setError('');

    try {
      const success = await verifyBiometricAuth();
      
      if (success) {
        // Update session activity
        updateSessionActivity();
        onSuccess();
      } else {
        setError('Biometric authentication failed. Please use your passcode.');
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled or not available.');
      } else if (error.name === 'OperationError') {
        setError('Biometric authentication is already in progress. Please wait.');
      } else {
        setError('Biometric authentication failed. Please use your passcode.');
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const resetForm = () => {
    setPasscode('');
    setError('');
    setAttempts(0);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent closing without verification
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
          justifyContent: 'center',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Verify Identity
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
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
            <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
              Enter Your Passcode
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Verify your identity to access Stoct
            </Typography>
          </Paper>

          <TextField
            ref={inputRef}
            fullWidth
            label="Passcode"
            type={showPasscode ? 'text' : 'password'}
            value={passcode}
            onChange={handlePasscodeChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter your passcode"
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
            error={!!error}
            autoFocus
          />

          {biometricSupported && (
            <Button
              variant="outlined"
              onClick={handleBiometricAuth}
              disabled={isBiometricLoading}
              startIcon={isBiometricLoading ? <CircularProgress size={20} /> : <FingerprintIcon />}
              sx={{
                minHeight: 48,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                }
              }}
            >
              {isBiometricLoading ? 'Authenticating...' : 'Use Face ID / Touch ID'}
            </Button>
          )}

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {attempts > 0 && attempts < maxAttempts && (
            <Alert severity="warning">
              {maxAttempts - attempts} attempts remaining
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        {onSkip && (
          <Button
            onClick={handleSkip}
            variant="outlined"
            sx={{ minWidth: 80 }}
          >
            Skip
          </Button>
        )}
        <Button
          onClick={handleVerify}
          variant="contained"
          disabled={isLoading || passcode.length < 4 || attempts >= maxAttempts}
          sx={{ minWidth: 120 }}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
