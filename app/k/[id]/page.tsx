'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardInput, LoyaltyCard, CreditCard, OneTimePassword } from '@/lib/types';
import { getCard, updateCard, markOTPAsUsed, removeCard } from '@/lib/storage';
import { copyToClipboard } from '@/lib/clipboard';
import { Barcode } from '@/lib/barcode';
import { formatCardNumber, getCardIssuer, maskCardNumber, detectCardIssuer } from '@/lib/credit-card-utils';
import { PaymentBrandIcon } from '@/components/icons/PaymentBrandIcon';
import { encryptJsonWithPin, encodeToUrlQuery } from '@/lib/crypto';
import { useToast } from '@/components/ToastProvider';
import { Modal } from '@/components/Modal';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { CardForm } from '@/components/CardForm';
import { PasscodeSettings } from '@/components/PasscodeSettings';
import { LandingPage } from '@/components/LandingPage';
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
  LinearProgress,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
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
  Loyalty as LoyaltyIcon,
  QrCodeScanner as ScanIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/ThemeToggle';

interface CardDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CardDetailPage({ params }: CardDetailPageProps) {
  const [id, setId] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showPasscodeSettings, setShowPasscodeSettings] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const router = useRouter();
  const { showToast } = useToast();

  // Handle async params
  useEffect(() => {
    params.then(({ id: paramId }) => {
      setId(paramId);
    });
  }, [params]);

  // Load card data
  useEffect(() => {
    if (!id) return;
    
    const cardData = getCard(id);
    if (cardData) {
      setCard(cardData);
    } else {
      router.push('/');
    }
  }, [id, router]);

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
      const shareUrl = `${window.location.origin}/s?data=${encodedData}`;
      
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
      // If this is an OTP, auto-delete after sharing the link
      if (card?.type === 'otp') {
        setTimeout(() => {
          handleDelete();
        }, 800);
      }
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to copy link. Please try manually.',
        severity: 'error'
      });
    }
  };

  const handleDelete = () => {
    if (card) {
      removeCard(card.id);
      router.push('/');
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
          // Auto-delete the OTP after use
          setTimeout(() => {
            handleDelete();
          }, 1000); // Small delay to show the success message
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

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleMobileSettings = () => {
    setShowPasscodeSettings(true);
    handleMobileMenuClose();
  };

  const handleMobileAbout = () => {
    localStorage.removeItem('stoct-has-visited');
    setShowLanding(true);
    handleMobileMenuClose();
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
            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: '100px',
                overflowY: 'auto',
                wordBreak: 'break-all',
                wordWrap: 'break-word'
              }}
            >
              <Typography 
                variant="h5" 
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  color: 'text.primary',
                  textAlign: 'center'
                }}
              >
                {maskCardNumber(loyaltyCard.number)}
              </Typography>
            </Box>
            
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
        const issuer = getCardIssuer(creditCard.cardNumber);
        return (
          <>
            <Box
              sx={{
                mb: 2,
                p: { xs: 1.5, sm: 2 },
                backgroundColor: 'action.hover',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: { xs: 'auto', sm: '120px' },
                overflowY: 'auto',
                wordBreak: 'break-all',
                wordWrap: 'break-word'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ display: { xs: 'block', sm: 'block' } }}>
                  <PaymentBrandIcon issuer={(detectCardIssuer(creditCard.cardNumber) as any) || 'unknown'} size={28} />
                </Box>
                <Typography variant="body1" sx={{ 
                  color: issuer.color,
                  fontWeight: 600,
                  fontSize: { xs: '0.9rem', sm: '1.1rem' }
                }}>
                  {issuer.name}
                </Typography>
              </Box>
              <Typography 
                variant="h6"
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: { xs: '1px', sm: '2px' },
                  color: 'text.primary',
                  textAlign: 'center',
                  fontSize: { xs: '1.1rem', sm: '1.5rem' },
                  lineHeight: 1.2
                }}
              >
                {formatCardNumber(maskCardNumber(creditCard.cardNumber))}
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mb: 2, 
              px: { xs: 1, sm: 4 },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 }
            }}>
              <Typography variant="body1" sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                Expires: {creditCard.expiryMonth}/{creditCard.expiryYear}
              </Typography>
              {creditCard.cvv && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  justifyContent: { xs: 'center', sm: 'flex-end' }
                }}>
                  <Typography variant="body1" sx={{ 
                    color: 'text.secondary',
                    fontSize: { xs: '0.9rem', sm: '1.1rem' }
                  }}>
                    CVV: {showCVV ? creditCard.cvv : '•••'}
                  </Typography>
                  <IconButton size="small" onClick={() => setShowCVV(!showCVV)} aria-label={showCVV ? 'Hide CVV' : 'Show CVV'}>
                    {showCVV ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </Box>
              )}
            </Box>
            
            {creditCard.cardholderName && (
              <Typography variant="body1" sx={{ 
                color: 'text.secondary', 
                mb: 2, 
                textAlign: 'center',
                fontSize: { xs: '1rem', sm: '1.2rem' },
                fontWeight: 500
              }}>
                {creditCard.cardholderName}
              </Typography>
            )}
          </>
        );

      case 'otp':
        const otpCard = card as OneTimePassword;
        return (
          <>
            <Box
              sx={{
                mb: 3,
                p: 3,
                backgroundColor: 'action.hover',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: '150px',
                overflowY: 'auto',
                wordBreak: 'break-all',
                wordWrap: 'break-word'
              }}
            >
              <Typography 
                variant="h3" 
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  color: 'text.primary',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  lineHeight: 1.2
                }}
              >
                {otpCard.password}
              </Typography>
            </Box>
            
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

  if (!id) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }

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
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider'
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
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => router.push('/')}
            >
              <Image src="/logo.png" alt="Stoct Logo" width={32} height={32} style={{ borderRadius: '6px' }} />
              <Typography variant="h6" component="h1" sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                display: { xs: 'none', sm: 'block' }
              }}>
                Stoct - Card Details
              </Typography>
              <Typography variant="body1" component="h1" sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                display: { xs: 'block', sm: 'none' }
              }}>
                Stoct
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Beautiful Donate Button */}
            <Button
              component="a"
              href="https://ko-fi.com/stoct"
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="small"
              sx={{ 
                mr: 1, 
                textTransform: 'none', 
                fontWeight: 600,
                background: (theme) => theme.palette.mode === 'dark' 
                  ? 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)'
                  : 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                color: 'white',
                borderRadius: 2,
                px: 2,
                py: 0.5,
                boxShadow: '0 3px 10px rgba(255, 107, 107, 0.3)',
                '&:hover': {
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #FF5252 30%, #FF7043 90%)'
                    : 'linear-gradient(45deg, #FF5252 30%, #FF7043 90%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(255, 107, 107, 0.4)',
                }
              }}
            >
              ❤️ Donate
            </Button>

            {/* Desktop-only buttons */}
            <IconButton
              onClick={handleEdit}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'none', sm: 'flex' }, // Hide on mobile
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
              title="Edit Card"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={handleSecureShare}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'none', sm: 'flex' }, // Hide on mobile
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
              title="Share Securely"
            >
              <ShareIcon />
            </IconButton>
            <IconButton
              onClick={() => setShowPasscodeSettings(true)}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'none', sm: 'flex' }, // Hide on mobile
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
              title="Settings"
            >
              <SettingsIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                localStorage.removeItem('stoct-has-visited');
                setShowLanding(true);
              }}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'none', sm: 'flex' }, // Hide on mobile
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
              title="About Stoct"
            >
              <InfoIcon />
            </IconButton>

            {/* Theme Toggle - always visible */}
            <ThemeToggle />

            {/* Mobile menu button - at the end */}
            <IconButton
              onClick={handleMobileMenuOpen}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'flex', sm: 'none' }, // Show only on mobile
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
              title="Menu"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
        {isEditing ? (
          <Fade in timeout={300}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
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
                    startIcon={<ScanIcon />}
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
                p: { xs: 2, sm: 4, md: 6 }, 
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Card Header */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                mb: { xs: 2, sm: 4 },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography variant="h5" component="h1" sx={{ 
                  color: 'text.primary', 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  textAlign: { xs: 'center', sm: 'left' }
                }}>
                  {card.brand}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getCardIcon()}
                  <Chip 
                    label={card.type?.toUpperCase()} 
                    color={getCardTypeColor()} 
                    sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' }
                    }} 
                    size="small"
                  />
                </Box>
              </Box>
              
              {/* Card Content */}
              {renderCardContent()}
              
              {/* Notes */}
              {card.notes && (
                <Box sx={{ 
                  mt: { xs: 2, sm: 4 }, 
                  p: { xs: 2, sm: 3 }, 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: 2 
                }}>
                  <Typography variant="body1" sx={{ 
                    color: 'text.secondary', 
                    mb: 1,
                    fontSize: { xs: '0.9rem', sm: '1.1rem' },
                    fontWeight: 600
                  }}>
                    Notes:
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: 'text.primary',
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                    lineHeight: 1.5
                  }}>
                    {card.notes}
                  </Typography>
                </Box>
              )}
              
              {/* Action Buttons */}
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1, sm: 2 }, 
                mt: { xs: 3, sm: 4 },
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
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
      <Dialog 
        open={showShareDialog} 
        onClose={() => setShowShareDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0,0,0,0.9)'
          }
        }}
      >
        <DialogTitle>Secure Share Link</DialogTitle>
        <DialogContent sx={{ backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff' }}>
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
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: (t) => t.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff'
                }
              }}
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

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            minWidth: 160
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Card</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSecureShare}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share Securely</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMobileSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMobileAbout}>
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>About Stoct</ListItemText>
        </MenuItem>
      </Menu>

      {/* Landing Page Dialog */}
      {showLanding && (
        <LandingPage onGetStarted={() => setShowLanding(false)} />
      )}

      {/* Passcode Settings Dialog */}
      <PasscodeSettings
        open={showPasscodeSettings}
        onClose={() => setShowPasscodeSettings(false)}
        onPasscodeChanged={() => {
          setNotification({
            open: true,
            message: 'Passcode settings updated successfully!',
            severity: 'success'
          });
        }}
      />

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
