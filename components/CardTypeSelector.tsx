'use client';

import { useState } from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Chip
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Loyalty as LoyaltyIcon,
  VpnKey as OTPIcon
} from '@mui/icons-material';
import { CardType } from '@/lib/types';

interface CardTypeSelectorProps {
  value: CardType;
  onChange: (type: CardType) => void;
  disabled?: boolean;
}

export function CardTypeSelector({ value, onChange, disabled = false }: CardTypeSelectorProps) {
  const cardTypes = [
    {
      type: 'loyalty' as CardType,
      label: 'Loyalty Card',
      description: 'Store cards, membership cards, gift cards',
      icon: <LoyaltyIcon />,
      color: 'primary' as const
    },
    {
      type: 'credit' as CardType,
      label: 'Credit Card',
      description: 'Credit cards, debit cards, bank cards',
      icon: <CreditCardIcon />,
      color: 'secondary' as const
    },
    {
      type: 'otp' as CardType,
      label: 'One-Time Password',
      description: 'Temporary passwords that auto-expire',
      icon: <OTPIcon />,
      color: 'warning' as const
    }
  ];

  return (
    <FormControl component="fieldset" disabled={disabled}>
      <FormLabel component="legend" sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
        Card Type
      </FormLabel>
      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as CardType)}
        sx={{ gap: 1 }}
      >
        {cardTypes.map((cardType) => (
          <FormControlLabel
            key={cardType.type}
            value={cardType.type}
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {cardType.icon}
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {cardType.label}
                  </Typography>
                  <Chip 
                    label={cardType.type.toUpperCase()} 
                    size="small" 
                    color={cardType.color}
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                  {cardType.description}
                </Typography>
              </Box>
            }
            sx={{
              border: '1px solid',
              borderColor: value === cardType.type ? `${cardType.color}.main` : 'divider',
              borderRadius: 2,
              backgroundColor: value === cardType.type ? `${cardType.color}.main` + '10' : 'transparent',
              '&:hover': {
                backgroundColor: value === cardType.type ? `${cardType.color}.main` + '15' : 'action.hover',
              },
              transition: 'all 0.2s ease',
              '& .MuiFormControlLabel-label': {
                width: '100%',
                margin: 0
              }
            }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
