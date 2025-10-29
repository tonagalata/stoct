'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardInput, CardType } from '@/lib/types';
import { getAllCards, createCard, removeCard, exportAllCards, importAllCards, cleanupExpiredOTPs } from '@/lib/storage';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { InstallPrompt } from '@/components/InstallPrompt';
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
  Chip
} from '@mui/material';
import { 
  QrCodeScanner as ScanIcon, 
  Download as ExportIcon,
  Upload as ImportIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
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
  const [showInstallInfo, setShowInstallInfo] = useState(false);
  const [showPasscodeSettings, setShowPasscodeSettings] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<CardType | 'all'>('all');

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
        message: 'Card created successfully!',
        severity: 'success'
      });
      
      router.push(`/k/${newCard.id}`);
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CARD') {
        router.push(`/k/${error.existingId}`);
      } else {
        setNotification({
          open: true,
          message: 'Error creating card: ' + error.message,
          severity: 'error'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <Image src="/logo.png" alt="Stoct Logo" width={40} height={40} style={{ borderRadius: '8px' }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Stoct
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => setShowPasscodeSettings(true)}
              sx={{ color: 'text.primary' }}
              title="Security Settings"
            >
              <SecurityIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                localStorage.removeItem('stoct-has-visited');
                setShowLanding(true);
              }}
              sx={{ color: 'text.primary' }}
              title="Show Landing Page"
            >
              <RefreshIcon />
            </IconButton>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* PWA Install Prompt */}
        <Grid container alignItems="center" mb={2}>
          <InstallPrompt /> 
          <Typography variant="caption" sx={{ color: 'text.primary' }}>
            How to Install Stoct as an App
          </Typography>
        </Grid>

        {/* Card Type Filter */}
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

        {/* Conditional rendering based on whether cards exist */}
        {cards.length > 0 ? (
          <>
            {/* Cards List */}
            <Fade in timeout={600}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h4" component="h2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Your Cards ({filteredCards.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleExport}
                      startIcon={<ExportIcon />}
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

            {/* Add New Card Form */}
            <Fade in timeout={800}>
              <Paper 
                elevation={0}
                data-form="add-card"
                sx={{ 
                  p: 3, 
                  mb: 4, 
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="h5" component="h2" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
                  Add New Card
                </Typography>
                
                <CardForm 
                  onSubmit={handleCardSubmit}
                  isSubmitting={isSubmitting}
                />
                
                {/* Scan button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setShowScanner(true)}
                    disabled={isSubmitting}
                    startIcon={<ScanIcon />}
                    fullWidth
                    sx={{ 
                      minHeight: 48,
                      px: 4,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: 'primary.light',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                      '&:disabled': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    Scan Barcode/QR Code
                  </Button>
                </Box>
              </Paper>
            </Fade>
          </>
        ) : (
          <>
            {/* Add New Card Form (shown first when no cards exist) */}
            <Fade in timeout={600}>
              <Paper 
                elevation={0}
                data-form="add-card"
                sx={{ 
                  p: 3, 
                  mb: 4, 
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="h5" component="h2" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
                  Add New Card
                </Typography>
                
                <CardForm 
                  onSubmit={handleCardSubmit}
                  isSubmitting={isSubmitting}
                />
                
                {/* Scan button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setShowScanner(true)}
                    disabled={isSubmitting}
                    startIcon={<ScanIcon />}
                    fullWidth
                    sx={{ 
                      minHeight: 48,
                      px: 4,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: 'primary.light',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                      '&:disabled': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    Scan Barcode/QR Code
                  </Button>
                </Box>
              </Paper>
            </Fade>

            {/* Empty state for no cards */}
            <Fade in timeout={800}>
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
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
                    💳
                  </Typography>
                  <Typography variant="h5" sx={{ mb: 1, color: 'text.primary' }}>
                    No cards yet
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary' }}>
                    Create your first card above or scan a barcode to get started
                  </Typography>
                </Box>
              </Paper>
            </Fade>
          </>
        )}

        {/* PWA Installation Info */}
        <Tooltip
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Benefits of installing Stoct:
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                ⚡ Faster loading from home screen
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                📱 Works offline
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                🏠 Native app experience
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Look for "Add to Home Screen" in your browser menu
              </Typography>
            </Box>
          }
          arrow
          placement="top"
          componentsProps={{
            tooltip: {
              sx: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                maxWidth: 300,
                fontSize: '0.875rem',
                '& .MuiTooltip-arrow': {
                  color: 'rgba(0, 0, 0, 0.9)',
                },
              },
            },
          }}
        >
          <Alert
            severity="info"
            sx={{
              mb: 4,
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.2)',
              '& .MuiAlert-icon': {
                color: 'primary.main'
              },
              '& .MuiAlert-message': {
                color: 'text.primary'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                📱 <strong>Install Stoct as an App!</strong> Add to your home screen for a better experience.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InstallPrompt showInfoIcon={false} />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setShowInstallInfo(true)}
                  sx={{
                    backgroundColor: 'success.main',
                    '&:hover': {
                      backgroundColor: 'success.dark',
                    }
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </Box>
          </Alert>
        </Tooltip>

      </Container>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
        />
      )}

      {/* Install Info Dialog */}
      {showInstallInfo && (
        <InstallPrompt
          showInfoIcon={true}
          forceShowDialog={true}
          onClose={() => setShowInstallInfo(false)}
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
