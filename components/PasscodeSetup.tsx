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
  Close as CloseIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { setupPasscode, registerBiometricCredential, isBiometricSetup } from '@/lib/passcode-storage';
import { syncManager } from '@/lib/sync/sync-manager';
import { PasswordInput } from './common/PasswordInput';
import { validatePassword } from '@/lib/password-validation';
import { CloudRecovery } from './recovery/CloudRecovery';

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
  const [step, setStep] = useState<'setup' | 'recovery' | 'biometric' | 'complete'>('setup');
  const [completedPasscode, setCompletedPasscode] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [recoveryOptions, setRecoveryOptions] = useState({
    cloudSync: false,
    localBackup: false
  });
  const [showCloudRecovery, setShowCloudRecovery] = useState(false);

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
      
      setCompletedPasscode(passcode);
      
      // Always go to recovery setup first - it's essential
      setStep('recovery');
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
        setStep('complete');
      } else {
        setError('Biometric registration failed. You can still use your passcode.');
        setStep('complete');
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

  const handleSkipBiometric = () => {
    setStep('complete');
  };

  const handleRecoveryComplete = () => {
    // After recovery setup, move to biometric if supported, otherwise complete
    if (biometricSupported) {
      setStep('biometric');
    } else {
      setStep('complete');
    }
  };

  const handleRecoverySkip = () => {
    // Even if skipped, continue to biometric or complete
    if (biometricSupported) {
      setStep('biometric');
    } else {
      setStep('complete');
    }
  };

  const handleSetupCloudSync = async () => {
    if (!cloudPassword.trim()) {
      setError('Please create a strong password for cloud sync.');
      return;
    }

    const validation = validatePassword(cloudPassword);
    if (!validation.overall.isValid) {
      setError('Password does not meet security requirements. Please create a stronger password.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await syncManager.initializeSync(cloudPassword);
      setRecoveryOptions(prev => ({ ...prev, cloudSync: true }));
      
      // Continue to biometric or complete
      if (biometricSupported) {
        setStep('biometric');
      } else {
        setStep('complete');
      }
    } catch (err: any) {
      console.error('Cloud sync setup error:', err);
      if (err.message === 'network_error' || err.message.includes('Network connection failed')) {
        setError('🌐 Network connection failed. Please check your internet connection.');
      } else if (err.message === 'quota_exceeded' || err.message.includes('quota exceeded')) {
        setError('⚠️ Cloud sync quota exceeded. Please try again tomorrow.');
      } else if (err.message === 'service_unavailable' || err.message.includes('service is temporarily unavailable')) {
        setError('🔧 Cloud sync service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to setup cloud sync: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloudRecoveryComplete = () => {
    setShowCloudRecovery(false);
    // Close the passcode setup modal and complete the flow
    onComplete();
  };

  const handleFinalComplete = () => {
    onComplete();
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
          backgroundColor: (t) => (t.palette.mode === 'dark' ? '#121212' : '#ffffff'),
          border: '1px solid',
          borderColor: 'divider'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.9)' 
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)'
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
            {step === 'setup' && 'Setup Passcode'}
            {step === 'recovery' && 'Secure Your Data'}
            {step === 'biometric' && 'Enable Biometric Authentication'}
            {step === 'complete' && 'Setup Complete'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: (t) => (t.palette.mode === 'dark' ? '#121212' : '#ffffff') }}>
        {step === 'setup' && (
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

            {/* Cloud Recovery Option */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Already have a cloud backup?
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CloudIcon />}
                onClick={() => setShowCloudRecovery(true)}
                sx={{ 
                  borderStyle: 'dashed',
                  color: 'primary.main',
                  borderColor: 'primary.main',
                  '&:hover': {
                    borderStyle: 'solid',
                    backgroundColor: 'primary.50'
                  }
                }}
              >
                Recover from Cloud
              </Button>
            </Box>
          </Box>
        )}

        {step === 'recovery' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Great!</strong> Your passcode is set. Now let's protect your data with recovery options.
              </Typography>
            </Alert>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.200'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Why Recovery Matters
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                • <strong>Never lose your cards</strong> - even if you forget your passcode
                <br />
                • <strong>Access from any device</strong> - sync across all your devices
                <br />
                • <strong>Zero-knowledge security</strong> - your data stays private
              </Typography>
            </Paper>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Create Cloud Sync Password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This is separate from your app passcode and provides maximum security for cloud storage.
              </Typography>
              
              <PasswordInput
                label="Cloud Sync Password"
                value={cloudPassword}
                onChange={setCloudPassword}
                showStrengthMeter={true}
                showRequirements={true}
                showGenerator={true}
              />
            </Box>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Box>
        )}

        {step === 'biometric' && (
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

        {step === 'complete' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1, textAlign: 'center' }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: 'success.50',
                border: '1px solid',
                borderColor: 'success.200'
              }}
            >
              <SecurityIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                Your Stoct is Secure!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {recoveryOptions.cloudSync 
                  ? 'Your data is protected with both passcode and cloud sync.'
                  : 'Your data is protected with a passcode.'
                }
              </Typography>
              
              {recoveryOptions.cloudSync && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                  <CloudIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                    Cloud Sync Enabled
                  </Typography>
                </Box>
              )}
            </Paper>

            <Typography variant="body2" color="text.secondary">
              You can manage security settings anytime in the app settings.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        {step === 'setup' && (
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
        )}

        {step === 'recovery' && (
          <>
            <Button
              onClick={handleRecoverySkip}
              variant="outlined"
              sx={{ minWidth: 80 }}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSetupCloudSync}
              variant="contained"
              disabled={isLoading || !cloudPassword.trim()}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? <CircularProgress size={20} /> : 'Enable Cloud Sync'}
            </Button>
          </>
        )}

        {step === 'biometric' && (
          <>
            <Button
              onClick={handleSkipBiometric}
              variant="outlined"
              sx={{ minWidth: 80 }}
            >
              Skip
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

        {step === 'complete' && (
          <Button
            onClick={handleFinalComplete}
            variant="contained"
            sx={{ minWidth: 120 }}
          >
            Get Started
          </Button>
        )}
      </DialogActions>

      {/* Cloud Recovery Dialog */}
      <CloudRecovery
        open={showCloudRecovery}
        onClose={() => setShowCloudRecovery(false)}
        onRecoveryComplete={handleCloudRecoveryComplete}
      />

    </Dialog>
  );
}
