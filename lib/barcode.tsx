'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  data: string;
  type: 'qr' | 'code128';
  size?: number;
}

export function Barcode({ data, type, size = 200 }: BarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      if (type === 'qr') {
        // Generate QR code
        QRCode.toCanvas(canvas, data, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } else if (type === 'code128') {
        // Generate Code 128 barcode
        JsBarcode(canvas, data, {
          format: 'CODE128',
          width: 2,
          height: size / 3,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#FFFFFF',
          lineColor: '#000000'
        });
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Draw error message
      ctx.fillStyle = '#ff0000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Error generating barcode', canvas.width / 2, canvas.height / 2);
    }
  }, [data, type, size]);

  if (!data) {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        border: '1px dashed #ccc', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        No data to display
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={type === 'qr' ? size : size / 3}
        style={{ 
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#fff'
        }}
      />
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: '#666',
        wordBreak: 'break-all'
      }}>
        {data}
      </div>
    </div>
  );
}
