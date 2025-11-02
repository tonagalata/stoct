'use client';

import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Fade,
  Chip,
  IconButton,
  InputAdornment,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Schedule as ScheduleIcon,
  CreditCard as CreditCardIcon,
  VpnKey as OTPIcon
} from '@mui/icons-material';
import { CardType, CardInput, LoyaltyCardInput, CreditCardInput, OneTimePasswordInput } from '@/lib/types';
import { CardTypeSelector } from './CardTypeSelector';
import { validateCardNumber, formatCardNumber, detectCardIssuer } from '@/lib/credit-card-utils';
import { PaymentBrandIcon } from './icons/PaymentBrandIcon';

interface CardFormProps {
  onSubmit: (cardInput: CardInput) => void;
  isSubmitting?: boolean;
  initialData?: Partial<CardInput>;
  cardType?: CardType; // Optional: if provided, locks the form to this type
  onScan?: () => void; // Optional: callback for scan button
}

export function CardForm({ onSubmit, isSubmitting = false, initialData, cardType: fixedCardType, onScan }: CardFormProps) {
  const [cardType, setCardType] = useState<CardType>(fixedCardType || 'loyalty');
  const [formData, setFormData] = useState({
    brand: '',
    number: '',
    pin: '',
    notes: '',
    barcodeType: undefined as 'qr' | 'code128' | undefined,
    // Credit card fields
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    // OTP fields
    password: '',
    description: '',
    expiresInHours: 24
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [cardValidation, setCardValidation] = useState<{
    isValid: boolean;
    issuer: any;
    formatted: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setCardType(initialData.type || 'loyalty');
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Map old number field to appropriate field based on type
        number: initialData.type === 'loyalty' ? (initialData as LoyaltyCardInput).number || '' : prev.number,
        cardNumber: initialData.type === 'credit' ? (initialData as CreditCardInput).cardNumber || '' : prev.cardNumber,
        password: initialData.type === 'otp' ? (initialData as OneTimePasswordInput).password || '' : prev.password,
      }));
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for credit card number
    if (name === 'cardNumber') {
      const digitsOnly = value.replace(/\D/g, '');
      const issuerKey = detectCardIssuer(digitsOnly) as any;
      const formatted = formatCardNumber(digitsOnly);
      const validation = validateCardNumber(digitsOnly);
      setCardValidation(validation);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let cardInput: CardInput;
    
    if (cardType === 'credit') {
      cardInput = {
        type: 'credit',
        brand: formData.brand.trim(),
        cardNumber: formData.cardNumber.trim(),
        expiryMonth: formData.expiryMonth,
        expiryYear: formData.expiryYear,
        cvv: formData.cvv.trim() || undefined,
        cardholderName: formData.cardholderName.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      } as CreditCardInput;
    } else if (cardType === 'otp') {
      cardInput = {
        type: 'otp',
        brand: formData.brand.trim(),
        password: formData.password.trim(),
        description: formData.description.trim(),
        expiresInHours: formData.expiresInHours,
        notes: formData.notes.trim() || undefined,
      } as OneTimePasswordInput;
    } else {
      cardInput = {
        type: 'loyalty',
        brand: formData.brand.trim(),
        number: formData.number.trim(),
        pin: formData.pin.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        barcodeType: formData.barcodeType || undefined,
      } as LoyaltyCardInput;
    }
    
    onSubmit(cardInput);
  };

  const isFormValid = () => {
    if (!formData.brand.trim()) return false;
    
    if (cardType === 'credit') {
      return formData.cardNumber.trim() && formData.expiryMonth && formData.expiryYear && 
             cardValidation?.isValid === true;
    } else if (cardType === 'otp') {
      return formData.password.trim() && formData.description.trim();
    } else {
      return formData.number.trim();
    }
  };

  const generateMonths = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: String(i + 1).padStart(2, '0')
    }));
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 20 }, (_, i) => ({
      value: String(currentYear + i),
      label: String(currentYear + i)
    }));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Card Type Selector - only show if cardType is not fixed */}
      {!fixedCardType && (
        <CardTypeSelector
          value={cardType}
          onChange={setCardType}
          disabled={isSubmitting}
        />
      )}

      {/* Brand Field */}
      <TextField
        fullWidth
        label="Brand/Issuer"
        name="brand"
        value={formData.brand}
        onChange={handleInputChange}
        required
        placeholder={cardType === 'credit' ? 'e.g., Visa, Mastercard' : cardType === 'otp' ? 'e.g., Google, Microsoft' : 'e.g., Starbucks'}
        variant="outlined"
        size="small"
      />

      {/* Dynamic Fields Based on Card Type */}
      {cardType === 'loyalty' && (
        <>
          <TextField
            fullWidth
            label="Card Number"
            name="number"
            value={formData.number}
            onChange={handleInputChange}
            required
            placeholder="Card number"
            variant="outlined"
            size="small"
          />
          
          <TextField
            fullWidth
            label="PIN (Optional)"
            name="pin"
            value={formData.pin}
            onChange={handleInputChange}
            placeholder="PIN code"
            variant="outlined"
            size="small"
          />
          
          <FormControl component="fieldset" fullWidth>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Barcode Type (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  id="barcode-none"
                  name="barcodeType"
                  value=""
                  checked={!formData.barcodeType}
                  onChange={handleInputChange}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="barcode-none" style={{ cursor: 'pointer' }}>
                  None
                </label>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  id="barcode-code128"
                  name="barcodeType"
                  value="code128"
                  checked={formData.barcodeType === 'code128'}
                  onChange={handleInputChange}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="barcode-code128" style={{ cursor: 'pointer' }}>
                  Code 128
                </label>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  id="barcode-qr"
                  name="barcodeType"
                  value="qr"
                  checked={formData.barcodeType === 'qr'}
                  onChange={handleInputChange}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="barcode-qr" style={{ cursor: 'pointer' }}>
                  QR Code
                </label>
              </Box>
            </Box>
          </FormControl>
        </>
      )}

      {cardType === 'credit' && (
        <>
          <Box>
            <TextField
              fullWidth
              label="Card Number"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleInputChange}
              required
              placeholder="1234 5678 9012 3456"
              variant="outlined"
              size="small"
              inputProps={{ maxLength: 19 }}
              error={cardValidation ? !cardValidation.isValid : false}
              helperText={cardValidation?.error}
              InputProps={{
                endAdornment: cardValidation?.issuer && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                    <PaymentBrandIcon issuer={(detectCardIssuer(formData.cardNumber) as any) || 'unknown'} size={28} />
                    <Typography variant="body2" sx={{ 
                      color: cardValidation.isValid ? 'success.main' : 'error.main',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}>
                      {cardValidation.issuer.name}
                    </Typography>
                  </Box>
                )
              }}
            />
            {cardValidation?.formatted && cardValidation.formatted !== formData.cardNumber && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                Formatted: {cardValidation.formatted}
              </Typography>
            )}
          </Box>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Expiry Month</InputLabel>
              <Select
                fullWidth
                name="expiryMonth"
                value={formData.expiryMonth}
                onChange={handleSelectChange}
                label="Expiry Month"
                required
                sx={{ 
                  width: '100%',
                  backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
                  '& .MuiSelect-select': {
                    backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
                      border: '1px solid',
                      borderColor: 'divider'
                    }
                  },
                  MenuListProps: {
                    sx: { backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff' }
                  }
                }}
              >
                {generateMonths().map(month => (
                  <MenuItem 
                    key={month.value} 
                    value={month.value}
                    sx={{ backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff' }}
                  >
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}> 
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Expiry Year</InputLabel>
              <Select
                name="expiryYear"
                value={formData.expiryYear}
                onChange={handleSelectChange}
                label="Expiry Year"
                required
                sx={{ 
                  backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
                  '& .MuiSelect-select': {
                    backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
                      border: '1px solid',
                      borderColor: 'divider'
                    }
                  },
                  MenuListProps: {
                    sx: { backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff' }
                  }
                }}
              >
                {generateYears().map(year => (
                  <MenuItem 
                    key={year.value} 
                    value={year.value}
                    sx={{ backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff' }}
                  >
                    {year.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="CVV (Optional)"
              name="cvv"
              value={formData.cvv}
              onChange={handleInputChange}
              placeholder="123"
              variant="outlined"
              size="small"
              inputProps={{ maxLength: 4 }}
              type={showCVV ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCVV(!showCVV)}
                      edge="end"
                      size="small"
                    >
                      {showCVV ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              fullWidth
              label="Cardholder Name (Optional)"
              name="cardholderName"
              value={formData.cardholderName}
              onChange={handleInputChange}
              placeholder="John Doe"
              variant="outlined"
              size="small"
            />
          </Box>
        </>
      )}

      {cardType === 'otp' && (
        <>
          <TextField
            fullWidth
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder="Enter the one-time password"
            variant="outlined"
            size="small"
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            placeholder="e.g., Google Account, Microsoft Account"
            variant="outlined"
            size="small"
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScheduleIcon sx={{ color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Expires In</InputLabel>
              <Select
                name="expiresInHours"
                value={formData.expiresInHours}
                onChange={handleSelectChange}
                label="Expires In"
                sx={{ 
                  backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
                  '& .MuiSelect-select': {
                    backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff',
                      border: '1px solid',
                      borderColor: 'divider'
                    }
                  },
                  MenuListProps: {
                    sx: { backgroundColor: (t) => t.palette.mode === 'dark' ? '#121212' : '#ffffff' }
                  }
                }}
              >
                <MenuItem value={1}>1 Hour</MenuItem>
                <MenuItem value={6}>6 Hours</MenuItem>
                <MenuItem value={24}>24 Hours</MenuItem>
                <MenuItem value={72}>3 Days</MenuItem>
                <MenuItem value={168}>1 Week</MenuItem>
              </Select>
            </FormControl>
            <Chip 
              label={`Expires in ${formData.expiresInHours}h`} 
              size="small" 
              color="warning"
              icon={<ScheduleIcon />}
            />
          </Box>
        </>
      )}

      {/* Notes Field */}
      <TextField
        fullWidth
        label="Notes (Optional)"
        name="notes"
        value={formData.notes}
        onChange={handleInputChange}
        placeholder="Additional notes or details"
        variant="outlined"
        multiline
        rows={2}
        size="small"
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        {/* Scan Button - only show for loyalty cards and if onScan is provided */}
        {cardType === 'loyalty' && onScan && (
          <Button
            type="button"
            variant="outlined"
            onClick={onScan}
            disabled={isSubmitting}
            startIcon={<CreditCardIcon />}
            sx={{ 
              minHeight: 48,
              flex: { xs: 1, sm: 'none' },
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              }
            }}
          >
            Scan Card
          </Button>
        )}
        
        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || !isFormValid()}
          startIcon={<AddIcon />}
          sx={{ 
            minHeight: 48,
            flex: 1,
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&:disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'action.disabled',
            }
          }}
        >
          {isSubmitting ? 'Creating...' : `Create ${cardType === 'credit' ? 'Credit Card' : cardType === 'otp' ? 'One-Time Password' : 'Loyalty Card'}`}
        </Button>
      </Box>
    </Box>
  );
}
