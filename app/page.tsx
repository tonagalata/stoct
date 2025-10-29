'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardInput, CardType } from '@/lib/types';
import { getAllCards, createCard, removeCard, exportAllCards, importAllCards, cleanupExpiredOTPs } from '@/lib/storage';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { LandingPage } from '@/components/LandingPage';
import { PasscodeSettings } from '@/components/PasscodeSettings';
import { CardForm } from '@/components/CardForm';
import { CardDisplay } from '@/components/CardDisplay';
import { 
  Button, 
  Grid,
  Container, 
  Paper, 
  Typography, 
  Box, 
  AppBar,
  Toolbar,
  IconButton,
  Fade,
  Alert,
  Snackbar,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  QrCodeScanner as ScanIcon, 
  Download as ExportIcon,
  Upload as ImportIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Add as AddIcon,
  ArrowBack as BackIcon,
  Loyalty as LoyaltyIcon,
  CreditCard as CreditCardIcon,
  VpnKey as OTPIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showPasscodeSettings, setShowPasscodeSettings] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<CardType | 'all'>('all');
  const [creationStep, setCreationStep] = useState<'main' | 'type-select' | 'form'>('main');
  const [selectedTypeForCreation, setSelectedTypeForCreation] = useState<CardType | null>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const router = useRouter();

  // Check for first visit and load cards
  useEffect(() => {
    const hasVisited = localStorage.getItem('stoct-has-visited');
    if (hasVisited) {
      setIsFirstVisit(false);
      setShowLanding(false);
    } else {
      setShowLanding(true);
    }
    
    // Clean up expired OTPs
    cleanupExpiredOTPs();
    setCards(getAllCards());
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem('stoct-has-visited', 'true');
    setShowLanding(false);
    setIsFirstVisit(false);
  };

  // Filter cards by type
  const filteredCards = cards.filter(card => 
    selectedCardType === 'all' || card.type === selectedCardType
  );

  const handleCardSubmit = (cardInput: CardInput) => {
    setIsSubmitting(true);
    try {
      const newCard = createCard(cardInput);
      setCards(getAllCards());
      
      setNotification({
        open: true,
        message: 'Stoct created successfully!',
        severity: 'success'
      });
      
      // Reset creation flow and go back to main view
      setCreationStep('main');
      setSelectedTypeForCreation(null);
      
      // Navigate to the new card after a brief delay
      setTimeout(() => {
        router.push(`/k/${newCard.id}`);
      }, 1000);
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CARD') {
        // Reset creation flow and navigate to existing card
        setCreationStep('main');
        setSelectedTypeForCreation(null);
        router.push(`/k/${error.existingId}`);
      } else {
        setNotification({
          open: true,
          message: 'Error creating Stoct: ' + error.message,
          severity: 'error'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCreation = () => {
    setCreationStep('type-select');
  };

  const handleTypeSelection = (type: CardType) => {
    setSelectedTypeForCreation(type);
    setCreationStep('form');
  };

  const handleBackToMain = () => {
    setCreationStep('main');
    setSelectedTypeForCreation(null);
  };

  const handleBackToTypeSelect = () => {
    setCreationStep('type-select');
    setSelectedTypeForCreation(null);
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

  const handleScan = (data: string) => {
    setShowScanner(false);
    
    // Check for duplicate card number first (only for loyalty cards)
    const existingCard = getAllCards().find(card => 
      card.type === 'loyalty' && (card as any).number === data
    );
    if (existingCard) {
      setNotification({
        open: true,
        message: 'This card already exists. Navigating to existing card.',
        severity: 'info'
      });
      router.push(`/k/${existingCard.id}`);
      return;
    }

    // Try to extract brand from URL or common patterns
    let detectedBrand = '';
    let detectedNotes = '';
    
    if (data.startsWith('http')) {
      try {
        const url = new URL(data);
        detectedBrand = url.hostname.replace('www.', '').split('.')[0];
        detectedBrand = detectedBrand.charAt(0).toUpperCase() + detectedBrand.slice(1);
        detectedNotes = `Scanned from: ${data}`;
      } catch {
        detectedBrand = '';
        detectedNotes = data;
      }
    } else if (data.includes('@')) {
      detectedBrand = 'Email';
      detectedNotes = data;
    }

    // Create a loyalty card with scanned data
    const loyaltyCardInput: CardInput = {
      type: 'loyalty',
      brand: detectedBrand || 'Scanned Card',
      number: data,
      notes: detectedNotes || undefined,
      barcodeType: 'code128'
    };

    handleCardSubmit(loyaltyCardInput);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleDelete = (card: Card) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      removeCard(card.id);
      setCards(getAllCards());
      setNotification({
        open: true,
        message: 'Card deleted successfully!',
        severity: 'success'
      });
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setNotification({
          open: true,
          message: `${fieldName} copied to clipboard!`,
          severity: 'success'
        });
      })
      .catch(() => {
        setNotification({
          open: true,
          message: `Failed to copy ${fieldName}. Please try manually.`,
          severity: 'error'
        });
      });
  };

  const handleExport = () => {
    try {
      exportAllCards();
      setNotification({
        open: true,
        message: 'Cards exported successfully!',
        severity: 'success'
      });
    } catch (error: any) {
      setNotification({
        open: true,
        message: 'Error exporting cards: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setNotification({
        open: true,
        message: 'No file selected for import.',
        severity: 'warning'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        importAllCards(json);
        setCards(getAllCards());
        setNotification({
          open: true,
          message: 'Cards imported successfully!',
          severity: 'success'
        });
      } catch (error: any) {
        setNotification({
          open: true,
          message: 'Error importing cards: ' + error.message,
          severity: 'error'
        });
      }
    };
    reader.readAsText(file);
  };

  // Show landing page for first-time visitors
  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Modern App Bar */}
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
              onClick={() => {
                setCreationStep('main');
                setSelectedTypeForCreation(null);
              }}
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

      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* Step-by-step Creation Flow */}
        {creationStep === 'main' && (
          <>
            {/* Card Type Filter - only show if cards exist */}
            {cards.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Filter by type:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant={selectedCardType === 'all' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedCardType('all')}
                      sx={{ minWidth: 'auto' }}
                    >
                      All ({cards.length})
                    </Button>
                    <Button
                      variant={selectedCardType === 'loyalty' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedCardType('loyalty')}
                      sx={{ minWidth: 'auto' }}
                    >
                      Loyalty ({cards.filter(c => c.type === 'loyalty').length})
                    </Button>
                    <Button
                      variant={selectedCardType === 'credit' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedCardType('credit')}
                      sx={{ minWidth: 'auto' }}
                    >
                      Credit ({cards.filter(c => c.type === 'credit').length})
                    </Button>
                    <Button
                      variant={selectedCardType === 'otp' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedCardType('otp')}
                      sx={{ minWidth: 'auto' }}
                    >
                      OTP ({cards.filter(c => c.type === 'otp').length})
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* Step 1: Type Selection */}
        {creationStep === 'type-select' && (
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
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                  Choose Your Stoct Type
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '600px', mx: 'auto' }}>
                  Select the type of card or information you want to store securely
                </Typography>
              </Box>

              <Grid container spacing={3} justifyContent="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                      }
                    }}
                    onClick={() => handleTypeSelection('loyalty')}
                  >
                    <LoyaltyIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Loyalty Card
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Store membership cards, rewards programs, and loyalty points
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                      }
                    }}
                    onClick={() => handleTypeSelection('credit')}
                  >
                    <CreditCardIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Credit Card
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Securely store credit card information with validation
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                      }
                    }}
                    onClick={() => handleTypeSelection('otp')}
                  >
                    <OTPIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      One-Time Password
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Create temporary passwords that auto-delete after use
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

            </Paper>
          </Fade>
        )}

        {/* Step 2: Card Form */}
        {creationStep === 'form' && selectedTypeForCreation && (
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
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <IconButton
                  onClick={handleBackToTypeSelect}
                  sx={{ mr: 2 }}
                >
                  <BackIcon />
                </IconButton>
                <Box>
                  <Typography variant="h4" component="h2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Create {selectedTypeForCreation === 'loyalty' ? 'Loyalty Card' : 
                           selectedTypeForCreation === 'credit' ? 'Credit Card' : 'One-Time Password'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                    Fill in the details for your new Stoct
                  </Typography>
                </Box>
              </Box>

              <CardForm
                cardType={selectedTypeForCreation}
                onSubmit={handleCardSubmit}
                isSubmitting={isSubmitting}
                onScan={() => setShowScanner(true)}
              />
            </Paper>
          </Fade>
        )}

        {/* Main View - Cards List */}
        {creationStep === 'main' && (
          <>
            {/* Create a Stoct Section - Always visible */}
            <Fade in timeout={400}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  mb: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  textAlign: 'center'
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleStartCreation}
                  startIcon={<AddIcon />}
                  sx={{ 
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  Create a Stoct
                </Button>
              </Paper>
            </Fade>

            {cards.length > 0 ? (
              <>
                {/* Your Stocts Section */}
                <Fade in timeout={600}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: { xs: 2, sm: 3, md: 4 }, 
                      mb: { xs: 2, sm: 4 },
                      backgroundColor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: { xs: 'flex-start', sm: 'center' }, 
                      justifyContent: 'space-between', 
                      mb: { xs: 2, sm: 3 },
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 2, sm: 0 }
                    }}>
                      <Typography variant="h5" component="h2" sx={{ 
                        color: 'text.primary', 
                        fontWeight: 600,
                        fontSize: { xs: '1.5rem', sm: '2rem' }
                      }}>
                        Your Stocts ({filteredCards.length})
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: { xs: 1, sm: 1 },
                        flexDirection: { xs: 'row', sm: 'row' },
                        width: { xs: '100%', sm: 'auto' }
                      }}>
                        <Button
                          variant="outlined"
                          onClick={handleExport}
                          startIcon={<ExportIcon />}
                          size="small"
                          sx={{ 
                            borderColor: 'success.main',
                            color: 'success.main',
                            flex: { xs: 1, sm: 'none' },
                            minWidth: { xs: 'auto', sm: '80px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            px: { xs: 1, sm: 2 },
                            '&:hover': {
                              borderColor: 'success.light',
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            }
                          }}
                        >
                          Export
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => document.getElementById('import-input')?.click()}
                          startIcon={<ImportIcon />}
                          size="small"
                          sx={{ 
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            flex: { xs: 1, sm: 'none' },
                            minWidth: { xs: 'auto', sm: '80px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            px: { xs: 1, sm: 2 },
                            '&:hover': {
                              borderColor: 'primary.light',
                              backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            }
                          }}
                        >
                          Import
                        </Button>
                    <input
                      id="import-input"
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      style={{ display: 'none' }}
                    />
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  {filteredCards.map((card) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.id}>
                      <CardDisplay
                        card={card}
                        onView={(card) => router.push(`/k/${card.id}`)}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Fade>
              </>
            ) : (
              <>
                {/* Empty State - Create Your First Stoct */}
                <Fade in timeout={600}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 6, 
                      mb: 4, 
                      backgroundColor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                      textAlign: 'center'
                    }}
                  >
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h3" component="h2" sx={{ color: 'text.primary', fontWeight: 700, mb: 2 }}>
                        Welcome to Stoct!
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: '500px', mx: 'auto', mb: 4 }}>
                        Store your loyalty cards, credit cards, and one-time passwords securely in one place.
                      </Typography>
                      
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleStartCreation}
                        startIcon={<AddIcon />}
                        sx={{ 
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          fontWeight: 600,
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          borderRadius: 2,
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                          }
                        }}
                      >
                        Create Your First Stoct
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <LoyaltyIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Loyalty Cards
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <CreditCardIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Credit Cards
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <OTPIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          One-Time Passwords
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Fade>

              </>
            )}
          </>
        )}


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

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
        />
      )}


      {/* Passcode Settings Dialog */}
      <PasscodeSettings
        open={showPasscodeSettings}
        onClose={() => setShowPasscodeSettings(false)}
        onPasscodeChanged={() => {
          window.location.reload();
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
