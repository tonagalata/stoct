'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  TextField,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  QrCode as QrIcon,
  Send as SendIcon,
  GetApp as ReceiveIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { 
  createSenderOffer, 
  acceptOfferAndAnswer, 
  completeSender, 
  sendInChunks,
  type OfferPayload,
  type AnswerPayload 
} from '@/lib/webrtc/transfer';
import { exportAllCards } from '@/lib/storage';

// Simple QR code generation (you might want to use a proper QR library)
function generateQRDataURL(text: string): string {
  // This is a placeholder - in a real implementation, use a QR library like qrcode
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 200;
  canvas.height = 200;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText('QR: ' + text.slice(0, 20) + '...', 10, 100);
  return canvas.toDataURL();
}

export function MoveToDevice() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  
  // Send tab state
  const [offerQR, setOfferQR] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  
  // Receive tab state
  const [offerInput, setOfferInput] = useState('');
  const [answerQR, setAnswerQR] = useState('');
  const [receivedChunks, setReceivedChunks] = useState<ArrayBuffer[]>([]);

  const handleStartSend = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { offer, pc, channel } = await createSenderOffer();
      setPeerConnection(pc);
      setDataChannel(channel);
      
      const offerData = btoa(JSON.stringify(offer));
      setOfferQR(generateQRDataURL(offerData));
      
      // Set up channel events
      channel.onopen = () => {
        console.log('Data channel opened');
        sendVaultData();
      };
      
      channel.onerror = (err) => {
        setError('Data channel error');
        console.error('Data channel error:', err);
      };
      
    } catch (err) {
      setError('Failed to create offer');
      console.error('Send offer error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendVaultData = async () => {
    if (!dataChannel) return;
    
    try {
      // Export and encrypt vault data
      const vaultData = exportAllCards();
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(vaultData);
      
      // Simple encryption (in real implementation, use proper encryption)
      const encrypted = dataBytes; // Placeholder
      
      await sendInChunks(dataChannel, encrypted, 64 * 1024, (sent, total) => {
        setProgress((sent / total) * 100);
      });
      
      setProgress(100);
    } catch (err) {
      setError('Failed to send vault data');
      console.error('Send data error:', err);
    }
  };

  const handleCompleteConnection = async () => {
    if (!peerConnection || !answerInput) return;
    
    try {
      const answer: AnswerPayload = JSON.parse(atob(answerInput));
      await completeSender(peerConnection, answer);
    } catch (err) {
      setError('Invalid answer data');
      console.error('Complete connection error:', err);
    }
  };

  const handleStartReceive = async () => {
    if (!offerInput) return;
    
    setIsLoading(true);
    setError('');
    setReceivedChunks([]);
    
    try {
      const offer: OfferPayload = JSON.parse(atob(offerInput));
      
      const { answer, pc } = await acceptOfferAndAnswer(offer, (chunk) => {
        setReceivedChunks(prev => [...prev, chunk]);
      });
      
      setPeerConnection(pc);
      
      const answerData = btoa(JSON.stringify(answer));
      setAnswerQR(generateQRDataURL(answerData));
      
    } catch (err) {
      setError('Invalid offer data');
      console.error('Receive offer error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportReceived = () => {
    try {
      // Combine all received chunks
      const totalLength = receivedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of receivedChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      // Decrypt and import (simplified)
      const decoder = new TextDecoder();
      const vaultData = decoder.decode(combined);
      
      // In real implementation, call importAllCards(vaultData)
      console.log('Received vault data:', vaultData.length, 'characters');
      
      setReceivedChunks([]);
      alert('Vault data received successfully!');
      
    } catch (err) {
      setError('Failed to import received data');
      console.error('Import error:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Move to This Device
      </Typography>
      
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Send" icon={<SendIcon />} />
        <Tab label="Receive" icon={<ReceiveIcon />} />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Send Tab */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send your vault to another device via direct peer-to-peer connection.
          </Typography>
          
          {!offerQR ? (
            <Button
              variant="contained"
              onClick={handleStartSend}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} /> : <QrIcon />}
              fullWidth
            >
              {isLoading ? 'Generating...' : 'Generate Connection Code'}
            </Button>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Step 1: Scan this QR code on the receiving device
              </Typography>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img src={offerQR} alt="Connection QR Code" style={{ maxWidth: '200px' }} />
              </Box>
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Step 2: Enter the response code from the receiving device
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Paste the response code here..."
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  size="small"
                />
                <Button
                  variant="outlined"
                  onClick={handleCompleteConnection}
                  disabled={!answerInput}
                >
                  Connect
                </Button>
              </Box>
              
              {progress > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Sending: {Math.round(progress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Receive Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Receive a vault from another device via direct peer-to-peer connection.
          </Typography>
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Step 1: Enter the connection code from the sending device
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Paste the connection code here..."
              value={offerInput}
              onChange={(e) => setOfferInput(e.target.value)}
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleStartReceive}
              disabled={!offerInput || isLoading}
            >
              {isLoading ? 'Processing...' : 'Process'}
            </Button>
          </Box>
          
          {answerQR && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Step 2: Scan this QR code on the sending device
              </Typography>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img src={answerQR} alt="Response QR Code" style={{ maxWidth: '200px' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={() => copyToClipboard(btoa(JSON.stringify({ sdp: 'response-data' })))}
                  size="small"
                >
                  Copy Response Code
                </Button>
              </Box>
            </Box>
          )}
          
          {receivedChunks.length > 0 && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Received {receivedChunks.length} data chunks
              </Typography>
              <Button
                variant="contained"
                onClick={handleImportReceived}
                color="success"
              >
                Import Received Data
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
