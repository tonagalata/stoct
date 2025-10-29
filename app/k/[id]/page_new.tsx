'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardInput, LoyaltyCard, CreditCard, OneTimePassword } from '@/lib/types';
import { getCard, updateCard, markOTPAsUsed } from '@/lib/storage';
import { copyToClipboard } from '@/lib/clipboard';
import { Barcode } from '@/lib/barcode';
import { encryptJsonWithPin, encodeToUrlQuery } from '@/lib/crypto';
import { useToast } from '@/components/ToastProvider';
import { Modal } from '@/components/Modal';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { CardForm } from '@/components/CardForm';
import { 
  Button, 
  Container, 
  Paper, 
  Typography, 
  Box, 
  IconButton,
  Chip,
  AppBar,
  Toolbar,
  Fade,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import { 
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CreditCard as CreditCardIcon,
  VpnKey as OTPIcon,
  Loyalty as LoyaltyIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/ThemeToggle';

interface CardDetailPageProps {
  params: {
    id: string;
  };
}

export default function CardDetailPage({ params }: CardDetailPageProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const router = useRouter();
  const { showToast } = useToast();

  // Load card data
  useEffect(() => {
    const cardData = getCard(params.id);
    if (cardData) {
      setCard(cardData);
    } else {
      router.push('/');
    }
  }, [params.id, router]);

  // Handle OTP expiration countdown
  useEffect(() => {
    if (card?.type === 'otp') {
      const otpCard = card as OneTimePassword;
      const updateCountdown = () => {
        const now = Date.now();
        const timeLeft = otpCard.expiresAt - now;
        
        if (timeLeft <= 0) {
          setIsExpired(true);
          setTimeRemaining('Expired');
          return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(interval);
    }
  }, [card]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = (cardInput: CardInput) => {
    if (!card) return;

    setIsSubmitting(true);
    try {
      const updatedCard = updateCard({
        ...card,
        ...cardInput,
        updatedAt: Date.now()
      } as Card);
      
      setCard(updatedCard);
      setIsEditing(false);
      
      setNotification({
        open: true,
        message: 'Card updated successfully!',
        severity: 'success'
      });
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CARD') {
        router.push(`/k/${error.existingId}`);
      } else {
        setNotification({
          open: true,
          message: 'Error updating card: ' + error.message,
          severity: 'error'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    
    if (card?.type === 'loyalty') {
      const loyaltyCardInput: CardInput = {
        type: 'loyalty',
        brand: card.brand,
        number: data,
        pin: (card as LoyaltyCard).pin,
        notes: card.notes,
        barcodeType: (card as LoyaltyCard).barcodeType
      };
      handleSave(loyaltyCardInput);
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleSecureShare = async () => {
    if (!card) return;

    try {
      const pin = prompt('Enter a PIN to encrypt this card (4-8 characters):');
      if (!pin || pin.length < 4 || pin.length > 8) {
        setNotification({
          open: true,
          message: 'Please enter a PIN between 4-8 characters.',
          severity: 'error'
        });
        return;
      }

      const encryptedData = await encryptJsonWithPin(card, pin);
      const encodedData = encodeToUrlQuery(encryptedData);
      const shareUrl = `${window.location.origin}/k/${card.id}?data=${encodedData}`;
      
      setShareLink(shareUrl);
      setShowShareDialog(true);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Error creating secure share link: ' + (error as Error).message,
        severity: 'error'
      });
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await copyToClipboard(shareLink);
      setNotification({
        open: true,
        message: 'Share link copied to clipboard!',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to copy link. Please try manually.',
        severity: 'error'
      });
    }
  };

  const handleOTPUse = () => {
    if (card?.type === 'otp') {
      markOTPAsUsed(card.id);
      setCard({ ...card, isUsed: true } as OneTimePassword);
      
      const otpCard = card as OneTimePassword;
      copyToClipboard(otpCard.password)
        .then(() => {
          setNotification({
            open: true,
            message: 'One-time password copied to clipboard!',
            severity: 'success'
          });
        })
        .catch(() => {
          setNotification({
            open: true,
            message: 'Failed to copy password. Please try manually.',
            severity: 'error'
          });
        });
    }
  };

  const getCardIcon = () => {
    if (!card) return null;
    
    switch (card.type) {
      case 'credit':
        return <CreditCardIcon sx={{ color: 'secondary.main' }} />;
      case 'otp':
        return <OTPIcon sx={{ color: 'warning.main' }} />;
      default:
        return <LoyaltyIcon sx={{ color: 'primary.main' }} />;
    }
  };

  const getCardTypeColor = () => {
    if (!card) return 'primary';
    
    switch (card.type) {
      case 'credit':
        return 'secondary';
      case 'otp':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const maskCardNumber = (number: string) => {
    if (number.length <= 4) return number;
    return '*'.repeat(number.length - 4) + number.slice(-4);
  };

  const formatCardNumber = (number: string) => {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const renderCardContent = () => {
    if (!card) return null;

    switch (card.type) {
      case 'loyalty':
        const loyaltyCard = card as LoyaltyCard;
        return (
          <>
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 3, 
                fontFamily: 'monospace',
                letterSpacing: '2px',
                color: 'text.primary',
                textAlign: 'center'
              }}
            >
              {maskCardNumber(loyaltyCard.number)}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Barcode
                data={loyaltyCard.number}
                type={loyaltyCard.barcodeType || 'code128'}
                width={300}
                height={80}
              />
            </Box>
            
            {loyaltyCard.pin && (
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}>
                PIN: {loyaltyCard.pin}
              </Typography>
            )}
          </>
        );

      case 'credit':
        const creditCard = card as CreditCard;
        return (
          <>
            <Typography 
              variant="h3" 
              sx={{ 
                mb: 3, 
                fontFamily: 'monospace',
                letterSpacing: '3px',
                color: 'text.primary',
                textAlign: 'center'
              }}
            >
              {formatCardNumber(maskCardNumber(creditCard.cardNumber))}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, px: 4 }}>
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                {creditCard.expiryMonth}/{creditCard.expiryYear}
              </Typography>
              {creditCard.cvv && (
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  CVV: {creditCard.cvv}
                </Typography>
              )}
            </Box>
            
            {creditCard.cardholderName && (
              <Typography variant="h5" sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}>
                {creditCard.cardholderName}
              </Typography>
            )}
          </>
        );

      case 'otp':
        const otpCard = card as OneTimePassword;
        return (
          <>
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 3, 
                fontFamily: 'monospace',
                letterSpacing: '3px',
                color: 'text.primary',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              {otpCard.password}
            </Typography>
            
            <Typography variant="h5" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
              {otpCard.description}
            </Typography>
            
            {!otpCard.isUsed && !isExpired && (
              <Alert 
                severity="info" 
                sx={{ mb: 3 }}
                icon={<ScheduleIcon />}
              >
                <Typography variant="h6">
                  Expires in: {timeRemaining}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.max(0, ((otpCard.expiresAt - Date.now()) / (otpCard.expiresAt - otpCard.createdAt)) * 100)}
                  sx={{ mt: 2 }}
                />
              </Alert>
            )}
            
            {otpCard.isUsed && (
              <Alert 
                severity="success" 
                sx={{ mb: 3 }}
                icon={<CheckCircleIcon />}
              >
                <Typography variant="h6">
                  This password has been used
                </Typography>
              </Alert>
            )}
            
            {isExpired && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                icon={<WarningIcon />}
              >
                <Typography variant="h6">
                  This password has expired
                </Typography>
              </Alert>
            )}
          </>
        );

      default:
        return null;
    }
  };

  if (!card) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6">Card not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* App Bar */}
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
            <IconButton
              onClick={() => router.push('/')}
              sx={{ color: 'text.primary' }}
            >
              <BackIcon />
            </IconButton>
            <Image src="/logo.png" alt="Stoct Logo" width={32} height={32} style={{ borderRadius: '6px' }} />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Stoct - Card Details
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={handleEdit}
              sx={{ color: 'text.primary' }}
              title="Edit Card"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={handleSecureShare}
              sx={{ color: 'text.primary' }}
              title="Share Securely"
            >
              <ShareIcon />
            </IconButton>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {isEditing ? (
          <Fade in timeout={300}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography variant="h5" component="h2" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
                Edit Card
              </Typography>
              
              <CardForm 
                onSubmit={handleSave}
                isSubmitting={isSubmitting}
                initialData={card}
              />
              
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  fullWidth
                >
                  Cancel
                </Button>
                {card.type === 'loyalty' && (
                  <Button
                    variant="outlined"
                    onClick={() => setShowScanner(true)}
                    disabled={isSubmitting}
                    startIcon={<BarcodeScanner />}
                    fullWidth
                  >
                    Scan New Number
                  </Button>
                )}
              </Box>
            </Paper>
          </Fade>
        ) : (
          <Fade in timeout={300}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 6, 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Card Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" component="h1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {card.brand}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getCardIcon()}
                  <Chip 
                    label={card.type.toUpperCase()} 
                    color={getCardTypeColor()}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>
              
              {/* Card Content */}
              {renderCardContent()}
              
              {/* Notes */}
              {card.notes && (
                <Box sx={{ mt: 4, p: 3, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                    Notes:
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary' }}>
                    {card.notes}
                  </Typography>
                </Box>
              )}
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                {card.type === 'otp' && !(card as OneTimePassword).isUsed && !isExpired ? (
                  <Button
                    variant="contained"
                    onClick={handleOTPUse}
                    startIcon={<OTPIcon />}
                    fullWidth
                    sx={{ 
                      backgroundColor: 'warning.main',
                      '&:hover': {
                        backgroundColor: 'warning.dark',
                      }
                    }}
                  >
                    Use & Copy Password
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => {
                      const textToCopy = card.type === 'loyalty' 
                        ? (card as LoyaltyCard).number
                        : card.type === 'credit'
                        ? (card as CreditCard).cardNumber
                        : (card as OneTimePassword).password;
                      copyToClipboard(textToCopy)
                        .then(() => {
                          setNotification({
                            open: true,
                            message: 'Copied to clipboard!',
                            severity: 'success'
                          });
                        });
                    }}
                    startIcon={<CopyIcon />}
                    fullWidth
                  >
                    Copy {card.type === 'credit' ? 'Card Number' : 'Password'}
                  </Button>
                )}
              </Box>
              
              {/* Card Info */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  Created: {new Date(card.createdAt).toLocaleDateString()} • 
                  Updated: {new Date(card.updatedAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Paper>
          </Fade>
        )}
      </Container>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
        />
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Secure Share Link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This link is encrypted and can only be opened with the correct PIN. The link will be invalidated after first use.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={shareLink}
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
            <Button
              variant="outlined"
              onClick={handleCopyShareLink}
              startIcon={<CopyIcon />}
            >
              Copy
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notification System */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
