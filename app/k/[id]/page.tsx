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
import { 
  TextField, 
  Button, 
  Container, 
  Paper, 
  Typography, 
  Box, 
  IconButton,
  Chip,
  FormControl,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Fade,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Edit as EditIcon, 
  QrCodeScanner as ScanIcon, 
  ContentCopy as CopyIcon, 
  Share as ShareIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Modern App Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'transparent',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Image src="/logo.png" alt="Stoct Logo" width={40} height={40} style={{ borderRadius: '8px' }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Card Details
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isEditing && (
              <>
                <Button
                  variant="outlined"
                  onClick={handleEdit}
                  startIcon={<EditIcon />}
                  size="small"
                  sx={{ 
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.light',
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    }
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShareOpen(true)}
                  startIcon={<ShareIcon />}
                  size="small"
                  sx={{ 
                    borderColor: 'success.main',
                    color: 'success.main',
                    '&:hover': {
                      borderColor: 'success.light',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    }
                  }}
                >
                  Share
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              onClick={() => router.push('/')}
              startIcon={<BackIcon />}
              size="small"
              sx={{ 
                borderColor: 'text.secondary',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'text.primary',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Back
            </Button>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>

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
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
          {isEditing ? (
            /* Edit Form - MUI */
            <Box>
              <Typography variant="h4" component="h2" sx={{ mb: 3, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon /> Edit Card
              </Typography>
              
              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Brand"
                    name="brand"
                    value={editData.brand}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter card brand"
                    variant="outlined"
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      fullWidth
                      label="Number"
                      name="number"
                      value={editData.number}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter card number"
                      variant="outlined"
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => setShowScanner(true)}
                      startIcon={<ScanIcon />}
                      sx={{ 
                        minWidth: { xs: '100%', sm: 'auto' },
                        minHeight: 56,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          borderColor: 'primary.light',
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        }
                      }}
                    >
                      Scan Barcode
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      fullWidth
                      label="PIN (Optional)"
                      name="pin"
                      value={editData.pin}
                      onChange={handleInputChange}
                      placeholder="Enter PIN"
                      variant="outlined"
                    />
                    
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ mb: 1, color: 'text.primary', fontSize: '0.875rem' }}>
                        Barcode Type
                      </FormLabel>
                      <RadioGroup
                        row
                        name="barcodeType"
                        value={editData.barcodeType}
                        onChange={(e) => setEditData(prev => ({ ...prev, barcodeType: e.target.value as 'qr' | 'code128' }))}
                      >
                        <FormControlLabel 
                          value="code128" 
                          control={<Radio size="small" />} 
                          label="Code 128"
                          sx={{ 
                            '& .MuiFormControlLabel-label': { 
                              fontSize: '0.875rem',
                              color: 'text.primary'
                            }
                          }}
                        />
                        <FormControlLabel 
                          value="qr" 
                          control={<Radio size="small" />} 
                          label="QR Code"
                          sx={{ 
                            '& .MuiFormControlLabel-label': { 
                              fontSize: '0.875rem',
                              color: 'text.primary'
                            }
                          }}
                        />
                      </RadioGroup>
                    </FormControl>
                  </Box>
                  
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    name="notes"
                    value={editData.notes}
                    onChange={handleInputChange}
                    placeholder="Add any additional notes about this card"
                    variant="outlined"
                    multiline
                    rows={4}
                  />
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSubmitting || !editData.brand.trim() || !editData.number.trim()}
                    startIcon={<SaveIcon />}
                    sx={{ 
                      flex: { xs: 1, sm: 1 },
                      minHeight: 48,
                      backgroundColor: 'success.main',
                      '&:hover': {
                        backgroundColor: 'success.dark',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    startIcon={<CancelIcon />}
                    sx={{ 
                      flex: { xs: 1, sm: 1 },
                      minHeight: 48,
                      borderColor: 'text.secondary',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: 'text.primary',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            /* View Mode - MUI */
            <Fade in timeout={600}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h4" component="h2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {card.brand}
                  </Typography>
                  <Chip 
                    label={card.barcodeType || 'Code 128'} 
                    sx={{ 
                      backgroundColor: 'rgba(33, 150, 243, 0.2)',
                      color: 'primary.main',
                      fontWeight: 600
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Card Number */}
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                      Card Number
                    </Typography>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontFamily: 'monospace',
                          letterSpacing: '2px',
                          color: 'text.primary',
                          flex: 1,
                          fontSize: '1.1rem'
                        }}
                      >
                        {card.number}
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => copyData(card.number, 'Card number')}
                        startIcon={<CopyIcon />}
                        size="small"
                        sx={{ 
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          '&:hover': {
                            borderColor: 'primary.light',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          }
                        }}
                      >
                        Copy
                      </Button>
                    </Paper>
                  </Box>

                  {/* PIN */}
                  {card.pin && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                        PIN
                      </Typography>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2,
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))',
                          border: '1px solid',
                          borderColor: 'success.main',
                          borderRadius: 2
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontFamily: 'monospace',
                            letterSpacing: '2px',
                            color: 'text.primary',
                            flex: 1,
                            fontSize: '1.1rem'
                          }}
                        >
                          {card.pin}
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => copyData(card.pin!, 'PIN')}
                          startIcon={<CopyIcon />}
                          size="small"
                          sx={{ 
                            borderColor: 'success.main',
                            color: 'success.main',
                            '&:hover': {
                              borderColor: 'success.light',
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            }
                          }}
                        >
                          Copy
                        </Button>
                      </Paper>
                    </Box>
                  )}

                  {/* Notes */}
                  {card.notes && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                        Notes
                      </Typography>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 193, 7, 0.05))',
                          border: '1px solid',
                          borderColor: 'warning.main',
                          borderRadius: 2
                        }}
                      >
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'text.primary',
                            flex: 1,
                            lineHeight: 1.5
                          }}
                        >
                          {card.notes}
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => copyData(card.notes!, 'Notes')}
                          startIcon={<CopyIcon />}
                          size="small"
                          sx={{ 
                            borderColor: 'warning.main',
                            color: 'warning.main',
                            '&:hover': {
                              borderColor: 'warning.light',
                              backgroundColor: 'rgba(255, 193, 7, 0.1)',
                            }
                          }}
                        >
                          Copy
                        </Button>
                      </Paper>
                    </Box>
                  )}

                  {/* Barcode Section */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Barcode
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setShowScanner(true)}
                          startIcon={<ScanIcon />}
                          size="small"
                          sx={{ 
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              borderColor: 'primary.light',
                              backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            }
                          }}
                        >
                          Scan
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => copyData(card.number, 'Barcode data')}
                          startIcon={<CopyIcon />}
                          size="small"
                          sx={{ 
                            borderColor: 'success.main',
                            color: 'success.main',
                            '&:hover': {
                              borderColor: 'success.light',
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            }
                          }}
                        >
                          Copy Data
                        </Button>
                      </Box>
                    </Box>
                    
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3
                      }}
                    >
                      <Barcode
                        data={card.number}
                        type={card.barcodeType || 'code128'}
                        width={300}
                        height={80}
                      />
                    </Paper>
                  </Box>

                  {/* Card Info */}
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      fontSize: '0.85rem',
                      color: 'text.primary'
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Created: {new Date(card.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Updated: {new Date(card.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </Box>
            </Fade>
          )}
        </Paper>
      </Container>

      {/* Share modal */}
      <Modal open={shareOpen} title="Share Card Securely" onClose={() => setShareOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>Enter a PIN (4+ characters)</Typography>
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
        
        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .container {
            padding: 16px !important;
          }
          
          /* Header buttons - stack on mobile */
          .header-buttons {
            flex-direction: column !important;
            width: 100% !important;
          }
          
          .header-buttons > div {
            width: 100% !important;
          }
          
          /* Make scan button full width on mobile */
          .scan-button-container {
            flex-direction: column !important;
          }
          
          .scan-button-container button {
            width: 100% !important;
            margin-top: 8px;
          }
          
          /* Make PIN and Barcode Type stack on very small screens */
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          
          /* Improve button spacing on mobile */
          .action-buttons {
            gap: 8px !important;
          }
          
          /* Better touch targets */
          input, textarea, select, button {
            min-height: 48px !important;
          }
        }
        
        @media (min-width: 769px) {
          /* Desktop: header buttons in a row */
          .header-buttons {
            flex-direction: row !important;
            align-items: center !important;
          }
          
          .header-buttons > div {
            flex-direction: row !important;
          }
        }
        
        @media (max-width: 480px) {
          /* Extra small screens */
          .container {
            padding: 12px !important;
          }
          
          /* Reduce font sizes slightly on very small screens */
          h1, h2 {
            font-size: 1.3rem !important;
          }
        }
      `}</style>
    </Box>
  );
}