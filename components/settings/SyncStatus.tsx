'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Cloud as CloudIcon,
  CloudSync as SyncIcon,
  CloudDownload as RestoreIcon,
  Refresh as RefreshIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material';
import { syncManager } from '@/lib/sync/sync-manager';
import { triggerSync, pullLatestData } from '@/lib/sync/sync-hooks';
import { CloudRecovery } from '@/components/recovery/CloudRecovery';

export function SyncStatus() {
  const [syncState, setSyncState] = useState(syncManager.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCloudRecovery, setShowCloudRecovery] = useState(false);

  useEffect(() => {
    // Load initial state
    setSyncState(syncManager.getState());
  }, []);

  const refreshState = () => {
    setSyncState(syncManager.getState());
  };

  const handleSyncNow = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await triggerSync();
      if (success) {
        refreshState();
      } else {
        setError('Failed to sync. Please try again.');
      }
    } catch (err: any) {
      if (err.message === 'precondition') {
        setError('Sync conflict detected. Please restore from cloud first.');
      } else if (err.message === 'network_error' || err.message.includes('Network connection failed')) {
        setError('🌐 Network connection failed. Please check your internet connection.');
      } else if (err.message === 'quota_exceeded' || err.message.includes('quota exceeded')) {
        setError('⚠️ Cloud sync quota exceeded. Sync will resume tomorrow. Your data is safe locally.');
      } else if (err.message === 'service_unavailable' || err.message.includes('service is temporarily unavailable')) {
        setError('🔧 Cloud sync service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to sync: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await pullLatestData();
      if (success) {
        refreshState();
        // Refresh the page to show updated cards
        window.location.reload();
      } else {
        setError('Failed to restore from cloud. Please try again.');
      }
    } catch (err: any) {
      if (err.message === 'network_error' || err.message.includes('Network connection failed')) {
        setError('🌐 Network connection failed. Please check your internet connection.');
      } else if (err.message === 'quota_exceeded' || err.message.includes('quota exceeded')) {
        setError('⚠️ Cloud sync quota exceeded. Please try again tomorrow.');
      } else if (err.message === 'service_unavailable' || err.message.includes('service is temporarily unavailable')) {
        setError('🔧 Cloud sync service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to restore from cloud: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!syncState.enabled) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CloudOffIcon color="disabled" />
          <Typography variant="h6">Cloud Sync</Typography>
          <Chip label="Disabled" color="default" size="small" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enable cloud sync to keep your cards synchronized across devices.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CloudIcon />}
            onClick={() => {
              // This would trigger the SetupRecoveryModal
              console.log('Setup sync');
            }}
          >
            Enable Sync
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => setShowCloudRecovery(true)}
            color="secondary"
          >
            Recover from Cloud
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <CloudIcon color="primary" />
        <Typography variant="h6">Cloud Sync</Typography>
        <Chip label="Enabled" color="success" size="small" />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Last synced:</Typography>
          <Typography variant="body2">
            {syncState.lastSync ? syncState.lastSync.toLocaleString() : 'Never'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Version:</Typography>
          <Typography variant="body2">{syncState.version}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">ETag:</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {syncState.etag ? syncState.etag.slice(0, 8) + '...' : 'None'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={16} /> : <SyncIcon />}
          onClick={handleSyncNow}
          disabled={isLoading}
          size="small"
        >
          Sync Now
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={() => setShowCloudRecovery(true)}
          disabled={isLoading}
          size="small"
        >
          Recover from Cloud
        </Button>
        <IconButton
          onClick={refreshState}
          disabled={isLoading}
          size="small"
          title="Refresh status"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Cloud Recovery Dialog */}
      <CloudRecovery
        open={showCloudRecovery}
        onClose={() => setShowCloudRecovery(false)}
        onRecoveryComplete={() => {
          setShowCloudRecovery(false);
          refreshState();
        }}
      />
    </Paper>
  );
}
