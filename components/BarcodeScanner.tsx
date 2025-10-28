'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>Scan Barcode/QR Code</h2>
        
        {devices.length > 1 && (
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Camera:
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {devices.length === 0 && !error && (
          <div style={{
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            width: '100%'
          }}>
            Using default camera
          </div>
        )}

        <div style={{
          position: 'relative',
          width: '300px',
          height: '200px',
          border: '2px solid #333',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            playsInline
            muted
          />
          {isScanning && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '100px',
              border: '2px solid #4CAF50',
              borderRadius: '4px',
              pointerEvents: 'none'
            }} />
          )}
        </div>

        {error && (
          <div style={{
            color: '#f44336',
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            width: '100%'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isScanning ? (
            <button
              onClick={startScanning}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Start Scanning
            </button>
          ) : (
            <button
              onClick={stopScanning}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Stop Scanning
            </button>
          )}
          
          <button
            onClick={handleClose}
            style={{
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Close
          </button>
        </div>

        <div style={{
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          maxWidth: '300px'
        }}>
          Point your camera at a barcode or QR code. The scanner will automatically detect and read it.
        </div>
      </div>
    </div>
  );
}
