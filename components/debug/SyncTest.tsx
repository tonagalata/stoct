'use client';

import React, { useState } from 'react';
import { Button, Box, Typography, Alert, TextField } from '@mui/material';
import { syncManager } from '@/lib/sync/sync-manager';

export function SyncTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testPin, setTestPin] = useState('test123');

  const testCloudSync = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    console.log('=== SYNC TEST START ===');
    console.log('Environment variable:', process.env.NEXT_PUBLIC_STOCT_CF_BASE);
    console.log('Test PIN:', testPin);
    
    try {
      await syncManager.initializeSync(testPin);
      setSuccess('Cloud sync initialized successfully!');
      console.log('=== SYNC TEST SUCCESS ===');
    } catch (err: any) {
      console.error('=== SYNC TEST ERROR ===', err);
      setError('Sync test failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testWorkerConnection = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_STOCT_CF_BASE}/v1/meta?user=test-debug`);
      const data = await response.json();
      setSuccess(`Worker connection successful! Response: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setError('Worker connection failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, border: '1px solid red', borderRadius: 2, m: 2 }}>
      <Typography variant="h6" color="error" sx={{ mb: 2 }}>
        🔧 DEBUG: Sync Test Component
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Environment: {process.env.NEXT_PUBLIC_STOCT_CF_BASE || 'NOT SET'}
      </Alert>
      
      <TextField
        label="Test PIN"
        value={testPin}
        onChange={(e) => setTestPin(e.target.value)}
        sx={{ mb: 2, mr: 2 }}
        size="small"
      />
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          onClick={testCloudSync}
          disabled={isLoading}
          size="small"
        >
          {isLoading ? 'Testing...' : 'Test Cloud Sync'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={testWorkerConnection}
          disabled={isLoading}
          size="small"
        >
          Test Worker
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 1 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
}
