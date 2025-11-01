'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Button, 
  Container, 
  Paper, 
  Typography, 
  Box, 
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Alert,
  Fade,
  Card,
  CardContent,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Info as InfoIcon,
  Share as ShareIcon,
  ArrowBack as BackIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Download as ImportIcon,
  MoreVert as MoreIcon,
  ContentPaste as PasteIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PasscodeSettings } from '@/components/PasscodeSettings';
import { LandingPage } from '@/components/LandingPage';
import { decryptJsonWithPin, decodeFromUrlQuery, EncryptedPayload, isTokenUsed, markTokenAsUsed } from '@/lib/crypto';
import { createCard } from '@/lib/storage';

export default function SecureSharePage() {
  const router = useRouter();
  const [payload, setPayload] = useState<EncryptedPayload | null>(null);
  const [shareData, setShareData] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const [step, setStep] = useState<'data-entry' | 'pin-entry' | 'preview' | 'done'>('data-entry');
  const [showPasscodeSettings, setShowPasscodeSettings] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
      // If data is in URL, auto-populate and proceed to PIN entry
      setShareData(data);
      handleDataSubmit(data);
    }
  }, []);

  const handleDataSubmit = (data?: string) => {
    const dataToProcess = data || shareData;
    if (!dataToProcess.trim()) {
      setError('Please enter the encrypted share data.');
      return;
    }
    
    setError('');
    try {
      const p = decodeFromUrlQuery(dataToProcess);
      setPayload(p);
      setStep('pin-entry');
    } catch (e) {
      setError('Invalid share data format. Please check the data and try again.');
    }
  };

  const handleDecrypt = async () => {
    if (!payload) return;
    setError('');
    
    // Check if token has already been used (but don't mark it as used yet)
    if (isTokenUsed(payload.t)) {
      setError('This link has already been used and is no longer valid.');
      return;
    }
    
    console.log('Token checked but not marked as used yet - safe for messaging app prefetching');
    
    try {
      const data = await decryptJsonWithPin(payload, pin);
      setPreview(data);
      setStep('preview');
    } catch (e) {
      setError('Incorrect PIN or corrupted link.');
    }
  };

  const handleImport = () => {
    if (!preview || !payload) return;
    
    // Check one more time if token has been used (race condition protection)
    if (isTokenUsed(payload.t)) {
      setError('This link has already been used and is no longer valid.');
      return;
    }
    
    try {
      // Mark token as used only when actually importing
      console.log('Marking token as used - card is being imported');
      markTokenAsUsed(payload.t);
      
      // Handle different card types
      let cardInput: any;
      
      if (preview.type === 'credit') {
        cardInput = {
          type: 'credit',
          brand: String(preview.brand || 'Shared Credit Card'),
          cardNumber: String(preview.cardNumber || ''),
          expiryMonth: preview.expiryMonth || '',
          expiryYear: preview.expiryYear || '',
          cvv: preview.cvv ? String(preview.cvv) : undefined,
          notes: preview.notes ? String(preview.notes) : undefined
        };
      } else if (preview.type === 'otp') {
        cardInput = {
          type: 'otp',
          description: String(preview.description || 'Shared OTP'),
          password: String(preview.password || ''),
          expiresAt: preview.expiresAt || Date.now() + 24 * 60 * 60 * 1000, // Default 24h if not set
          notes: preview.notes ? String(preview.notes) : undefined
        };
      } else {
        // Default to loyalty card
        cardInput = {
          type: 'loyalty',
          brand: String(preview.brand || 'Shared Card'),
          number: String(preview.number || ''),
          pin: preview.pin ? String(preview.pin) : undefined,
          notes: preview.notes ? String(preview.notes) : undefined,
          barcodeType: (preview.barcodeType === 'qr' ? 'qr' : 'code128')
        };
      }
      
      const card = createCard(cardInput);
      setStep('done');
      // Navigate to the imported card
      router.push(`/k/${card.id}`);
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_CARD' && e.existingId) {
        // Still mark as used even if duplicate, since the link was successfully processed
        router.push(`/k/${e.existingId}`);
      } else {
        setError('Failed to import shared card.');
      }
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


  const getCardTypeInfo = () => {
    if (!preview) return { name: 'Card', color: 'primary' };
    
    switch (preview.type) {
      case 'credit':
        return { name: 'Credit Card', color: 'secondary' };
      case 'otp':
        return { name: 'One-Time Password', color: 'warning' };
      default:
        return { name: 'Loyalty Card', color: 'primary' };
    }
  };

  // Show landing page if requested
  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Navigation Bar - Same as main app */}
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
              sx={{ 
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
              title="Back to Home"
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
                Stoct
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
              onClick={() => setShowPasscodeSettings(true)}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'none', sm: 'flex' },
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
                display: { xs: 'none', sm: 'flex' },
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

            {/* Mobile menu button */}
            <IconButton
              onClick={handleMobileMenuOpen}
              sx={{ 
                color: 'text.primary',
                display: { xs: 'flex', sm: 'none' },
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

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Page Header */}
        <Fade in timeout={300}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 4,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}
          >
            <ShareIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" sx={{ 
              color: 'text.primary', 
              fontWeight: 600, 
              mb: 2 
            }}>
              Import Shared Card
            </Typography>
            <Typography variant="body1" sx={{ 
              color: 'text.secondary', 
              maxWidth: '600px', 
              mx: 'auto' 
            }}>
              Enter the PIN to decrypt and import a shared card securely
            </Typography>
          </Paper>
        </Fade>

        {/* Main Content */}
        <Fade in timeout={500}>
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
            {/* Data Entry Step */}
            {step === 'data-entry' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <ShareIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Enter Share Data
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Paste the encrypted share data you received. This could be from a share link URL or copied directly from the encrypted data.
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Encrypted Share Data"
                    value={shareData}
                    onChange={(e) => setShareData(e.target.value)}
                    placeholder="Paste the encrypted share data here... (e.g., from a share link or copied data)"
                    variant="outlined"
                    error={!!error}
                    helperText={error || 'Paste the share data from a Stoct share link or the encrypted data directly'}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        // If it's a full URL, extract the data parameter
                        if (text.includes('/s?data=')) {
                          const url = new URL(text);
                          const data = url.searchParams.get('data');
                          if (data) {
                            setShareData(data);
                          } else {
                            setShareData(text);
                          }
                        } else {
                          setShareData(text);
                        }
                        setError('');
                      } catch (err) {
                        setError('Failed to paste from clipboard. Please paste manually.');
                      }
                    }}
                    startIcon={<PasteIcon />}
                    sx={{ 
                      mb: 1
                    }}
                    fullWidth
                  >
                    Paste from Clipboard
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleDataSubmit()}
                  disabled={!shareData.trim()}
                  startIcon={<LockIcon />}
                  sx={{ 
                    py: 1.5,
                    fontWeight: 600,
                    '&:disabled': {
                      backgroundColor: 'action.disabledBackground',
                    }
                  }}
                >
                  Process Share Data
                </Button>
              </Box>
            )}

            {/* Error State - Link Already Used */}
            {payload && error && error.includes('already been used') && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Link Already Used
                  </Typography>
                  <Typography variant="body2">
                    This secure link has already been used and is no longer valid.
                  </Typography>
                </Alert>
                <Button 
                  variant="outlined" 
                  onClick={() => router.push('/')}
                  startIcon={<BackIcon />}
                >
                  Go Home
                </Button>
              </Box>
            )}

            {/* PIN Entry Step */}
            {payload && step === 'pin-entry' && !error.includes('already been used') && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <LockIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Enter PIN to Unlock
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    type="password"
                    label="PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter the PIN provided with this link"
                    variant="outlined"
                    error={!!error && !error.includes('already been used')}
                    helperText={error && !error.includes('already been used') ? error : 'Enter the 4-8 character PIN'}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && pin) {
                        handleDecrypt();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="contained"
                    onClick={handleDecrypt}
                    disabled={!pin}
                    startIcon={<VisibilityIcon />}
                    sx={{ 
                      flex: 1,
                      py: 1.5,
                      fontWeight: 600,
                      '&:disabled': {
                        backgroundColor: 'action.disabledBackground',
                      }
                    }}
                  >
                    Unlock and Preview
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setStep('data-entry');
                      setPayload(null);
                      setPin('');
                      setError('');
                    }}
                    startIcon={<BackIcon />}
                    sx={{ 
                      flex: { xs: 1, sm: 'none' },
                      py: 1.5
                    }}
                  >
                    Back
                  </Button>
                </Box>
              </Box>
            )}

            {/* Preview Step */}
            {payload && step === 'preview' && preview && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <VisibilityIcon sx={{ color: 'success.main' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Card Preview
                  </Typography>
                  <Chip 
                    label={getCardTypeInfo().name} 
                    color={getCardTypeInfo().color as any}
                    size="small"
                  />
                </Box>

                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    ✅ This link will only expire after you import the card, not when viewing it.
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      Card Details
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Brand:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {String(preview.brand || preview.description || 'Shared Card')}
                        </Typography>
                      </Box>
                      
                      {preview.number && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Number:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                            {String(preview.number)}
                          </Typography>
                        </Box>
                      )}
                      
                      {preview.cardNumber && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Card Number:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                            {String(preview.cardNumber)}
                          </Typography>
                        </Box>
                      )}
                      
                      {preview.password && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Password:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                            {String(preview.password)}
                          </Typography>
                        </Box>
                      )}
                      
                      {preview.pin && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">PIN:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                            {String(preview.pin)}
                          </Typography>
                        </Box>
                      )}
                      
                      {preview.notes && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Notes:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {String(preview.notes)}
                          </Typography>
                        </Box>
                      )}
                      
                      {preview.barcodeType && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Barcode Type:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {preview.barcodeType === 'qr' ? 'QR Code' : 'Code 128'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="contained"
                    onClick={handleImport}
                    startIcon={<ImportIcon />}
                    sx={{ 
                      flex: 1,
                      py: 1.5,
                      fontWeight: 600,
                      backgroundColor: 'success.main',
                      '&:hover': {
                        backgroundColor: 'success.dark',
                      }
                    }}
                  >
                    Import Card
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setStep('pin-entry');
                      setPreview(null);
                      setError('');
                    }}
                    startIcon={<BackIcon />}
                    sx={{ 
                      flex: { xs: 1, sm: 'none' },
                      py: 1.5
                    }}
                  >
                    Back
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Fade>
      </Container>

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

      {/* Passcode Settings Dialog */}
      <PasscodeSettings
        open={showPasscodeSettings}
        onClose={() => setShowPasscodeSettings(false)}
        onPasscodeChanged={() => {
          window.location.reload();
        }}
      />
    </Box>
  );
}