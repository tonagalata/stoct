'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Typography } from '@mui/material';
import { decryptJsonWithPin, decodeFromUrlQuery, EncryptedPayload, checkAndMarkTokenUsed } from '@/lib/crypto';
import { createCard } from '@/lib/storage';

export default function SecureSharePage() {
  const router = useRouter();
  const [payload, setPayload] = useState<EncryptedPayload | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const [step, setStep] = useState<'enter' | 'preview' | 'done'>('enter');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (!data) return;
    try {
      const p = decodeFromUrlQuery(data);
      setPayload(p);
    } catch (e) {
      setError('Invalid link.');
    }
  }, []);

  const handleDecrypt = async () => {
    if (!payload) return;
    setError('');
    
    // Check if token has already been used
    if (!checkAndMarkTokenUsed(payload)) {
      setError('This link has already been used and is no longer valid.');
      return;
    }
    
    try {
      const data = await decryptJsonWithPin(payload, pin);
      setPreview(data);
      setStep('preview');
    } catch (e) {
      setError('Incorrect PIN or corrupted link.');
    }
  };

  const handleImport = () => {
    if (!preview) return;
    try {
      // Expecting a CardInput-like object
      const card = createCard({
        type: 'loyalty',
        brand: String(preview.brand || 'Shared Card'),
        number: String(preview.number || ''),
        pin: preview.pin ? String(preview.pin) : undefined,
        notes: preview.notes ? String(preview.notes) : undefined,
        barcodeType: (preview.barcodeType === 'qr' ? 'qr' : 'code128')
      });
      setStep('done');
      // Navigate to the imported card
      router.push(`/k/${card.id}`);
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_CARD' && e.existingId) {
        router.push(`/k/${e.existingId}`);
      } else {
        setError('Failed to import shared card.');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        overflow: 'hidden'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          margin: '0 0 16px 0'
        }}>Unlock Shared Card</h1>

        {!payload && (
          <p style={{ margin: 0, color: '#b0b0b0' }}>This link is missing data.</p>
        )}

        {payload && error && error.includes('already been used') && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            color: '#F44336',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.9rem'
          }}>
            ⚠️ This secure link has already been used and is no longer valid.
          </div>
        )}

        {payload && step === 'enter' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>Enter PIN</Typography>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff'
              }}
              placeholder="PIN to unlock"
            />
            <button
              onClick={handleDecrypt}
              disabled={!pin}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: !pin ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                color: !pin ? 'rgba(255,255,255,0.5)' : '#000',
                cursor: !pin ? 'not-allowed' : 'pointer',
                fontWeight: 700
              }}
            >
              Unlock
            </button>
            {error && <div style={{ color: '#F44336' }}>{error}</div>}
          </div>
        )}

        {payload && step === 'preview' && preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#b0b0b0' }}>Preview</div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '12px'
            }}>
              <div><strong>Brand:</strong> {String(preview.brand || 'Shared Card')}</div>
              <div><strong>Number:</strong> {String(preview.number || '')}</div>
              {preview.pin ? <div><strong>PIN:</strong> {String(preview.pin)}</div> : null}
              {preview.notes ? <div><strong>Notes:</strong> {String(preview.notes)}</div> : null}
              <div><strong>Type:</strong> {preview.barcodeType === 'qr' ? 'QR Code' : 'Code 128'}</div>
            </div>
            <button
              onClick={handleImport}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Import Card
            </button>
            <button
              onClick={() => setStep('enter')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'background.paper',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


