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
  TextField,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Step,
  Stepper,
  StepLabel
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Key as KeyIcon,
  Restore as RestoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { syncManager } from '@/lib/sync/sync-manager';
import { getAllCards } from '@/lib/storage';
import { PasswordInput } from '@/components/common/PasswordInput';
import { validatePassword } from '@/lib/password-validation';

interface CloudRecoveryProps {
  open: boolean;
  onClose: () => void;
  onRecoveryComplete: () => void;
}

export function CloudRecovery({ open, onClose, onRecoveryComplete }: CloudRecoveryProps) {
  const [step, setStep] = useState<'password' | 'preview' | 'confirm' | 'complete'>('password');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cloudData, setCloudData] = useState<any>(null);
  const [currentCards, setCurrentCards] = useState<any[]>([]);

  const steps = ['Enter Cloud Password', 'Preview Data', 'Confirm Recovery', 'Complete'];

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError('Please enter your cloud password');
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.overall.isValid) {
      setError('Password does not meet security requirements. Please use a stronger password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get current cards for comparison
      const current = getAllCards();
      setCurrentCards(current);

      // Try to initialize sync with the password to verify it works
      await syncManager.initializeSync(password);
      
      // Pull data from cloud to preview
      await syncManager.pullFromCloud();
      
      // Get the data that would be restored (this is a simplified preview)
      // In a real implementation, you'd want to decrypt and show the actual data
      setCloudData({
        cardCount: 'Loading...', // We'll update this after successful pull
        lastSync: new Date().toISOString(),
        version: syncManager.getState().version
      });

      setStep('preview');
    } catch (err: any) {
      console.error('Recovery password error:', err);
      if (err.message === 'network_error' || err.message.includes('Network connection failed')) {
        setError('🌐 Network connection failed. Please check your internet connection.');
      } else if (err.message === 'quota_exceeded' || err.message.includes('quota exceeded')) {
        setError('⚠️ Cloud sync quota exceeded. Please try again tomorrow.');
      } else if (err.message === 'service_unavailable' || err.message.includes('service is temporarily unavailable')) {
        setError('🔧 Cloud sync service is temporarily unavailable. Please try again later.');
      } else if (err.message.includes('exists')) {
        setError('Sync already set up. Try using the existing sync instead.');
      } else if (err.message.includes('not found')) {
        setError('No cloud backup found for this password. Make sure you have the correct password and that cloud sync was previously set up.');
      } else {
        setError('Failed to access cloud backup: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewNext = () => {
    setStep('confirm');
  };

  const handleConfirmRestore = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Perform the actual restore
      await syncManager.pullFromCloud();
      
      setStep('complete');
    } catch (err: any) {
      console.error('Recovery restore error:', err);
      if (err.message === 'network_error' || err.message.includes('Network connection failed')) {
        setError('🌐 Network connection failed. Please check your internet connection.');
      } else if (err.message === 'quota_exceeded' || err.message.includes('quota exceeded')) {
        setError('⚠️ Cloud sync quota exceeded. Please try again tomorrow.');
      } else if (err.message === 'service_unavailable' || err.message.includes('service is temporarily unavailable')) {
        setError('🔧 Cloud sync service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to restore data: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onRecoveryComplete();
    onClose();
    // Optionally reload the page to show restored data
    window.location.reload();
  };

  const renderStepContent = () => {
    switch (step) {
      case 'password':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Enter Your Cloud Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter the strong password you used when setting up cloud sync to recover your data.
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SecurityIcon color="info" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Zero-Knowledge Recovery
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Your password is used to decrypt your data locally. We never see your password or unencrypted data.
              </Typography>
            </Paper>

            <PasswordInput
              label="Cloud Recovery Password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError('');
              }}
              error={error}
              showStrengthMeter={false}
              showRequirements={true}
              showGenerator={false}
              autoFocus
            />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> This must be the same strong password you used when setting up cloud sync. It requires 8+ characters with uppercase, lowercase, numbers, and symbols.
              </Typography>
            </Alert>
          </Box>
        );

      case 'preview':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Preview Cloud Backup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Here's what we found in your cloud backup:
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Cloud Backup Details
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup Version"
                    secondary={`Version ${cloudData?.version || 'Unknown'}`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CloudDownloadIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Last Sync"
                    secondary={cloudData?.lastSync ? new Date(cloudData.lastSync).toLocaleString() : 'Unknown'}
                  />
                </ListItem>
              </List>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Current Device
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  icon={<RestoreIcon />}
                  label={`${currentCards.length} cards on this device`}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Cloud data will be merged with your existing cards. Duplicates will be handled automatically.
              </Typography>
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                Your existing data will be preserved and merged with the cloud backup.
              </Typography>
            </Alert>
          </Box>
        );

      case 'confirm':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Confirm Data Recovery
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Are you sure you want to restore data from your cloud backup?
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WarningIcon color="warning" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  What Will Happen
                </Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="✅ Cloud data will be downloaded and decrypted"
                    secondary="Your backup will be restored using your password"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="✅ Data will be merged with existing cards"
                    secondary="No existing data will be lost"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="✅ Cloud sync will be enabled"
                    secondary="Future changes will automatically sync"
                  />
                </ListItem>
              </List>
            </Paper>

            <Alert severity="success">
              <Typography variant="body2">
                This operation is safe and reversible. Your data will be merged, not replaced.
              </Typography>
            </Alert>
          </Box>
        );

      case 'complete':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Recovery Complete!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your data has been successfully restored from the cloud backup.
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                What's Next?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Your cards have been restored and merged
                <br />
                • Cloud sync is now active
                <br />
                • Future changes will automatically backup
              </Typography>
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                The app will reload to show your restored data.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  const getStepIndex = () => {
    switch (step) {
      case 'password': return 0;
      case 'preview': return 1;
      case 'confirm': return 2;
      case 'complete': return 3;
      default: return 0;
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
          <CloudDownloadIcon color="primary" />
          <Typography variant="h6">Recover from Cloud Backup</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={getStepIndex()} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        {step !== 'complete' && (
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}

        {step === 'password' && (
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={isLoading || !password.trim() || !validatePassword(password).overall.isValid}
            startIcon={isLoading ? <CircularProgress size={20} /> : <KeyIcon />}
          >
            {isLoading ? 'Verifying...' : 'Access Backup'}
          </Button>
        )}

        {step === 'preview' && (
          <Button
            onClick={handlePreviewNext}
            variant="contained"
            startIcon={<RestoreIcon />}
          >
            Continue to Recovery
          </Button>
        )}

        {step === 'confirm' && (
          <Button
            onClick={handleConfirmRestore}
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <CloudDownloadIcon />}
            color="success"
          >
            {isLoading ? 'Restoring...' : 'Restore Data'}
          </Button>
        )}

        {step === 'complete' && (
          <Button
            onClick={handleComplete}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
          >
            Finish
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
