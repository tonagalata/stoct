'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardInput } from '@/lib/types';
import { getCard, updateCard } from '@/lib/storage';
import { copyToClipboard } from '@/lib/clipboard';
import { Barcode } from '@/lib/barcode';
import { encryptJsonWithPin, encodeToUrlQuery } from '@/lib/crypto';
import { useToast } from '@/components/ToastProvider';
import { Modal } from '@/components/Modal';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface CardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CardPage({ params }: CardPageProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [cardId, setCardId] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<CardInput>({
    brand: '',
    number: '',
    pin: '',
    notes: '',
    barcodeType: 'code128',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePin, setSharePin] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const loadCard = async () => {
      try {
        const resolvedParams = await params;
        setCardId(resolvedParams.id);
        
        if (typeof window !== 'undefined') {
          const cardData = getCard(resolvedParams.id);
          if (cardData) {
            setCard(cardData);
            setEditData({
              brand: cardData.brand,
              number: cardData.number,
              pin: cardData.pin || '',
              notes: cardData.notes || '',
              barcodeType: cardData.barcodeType || 'code128',
            });
            setIsVisible(true);
          } else {
            setMessage('Card not found');
          }
        }
      } catch (error) {
        console.error('Error loading card:', error);
        setMessage('Error loading card');
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [params]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (card) {
      setEditData({
        brand: card.brand,
        number: card.number,
        pin: card.pin || '',
        notes: card.notes || '',
        barcodeType: card.barcodeType || 'code128',
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!card || !editData.brand.trim() || !editData.number.trim()) return;

    setIsSubmitting(true);
    try {
      const updatedCard: Card = {
        ...card,
        brand: editData.brand.trim(),
        number: editData.number.trim(),
        pin: (editData.pin ?? '').trim() || undefined,
        notes: (editData.notes ?? '').trim() || undefined,
        barcodeType: editData.barcodeType,
        updatedAt: Date.now(),
      };

      updateCard(updatedCard);
      setCard(updatedCard);
      setIsEditing(false);
      setMessage('Card updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CARD') {
        router.push(`/k/${error.existingId}`);
      } else {
        setMessage('Error updating card: ' + error.message);
        setTimeout(() => setMessage(''), 5000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    if (isEditing) {
      setEditData(prev => ({ ...prev, number: data }));
    } else {
      copyToClipboard(data);
      setMessage('Barcode data copied to clipboard!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const copyData = (text: string, label: string) => {
    copyToClipboard(text);
    setMessage(`${label} copied to clipboard!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSecureShare = async () => {
    if (!card) return;
    if (!sharePin || sharePin.length < 4) {
      showToast('PIN must be at least 4 characters.', 'error');
      return;
    }
    try {
      if (!window.isSecureContext) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      const payload = await encryptJsonWithPin({
        brand: card.brand,
        number: card.number,
        pin: card.pin,
        notes: card.notes,
        barcodeType: card.barcodeType || 'code128',
      }, sharePin);
      const query = encodeToUrlQuery(payload);
      const url = `${window.location.origin}/s?data=${query}`;
      try {
        await navigator.clipboard.writeText(url);
        setShareLink(url);
        showToast('Secure link copied to clipboard!', 'success');
      } catch (clipErr) {
        const manual = confirm('Copy link manually? Selecting OK will open a dialog with the link.');
        if (manual) {
          prompt('Copy this secure link:', url);
          setShareLink(url);
          showToast('Secure link ready to share.', 'info');
        }
      }
      setShareOpen(false);
    } catch (e: any) {
      if (e && e.message === 'SECURE_CONTEXT_REQUIRED') {
        showToast('Secure link requires HTTPS. Use Netlify or ngrok.', 'error');
      } else if (typeof e?.message === 'string' && e.message.includes('Web Crypto')) {
        showToast('Secure link unavailable: Web Crypto not supported.', 'error');
      } else {
        showToast('Failed to create secure link.', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid #ffffff',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#b0b0b0', fontSize: '1.1rem' }}>Loading card...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <div style={{
            fontSize: '4rem',
            marginBottom: '20px'
          }}>
            😞
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '600',
            margin: '0 0 10px 0',
            color: '#ffffff'
          }}>
            Card Not Found
          </h1>
          <p style={{
            color: '#b0b0b0',
            margin: '0 0 30px 0',
            fontSize: '1.1rem'
          }}>
            The card you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              color: '#000000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div className="container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '30px',
          padding: '20px 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          animation: isVisible ? 'fadeInDown 0.6s ease-out' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Image src="/logo.png" alt="Stoct Logo" width={50} height={50} style={{ borderRadius: '12px' }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              margin: '0',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Stoct - Card Details
            </h1>
          </div>
          <div className="stack-sm" style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
            >
              ← Back to Home
            </button>
            {!isEditing && (
              <button
                onClick={handleEdit}
                style={{
                  background: 'rgba(33, 150, 243, 0.2)',
                  color: '#2196F3',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
              >
                ✏️ Edit Card
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => setShareOpen(true)}
                style={{
                  background: 'rgba(76, 175, 80, 0.2)',
                  color: '#4CAF50',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                🔗 Share Securely
              </button>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            background: message.includes('Error') ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
            border: message.includes('Error') ? '1px solid rgba(244, 67, 54, 0.3)' : '1px solid rgba(76, 175, 80, 0.3)',
            color: message.includes('Error') ? '#F44336' : '#4CAF50',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            animation: 'slideInDown 0.3s ease-out'
          }}>
            {message}
          </div>
        )}

        {/* Card Details */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          animation: isVisible ? 'fadeInUp 0.6s ease-out 0.2s both' : 'none'
        }}>
          {isEditing ? (
            /* Edit Form */
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '0 0 25px 0',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                ✏️ Edit Card
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                      Brand *
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={editData.brand}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                      Number *
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        name="number"
                        value={editData.number}
                        onChange={handleInputChange}
                        required
                        style={{
                          flex: '1',
                          padding: '12px 16px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        style={{
                          background: 'rgba(33, 150, 243, 0.2)',
                          color: '#2196F3',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        📷 Scan
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                      PIN (Optional)
                    </label>
                    <input
                      type="text"
                      name="pin"
                      value={editData.pin}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                      Barcode Type
                    </label>
                    <select
                      name="barcodeType"
                      value={editData.barcodeType}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    >
                      <option value="code128">Code 128</option>
                      <option value="qr">QR Code</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={editData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting || !editData.brand.trim() || !editData.number.trim()}
                    style={{
                      background: isSubmitting || !editData.brand.trim() || !editData.number.trim()
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      color: isSubmitting || !editData.brand.trim() || !editData.number.trim()
                        ? 'rgba(255, 255, 255, 0.5)'
                        : '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: isSubmitting || !editData.brand.trim() || !editData.number.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '25px'
              }}>
                <h2 style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  margin: '0',
                  color: '#ffffff'
                }}>
                  {card.brand}
                </h2>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#b0b0b0',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '20px'
                }}>
                  {card.barcodeType || 'Code 128'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Card Number */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                    Card Number
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px'
                  }}>
                    <span style={{
                      fontSize: '1.2rem',
                      fontFamily: 'monospace',
                      letterSpacing: '2px',
                      color: '#ffffff',
                      flex: '1'
                    }}>
                      {card.number}
                    </span>
                    <button
                      onClick={() => copyData(card.number, 'Card number')}
                      style={{
                        background: 'rgba(33, 150, 243, 0.2)',
                        color: '#2196F3',
                        border: '1px solid rgba(33, 150, 243, 0.3)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* PIN */}
                {card.pin && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                      PIN
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '15px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px'
                    }}>
                      <span style={{
                        fontSize: '1.2rem',
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                        color: '#ffffff',
                        flex: '1'
                      }}>
                        {card.pin}
                      </span>
                      <button
                        onClick={() => copyData(card.pin!, 'PIN')}
                        style={{
                          background: 'rgba(76, 175, 80, 0.2)',
                          color: '#4CAF50',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {card.notes && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                      Notes
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '15px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px'
                    }}>
                      <span style={{
                        fontSize: '1rem',
                        color: '#e0e0e0',
                        flex: '1',
                        lineHeight: '1.5'
                      }}>
                        {card.notes}
                      </span>
                      <button
                        onClick={() => copyData(card.notes!, 'Notes')}
                        style={{
                          background: 'rgba(255, 193, 7, 0.2)',
                          color: '#FFC107',
                          border: '1px solid rgba(255, 193, 7, 0.3)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Barcode Section */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '15px'
                  }}>
                    <label style={{ fontSize: '0.9rem', color: '#e0e0e0' }}>
                      Barcode
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowScanner(true)}
                        style={{
                          background: 'rgba(33, 150, 243, 0.2)',
                          color: '#2196F3',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        📷 Scan
                      </button>
                      <button
                        onClick={() => copyData(card.number, 'Barcode data')}
                        style={{
                          background: 'rgba(76, 175, 80, 0.2)',
                          color: '#4CAF50',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Copy Data
                      </button>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px'
                  }}>
                    <Barcode
                      data={card.number}
                      type={card.barcodeType || 'code128'}
                      width={300}
                      height={80}
                    />
                  </div>
                </div>

                {/* Card Info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: '#b0b0b0'
                }}>
                  <div>
                    <strong>Created:</strong> {new Date(card.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Updated:</strong> {new Date(card.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      <Modal open={shareOpen} title="Share Card Securely" onClose={() => setShareOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.9rem', color: '#e0e0e0' }}>Enter a PIN (4+ characters)</label>
          <input
            type="password"
            value={sharePin}
            onChange={(e) => setSharePin(e.target.value)}
            placeholder="PIN"
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff'
            }}
          />
          <button
            onClick={handleSecureShare}
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              color: '#000',
              border: 'none',
              padding: '10px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Generate Link
          </button>

          {shareLink && (
            <div style={{
              marginTop: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px',
              wordBreak: 'break-all'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#b0b0b0' }}>
                Secure link generated:
              </div>
              <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '8px', 
                borderRadius: '4px', 
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
                marginBottom: '8px'
              }}>
                {shareLink}
              </div>
              <button
                onClick={handleCopyShareLink}
                style={{
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
              >
                📋 Copy Link
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
        />
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}