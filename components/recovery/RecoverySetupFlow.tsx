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
  Stepper,
  Step,
  StepLabel,
  Paper,
  Alert,
  Chip,
  IconButton,
  TextField,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Key as KeyIcon,
  Backup as BackupIcon,
  QrCode as QrIcon
} from '@mui/icons-material';
import { syncManager } from '@/lib/sync/sync-manager';
import { exportAllCards } from '@/lib/storage';
import { PasswordInput } from '@/components/common/PasswordInput';
import { validatePassword } from '@/lib/password-validation';

interface RecoverySetupFlowProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  appPasscode: string; // The app passcode that was just created (different from cloud password)
}

export function RecoverySetupFlow({ open, onClose, onComplete, appPasscode }: RecoverySetupFlowProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [recoveryOptions, setRecoveryOptions] = useState({
    cloudSync: false,
    localBackup: false,
    recoveryPhrase: false
  });
  const [showRecoveryData, setShowRecoveryData] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Choose Recovery Methods', 'Create Cloud Password', 'Backup Data', 'Complete Setup'];

  const generateRecoveryPhrase = () => {
    // Generate a simple recovery phrase (in production, use proper BIP39 or similar)
    const words = [
      'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'house',
      'island', 'jungle', 'kitchen', 'lemon', 'mountain', 'ocean', 'palace', 'queen'
    ];
    const phrase = Array.from({ length: 12 }, () => 
      words[Math.floor(Math.random() * words.length)]
    ).join(' ');
    setRecoveryPhrase(phrase);
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSetupCloudSync = async () => {
    if (!cloudPassword.trim()) {
      setError('Please create a strong password for cloud sync.');
      return;
    }

    // Validate password strength
    const validation = validatePassword(cloudPassword);
    if (!validation.overall.isValid) {
      setError('Password does not meet security requirements. Please create a stronger password.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      if (!process.env.NEXT_PUBLIC_STOCT_CF_BASE) {
        throw new Error('Cloud sync service not configured. Please check environment variables.');
      }
      
      await syncManager.initializeSync(cloudPassword);
      setRecoveryOptions(prev => ({ ...prev, cloudSync: true }));
      handleNext();
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

  const handleDownloadBackup = () => {
    try {
        const backupData = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          appPasscode: appPasscode, // App passcode (4-digit PIN)
          cloudPassword: cloudPassword, // Strong cloud password (separate)
          cards: exportAllCards(),
          recoveryPhrase: recoveryPhrase
        };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stoct-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setRecoveryOptions(prev => ({ ...prev, localBackup: true }));
    } catch (err) {
      setError('Failed to create backup file');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast here
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Secure Your Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose how you want to protect and recover your Stoct data. We recommend using multiple methods.
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CloudIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Cloud Sync"
                  secondary="Automatically backup to secure cloud storage"
                />
                <Switch
                  checked={recoveryOptions.cloudSync}
                  onChange={(e) => setRecoveryOptions(prev => ({ 
                    ...prev, cloudSync: e.target.checked 
                  }))}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <DownloadIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Local Backup"
                  secondary="Download encrypted backup file to your device"
                />
                <Switch
                  checked={recoveryOptions.localBackup}
                  onChange={(e) => setRecoveryOptions(prev => ({ 
                    ...prev, localBackup: e.target.checked 
                  }))}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <KeyIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Recovery Phrase"
                  secondary="Generate a recovery phrase for manual restoration"
                />
                <Switch
                  checked={recoveryOptions.recoveryPhrase}
                  onChange={(e) => {
                    setRecoveryOptions(prev => ({ 
                      ...prev, recoveryPhrase: e.target.checked 
                    }));
                    if (e.target.checked && !recoveryPhrase) {
                      generateRecoveryPhrase();
                    }
                  }}
                />
              </ListItem>
            </List>

            {!Object.values(recoveryOptions).some(Boolean) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> Without recovery options, you may lose access to your data if you forget your passcode or lose your device.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Create Cloud Password
            </Typography>
            
            {recoveryOptions.cloudSync ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create a strong password for your cloud sync. This is separate from your app passcode and provides maximum security.
                </Typography>

                <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <SecurityIcon color="warning" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Two-Layer Security
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    • <strong>App Passcode:</strong> Quick access (4+ digits) - what you just created
                    <br />
                    • <strong>Cloud Password:</strong> Strong password (8+ chars) - for cloud sync security
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your data is encrypted with this password before being sent to the cloud. 
                    Even we cannot access your information without it.
                  </Typography>
                </Paper>

                <PasswordInput
                  label="Cloud Sync Password"
                  value={cloudPassword}
                  onChange={setCloudPassword}
                  showStrengthMeter={true}
                  showRequirements={true}
                  showGenerator={true}
                />

                <Button
                  variant="contained"
                  onClick={handleSetupCloudSync}
                  disabled={isLoading || !cloudPassword.trim() || !validatePassword(cloudPassword).overall.isValid}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <CloudIcon />}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {isLoading ? 'Setting up...' : 'Enable Cloud Sync'}
                </Button>
              </Box>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  Cloud sync was not selected. You can enable it later in Settings.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Backup Your Data
            </Typography>

            {recoveryOptions.localBackup && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <BackupIcon color="success" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Download Backup File
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download an encrypted backup of your data to store safely.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleDownloadBackup}
                  startIcon={<DownloadIcon />}
                  color="success"
                >
                  Download Backup
                </Button>
              </Paper>
            )}

            {recoveryOptions.recoveryPhrase && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <KeyIcon color="warning" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Recovery Phrase
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Write down this recovery phrase and store it safely. You'll need it to restore your data.
                </Typography>
                
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={recoveryPhrase}
                    type={showRecoveryData ? 'text' : 'password'}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: 'monospace' }
                    }}
                  />
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => setShowRecoveryData(!showRecoveryData)}
                    >
                      {showRecoveryData ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(recoveryPhrase)}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>Important:</strong> Store this phrase securely. Anyone with access to it can restore your data.
                  </Typography>
                </Alert>
              </Paper>
            )}

            {!recoveryOptions.localBackup && !recoveryOptions.recoveryPhrase && (
              <Alert severity="info">
                <Typography variant="body2">
                  No additional backup methods selected.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Recovery Setup Complete!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your data is now protected with the recovery methods you selected.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {recoveryOptions.cloudSync && (
                <Chip
                  icon={<CloudIcon />}
                  label="Cloud Sync Enabled"
                  color="primary"
                  variant="outlined"
                />
              )}
              {recoveryOptions.localBackup && (
                <Chip
                  icon={<DownloadIcon />}
                  label="Backup Downloaded"
                  color="success"
                  variant="outlined"
                />
              )}
              {recoveryOptions.recoveryPhrase && (
                <Chip
                  icon={<KeyIcon />}
                  label="Recovery Phrase Generated"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>

            <Alert severity="success">
              <Typography variant="body2">
                You can manage these recovery options anytime in Settings → Security.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px'
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
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">Setup Data Recovery</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
        >
          Skip Setup
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
        )}

        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={activeStep === 0 && !Object.values(recoveryOptions).some(Boolean)}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={() => {
              onComplete();
              onClose();
            }}
            variant="contained"
            color="success"
          >
            Complete Setup
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
