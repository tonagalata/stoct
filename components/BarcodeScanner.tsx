'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Fade,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  QrCodeScanner as ScanIcon,
  Stop as StopIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera access is not supported in this browser. Please use a modern browser with camera support.');
          return;
        }

        // Get available video devices with error handling
        try {
          const videoInputDevices = await reader.listVideoInputDevices();
          setDevices(videoInputDevices);
          
          if (videoInputDevices.length > 0) {
            setSelectedDeviceId(videoInputDevices[0].deviceId);
          } else {
            setError('No cameras found. Please ensure a camera is connected and permissions are granted.');
          }
        } catch (deviceError) {
          console.warn('Could not enumerate devices:', deviceError);
          // Continue without device selection - use default camera
          setDevices([]);
          setSelectedDeviceId('');
        }
      } catch (err) {
        setError('Failed to initialize scanner. Please ensure camera permissions are granted.');
        console.error('Scanner initialization error:', err);
      }
    };

    initializeScanner();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current) return;

    try {
      setError('');
      setIsScanning(true);

      // Use selectedDeviceId if available, otherwise use null for default camera
      const deviceId = selectedDeviceId || null;

      await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            onScan(result.getText());
            stopScanning();
          }
          if (error && !(error instanceof Error && error.name === 'NotFoundException')) {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (err) {
      setError('Failed to start camera. Please check permissions and try again.');
      console.error('Scanning error:', err);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScanIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Scan Barcode/QR Code
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'text.primary'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Camera Selection */}
          {devices.length > 1 && (
            <FormControl fullWidth size="small">
              <InputLabel>Camera</InputLabel>
              <Select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                label="Camera"
                startAdornment={<VideocamIcon sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                {devices.map((device) => (
                  <MenuItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Default Camera Info */}
          {devices.length === 0 && !error && (
            <Alert 
              severity="info" 
              sx={{ 
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.2)',
                '& .MuiAlert-message': { color: 'text.primary' }
              }}
            >
              Using default camera
            </Alert>
          )}

          {/* Video Container */}
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '400px',
              height: '300px',
              mx: 'auto',
              borderRadius: 3,
              overflow: 'hidden',
              border: '2px solid',
              borderColor: isScanning ? 'success.main' : 'divider',
              background: 'rgba(0, 0, 0, 0.1)',
              transition: 'border-color 0.3s ease'
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '10px'
              }}
              playsInline
              muted
            />
            
            {/* Scanning Overlay */}
            {isScanning && (
              <Fade in timeout={300}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '250px',
                    height: '150px',
                    border: '3px solid',
                    borderColor: 'success.main',
                    borderRadius: 2,
                    pointerEvents: 'none',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      right: -2,
                      bottom: -2,
                      border: '2px solid',
                      borderColor: 'success.light',
                      borderRadius: 2,
                      animation: 'pulse 2s infinite'
                    }
                  }}
                />
              </Fade>
            )}

            {/* Status Chip */}
            <Chip
              label={isScanning ? 'Scanning...' : 'Ready to scan'}
              color={isScanning ? 'success' : 'default'}
              size="small"
              icon={isScanning ? <ScanIcon /> : <CameraIcon />}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: isScanning ? 'rgba(76, 175, 80, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontWeight: 600,
                backdropFilter: 'blur(10px)'
              }}
            />
          </Paper>

          {/* Progress Bar */}
          {isScanning && (
            <LinearProgress
              sx={{
                borderRadius: 1,
                height: 4,
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'success.main'
                }
              }}
            />
          )}

          {/* Error Display */}
          {error && (
            <Alert 
              severity="error"
              sx={{
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.2)',
                '& .MuiAlert-message': { color: 'text.primary' }
              }}
            >
              {error}
            </Alert>
          )}

          {/* Instructions */}
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              fontStyle: 'italic',
              px: 2
            }}
          >
            Point your camera at a barcode or QR code. The scanner will automatically detect and read it.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 0,
          gap: 1,
          justifyContent: 'center'
        }}
      >
        {!isScanning ? (
          <Button
            onClick={startScanning}
            variant="contained"
            startIcon={<ScanIcon />}
            size="large"
            sx={{
              minWidth: 160,
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Start Scanning
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="contained"
            startIcon={<StopIcon />}
            size="large"
            color="error"
            sx={{
              minWidth: 160,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 20px rgba(244, 67, 54, 0.4)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Stop Scanning
          </Button>
        )}
        
        <Button
          onClick={handleClose}
          variant="outlined"
          size="large"
          sx={{
            minWidth: 100,
            borderColor: 'text.secondary',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'text.primary',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Close
        </Button>
      </DialogActions>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Dialog>
  );
}
