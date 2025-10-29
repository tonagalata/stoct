'use client';

import { useState, useEffect } from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VpnKey as OTPIcon,
  CreditCard as CreditCardIcon,
  Loyalty as LoyaltyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Card, LoyaltyCard, CreditCard, OneTimePassword } from '@/lib/types';
import { Barcode } from '@/lib/barcode';
import { copyToClipboard } from '@/lib/clipboard';
import { markOTPAsUsed } from '@/lib/storage';
import { formatCardNumber, getCardIssuer, maskCardNumber, detectCardIssuer } from '@/lib/credit-card-utils';
import { PaymentBrandIcon } from './icons/PaymentBrandIcon';

interface CardDisplayProps {
  card: Card;
  onView: (card: Card) => void;
  onDelete: (card: Card) => void;
  onCopy: (text: string, fieldName: string) => void;
}

export function CardDisplay({ card, onView, onDelete, onCopy }: CardDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // Handle OTP expiration countdown
  useEffect(() => {
    if (card.type === 'otp') {
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

  const getCardIcon = () => {
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
    switch (card.type) {
      case 'credit':
        return 'secondary';
      case 'otp':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const handleOTPUse = () => {
    if (card.type === 'otp') {
      markOTPAsUsed(card.id);
      onCopy((card as OneTimePassword).password, 'One-time password');
      // Auto-delete the OTP after use
      onDelete(card);
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
    switch (card.type) {
      case 'loyalty':
        const loyaltyCard = card as LoyaltyCard;
        return (
          <>
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                backgroundColor: 'action.hover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: '80px',
                overflowY: 'auto',
                wordBreak: 'break-all',
                wordWrap: 'break-word'
              }}
            >
              <Typography 
                variant="body1" 
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  color: 'text.primary',
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}
              >
                {maskCardNumber(loyaltyCard.number)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Barcode
                data={loyaltyCard.number}
                type={loyaltyCard.barcodeType || 'code128'}
                width={200}
                height={60}
              />
            </Box>
            
            {loyaltyCard.pin && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                PIN: •••
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
                p: 1.5,
                backgroundColor: 'action.hover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: '80px',
                overflowY: 'auto',
                wordBreak: 'break-all',
                wordWrap: 'break-word'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <PaymentBrandIcon issuer={(detectCardIssuer(creditCard.cardNumber) as any) || 'unknown'} size={28} />
                <Typography variant="body2" sx={{ 
                  color: issuer.color,
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}>
                  {issuer.name}
                </Typography>
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  color: 'text.primary',
                  fontSize: '1.1rem',
                  textAlign: 'center'
                }}
              >
                {formatCardNumber(maskCardNumber(creditCard.cardNumber))}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {creditCard.expiryMonth}/{creditCard.expiryYear}
              </Typography>
              {creditCard.cvv && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  CVV: •••
                </Typography>
              )}
            </Box>
            
            {creditCard.cardholderName && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
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
                mb: 2,
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: '120px',
                overflowY: 'auto',
                wordBreak: 'break-all',
                wordWrap: 'break-word'
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  color: 'text.primary',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  lineHeight: 1.2
                }}
              >
                {otpCard.password}
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}>
              {otpCard.description}
            </Typography>
            
            {!otpCard.isUsed && !isExpired && (
              <Alert 
                severity="info" 
                sx={{ mb: 2 }}
                icon={<ScheduleIcon />}
              >
                <Typography variant="body2">
                  Expires in: {timeRemaining}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.max(0, ((otpCard.expiresAt - Date.now()) / (otpCard.expiresAt - otpCard.createdAt)) * 100)}
                  sx={{ mt: 1 }}
                />
              </Alert>
            )}
            
            {otpCard.isUsed && (
              <Alert 
                severity="success" 
                sx={{ mb: 2 }}
                icon={<CheckCircleIcon />}
              >
                <Typography variant="body2">
                  This password has been used
                </Typography>
              </Alert>
            )}
            
            {isExpired && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                icon={<WarningIcon />}
              >
                <Typography variant="body2">
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

  return (
    <MuiCard 
      sx={{ 
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {card.brand}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getCardIcon()}
            <Chip 
              label={card.type?.toUpperCase()} 
              size="small" 
              color={getCardTypeColor()}
              sx={{ 
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            />
          </Box>
        </Box>
        
        {renderCardContent()}
        
        {card.notes && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary', 
              mt: 2, 
              fontStyle: 'italic',
              fontSize: '0.85rem'
            }}
          >
            {card.notes}
          </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => onView(card)}
          startIcon={<ViewIcon />}
          sx={{ 
            backgroundColor: 'primary.main',
            minHeight: 44,
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'primary.dark',
            }
          }}
        >
          View Details
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          {card.type === 'otp' && !(card as OneTimePassword).isUsed && !isExpired ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={handleOTPUse}
              startIcon={<OTPIcon />}
              sx={{ 
                borderColor: 'warning.main',
                color: 'warning.main',
                minHeight: 44,
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'warning.light',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                }
              }}
            >
              Use & Copy
            </Button>
          ) : (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                const textToCopy = card.type === 'loyalty' 
                  ? (card as LoyaltyCard).number
                  : card.type === 'credit'
                  ? (card as CreditCard).cardNumber
                  : (card as OneTimePassword).password;
                onCopy(textToCopy, card.type === 'credit' ? 'Card number' : 'Password');
              }}
              startIcon={<CopyIcon />}
              sx={{ 
                borderColor: 'success.main',
                color: 'success.main',
                minHeight: 44,
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'success.light',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                }
              }}
            >
              Copy
            </Button>
          )}
          
          <Button
            fullWidth
            variant="outlined"
            onClick={() => onDelete(card)}
            startIcon={<DeleteIcon />}
            sx={{ 
              borderColor: 'error.main',
              color: 'error.main',
              minHeight: 44,
              fontWeight: 600,
              '&:hover': {
                borderColor: 'error.light',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
              }
            }}
          >
            Delete
          </Button>
        </Box>
      </CardActions>
    </MuiCard>
  );
}
