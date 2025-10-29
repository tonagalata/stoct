'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardInput, CardType } from '@/lib/types';
import { getAllCards, createCard, removeCard, exportAllCards, importAllCards, cleanupExpiredOTPs } from '@/lib/storage';
import { Barcode } from '@/lib/barcode';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { InstallPrompt } from '@/components/InstallPrompt';
import { LandingPage } from '@/components/LandingPage';
import { PasscodeSettings } from '@/components/PasscodeSettings';
import { CardForm } from '@/components/CardForm';
import { CardDisplay } from '@/components/CardDisplay';
import { 
  TextField, 
  Button, 
  Grid,
  Container, 
  Paper, 
  Typography, 
  Box, 
  Card as MuiCard,
  CardContent,
  CardActions,
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
  AppBar,
  Toolbar,
  Fade,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  QrCodeScanner as ScanIcon, 
  ContentCopy as CopyIcon, 
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showLanding, setShowLanding] = useState(false); // Start with false to prevent hydration mismatch
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showInstallInfo, setShowInstallInfo] = useState(false);
  const [showPasscodeSettings, setShowPasscodeSettings] = useState(false);
  const [formData, setFormData] = useState<CardInput>({
    type: 'loyalty',
    brand: '',
    number: '',
    pin: '',
    notes: '',
    barcodeType: 'code128'
  });
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
    try {
      const newCard = createCard(cardInput);
      setCards(getAllCards());
      setFormData({
        type: 'loyalty',
        brand: '',
        number: '',
        pin: '',
        notes: '',
        barcodeType: 'code128'
      });
      
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand.trim() || !formData.number.trim()) return;

    setIsSubmitting(true);
    try {
      const newCard = createCard({
        brand: formData.brand.trim(),
        number: formData.number.trim(),
        pin: formData.pin.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        barcodeType: formData.barcodeType
      });
      
      setCards(getAllCards());
      setFormData({
        brand: '',
        number: '',
        pin: '',
        notes: '',
        barcodeType: 'code128'
      });
      
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
    
    // Check for duplicate card number first
    const existingCard = getAllCards().find(card => card.number === data);
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
        detectedBrand = detectedBrand.charAt(0).toUpperCase() + detectedBrand.slice(1); // Capitalize
        detectedNotes = `Scanned from: ${data}`;
      } catch {
        detectedBrand = '';
        detectedNotes = data;
      }
    } else if (data.includes('@')) {
      detectedBrand = 'Email';
      detectedNotes = data;
    }

    // Populate the form with scanned data instead of creating card immediately
    setFormData(prev => ({
      ...prev,
      number: data,
      brand: detectedBrand || prev.brand, // Keep existing brand if no detection
      notes: detectedNotes || prev.notes, // Keep existing notes if no detection
      barcodeType: 'code128' // Default to Code 128 for scanned cards
    }));

    setNotification({
      open: true,
      message: 'Card number scanned! Please fill in the brand and other details, then click "Add Card".',
      severity: 'success'
    });

    // Scroll to the form (in case user is viewing cards section)
    setTimeout(() => {
      const formElement = document.querySelector('[data-form="add-card"]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
    copyToClipboard(text)
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
    const data = exportAllCards();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stoct-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importAllCards(data);
        setCards(getAllCards());
        alert('Cards imported successfully!');
      } catch (error) {
        alert('Error importing cards: Invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const maskNumber = (number: string) => {
    if (number.length <= 4) return number;
    return '*'.repeat(number.length - 4) + number.slice(-4);
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
          <InstallPrompt /> <Typography variant="caption" sx={{ color: 'text.primary' }}>How to Install Stoct as an App</Typography>
        </Grid>

        {/* Conditional rendering based on whether cards exist */}
        {cards.length > 0 ? (
          <>
            {/* Cards List - MUI (shown first when cards exist) */}
            <Fade in timeout={600}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h4" component="h2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Your Cards ({cards.length})
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
                  {cards.map((card) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.id}>
                      <MuiCard 
                        sx={{ 
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                          border: '1px solid',
                          borderColor: 'divider',
                          backdropFilter: 'blur(10px)',
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
                            <Chip 
                              label={card.barcodeType || 'Code 128'} 
                              size="small" 
                              sx={{ 
                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                color: 'primary.main',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            />
                          </Box>
                          
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              mb: 2, 
                              fontFamily: 'monospace',
                              letterSpacing: '1px',
                              color: 'text.primary',
                              fontSize: '0.9rem'
                            }}
                          >
                            {maskNumber(card.number)}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Barcode
                              data={card.number}
                              type={card.barcodeType || 'code128'}
                              width={200}
                              height={60}
                            />
                          </Box>
                        </CardContent>
                        
                        <CardActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => router.push(`/k/${card.id}`)}
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
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => {
                                navigator.clipboard.writeText(card.number);
                                setNotification({
                                  open: true,
                                  message: 'Card number copied to clipboard!',
                                  severity: 'success'
                                });
                              }}
                              startIcon={<CopyIcon />}
                              sx={{ 
                                borderColor: 'success.main',
                                color: 'success.main',
                                minHeight: 44,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                                '&:hover': {
                                  borderColor: 'success.light',
                                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                }
                              }}
                            >
                              Copy
                            </Button>
                            
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => handleDelete(card.id)}
                              startIcon={<DeleteIcon />}
                              sx={{ 
                                borderColor: 'error.main',
                                color: 'error.main',
                                minHeight: 44,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                minWidth: 0,
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
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Fade>

            {/* Beautiful Single-Row Add Card Form (shown second when cards exist) */}
            <Fade in timeout={800}>
              <Paper 
                elevation={0}
                data-form="add-card"
                sx={{ 
                  p: 3, 
                  mb: 4, 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="h5" component="h2" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
                  Add New Card
                </Typography>
                
                <Box component="form" onSubmit={handleSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Main form fields row */}
                    <Grid container spacing={2} alignItems="end">
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Brand"
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., Starbucks"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 6}}>
                        <TextField
                          fullWidth
                          label="Number"
                          name="number"
                          value={formData.number}
                          onChange={handleInputChange}
                          required
                          placeholder="Card number"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="PIN"
                          name="pin"
                          value={formData.pin}
                          onChange={handleInputChange}
                          placeholder="Optional"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl component="fieldset" size="small">
                          <FormLabel component="legend" sx={{ mb: 1, color: 'text.primary', fontSize: '0.875rem' }}>
                            Barcode Type
                          </FormLabel>
                          <RadioGroup
                            row
                            name="barcodeType"
                            value={formData.barcodeType}
                            onChange={(e) => setFormData(prev => ({ ...prev, barcodeType: e.target.value as 'qr' | 'code128' }))}
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
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 12 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isSubmitting || !formData.brand.trim() || !formData.number.trim()}
                          startIcon={<AddIcon />}
                          fullWidth
                          sx={{ 
                            minHeight: 40,
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
                          {isSubmitting ? 'Creating...' : 'Add Card'}
                        </Button>
                      </Grid>
                    </Grid>

                    {/* Scan button on its own row */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
                  </Box>
                  
                  {/* Notes field - expandable */}
                  {(formData.notes || formData.brand || formData.number) && (
                    <Fade in timeout={300}>
                      <Box sx={{ mt: 2 }}>
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
                      </Box>
                    </Fade>
                  )}
                </Box>
              </Paper>
            </Fade>
          </>
        ) : (
          <>
            {/* Beautiful Single-Row Add Card Form (shown first when no cards exist) */}
            <Fade in timeout={600}>
              <Paper 
                elevation={0}
                data-form="add-card"
                sx={{ 
                  p: 3, 
                  mb: 4, 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="h5" component="h2" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
                  Add New Card
                </Typography>
                
                <Box component="form" onSubmit={handleSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Main form fields row */}
                    <Grid container spacing={2} alignItems="end">
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Brand"
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., Starbucks"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Number"
                          name="number"
                          value={formData.number}
                          onChange={handleInputChange}
                          required
                          placeholder="Card number"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="PIN"
                          name="pin"
                          value={formData.pin}
                          onChange={handleInputChange}
                          placeholder="Optional"
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl component="fieldset" size="small">
                            <FormLabel component="legend" sx={{ mb: 1, color: 'text.primary', fontSize: '0.875rem' }}>
                              Barcode Type
                            </FormLabel>
                            <RadioGroup
                              row
                              name="barcodeType"
                              value={formData.barcodeType}
                              onChange={(e) => setFormData(prev => ({ ...prev, barcodeType: e.target.value as 'qr' | 'code128' }))}
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
                        </Grid>
                      
                      <Grid size={{ xs: 12, sm: 12 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isSubmitting || !formData.brand.trim() || !formData.number.trim()}
                          startIcon={<AddIcon />}
                          fullWidth
                          sx={{ 
                            minHeight: 40,
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
                          {isSubmitting ? 'Creating...' : 'Add Card'}
                        </Button>
                      </Grid>
                    </Grid>

                    {/* Scan button on its own row */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
                  </Box>
                  
                  {/* Notes field - expandable */}
                  {(formData.notes || formData.brand || formData.number) && (
                    <Fade in timeout={300}>
                      <Box sx={{ mt: 2 }}>
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
                      </Box>
                    </Fade>
                  )}
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  backdropFilter: 'blur(20px)',
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
          // Refresh the page to reinitialize passcode flow
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