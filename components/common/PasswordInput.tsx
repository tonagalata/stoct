'use client';

import React, { useState } from 'react';
import {
  TextField,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  Button,
  Chip,
  Paper
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoFixHigh as GenerateIcon
} from '@mui/icons-material';
import { validatePassword, getPasswordStrengthLabel, generateStrongPassword, type PasswordStrength } from '@/lib/password-validation';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  showStrengthMeter?: boolean;
  showRequirements?: boolean;
  showGenerator?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

export function PasswordInput({
  label,
  value,
  onChange,
  error,
  helperText,
  showStrengthMeter = true,
  showRequirements = true,
  showGenerator = true,
  required = false,
  autoFocus = false
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [validation, setValidation] = useState<PasswordStrength | null>(null);

  const handlePasswordChange = (newValue: string) => {
    onChange(newValue);
    if (newValue) {
      setValidation(validatePassword(newValue));
    } else {
      setValidation(null);
    }
  };

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword(12);
    handlePasswordChange(generated);
    setShowPassword(true);
    setTimeout(() => setShowPassword(false), 3000); // Hide after 3 seconds
  };

  const strengthLabel = validation ? getPasswordStrengthLabel(validation.overall.score) : null;

  return (
    <Box>
      <TextField
        fullWidth
        label={label}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => handlePasswordChange(e.target.value)}
        error={!!error}
        helperText={error || helperText}
        required={required}
        autoFocus={autoFocus}
        InputProps={{
          endAdornment: (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showGenerator && (
                <IconButton
                  onClick={handleGeneratePassword}
                  size="small"
                  title="Generate strong password"
                >
                  <GenerateIcon />
                </IconButton>
              )}
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                size="small"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Box>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {/* Password Strength Meter */}
      {showStrengthMeter && validation && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Password Strength:
            </Typography>
            <Chip
              label={strengthLabel?.label}
              size="small"
              sx={{
                backgroundColor: strengthLabel?.color,
                color: 'white',
                fontWeight: 600
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {validation.overall.score}/100
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={validation.overall.score}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: strengthLabel?.color,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      )}

      {/* Requirements and Details */}
      {showRequirements && validation && (
        <Box>
          <Button
            onClick={() => setShowDetails(!showDetails)}
            startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            size="small"
            sx={{ mb: 1 }}
          >
            Password Requirements {validation.overall.isValid ? '✅' : '❌'}
          </Button>

          <Collapse in={showDetails}>
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {validation.requirements.length.met ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={validation.requirements.length.description} />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {validation.requirements.uppercase.met ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={validation.requirements.uppercase.description} />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {validation.requirements.lowercase.met ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={validation.requirements.lowercase.description} />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {validation.requirements.numbers.met ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={validation.requirements.numbers.description} />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {validation.requirements.symbols.met ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={validation.requirements.symbols.description} />
                </ListItem>
              </List>

              {/* Suggestions */}
              {validation.overall.suggestions.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    💡 Suggestions:
                  </Typography>
                  {validation.overall.suggestions.map((suggestion, index) => (
                    <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      • {suggestion}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
