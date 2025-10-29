'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Typography, 
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Info as InfoIcon, 
  Close as CloseIcon,
  PhoneAndroid as PhoneIcon,
  Speed as SpeedIcon,
  CloudOff as OfflineIcon,
  Home as HomeIcon
} from '@mui/icons-material';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  showInfoIcon?: boolean;
  forceShowDialog?: boolean;
  onClose?: () => void;
}

// Global variable to store the deferred prompt across component instances
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function InstallPrompt({ showInfoIcon = true, forceShowDialog = false, onClose }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    // Check if there's already a deferred prompt
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    } finally {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    globalDeferredPrompt = null;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleInfoClick = () => {
    setShowInfoDialog(true);
  };

  const handleInfoClose = () => {
    setShowInfoDialog(false);
    if (onClose) {
      onClose();
    }
  };

  // Handle forceShowDialog prop
  useEffect(() => {
    if (forceShowDialog) {
      setShowInfoDialog(true);
    }
  }, [forceShowDialog]);

  // If forceShowDialog is true, only show the dialog
  if (forceShowDialog) {
    return (
      <Dialog
        open={showInfoDialog}
        onClose={handleInfoClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: '#ffffff',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Install Stoct as an App
            </Typography>
          </Box>
          <IconButton onClick={handleInfoClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
            Transform Stoct into a native-like app experience! Installing Stoct as a Progressive Web App gives you:
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <SpeedIcon sx={{ color: 'success.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Lightning-fast performance"
                secondary="Instant loading from your home screen"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <OfflineIcon sx={{ color: 'info.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Works offline"
                secondary="Access your cards even without internet connection"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <HomeIcon sx={{ color: 'warning.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Native app experience"
                secondary="Full-screen app without browser interface"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
          </List>
          
          <Typography variant="body2" sx={{ mt: 2, p: 2, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2, color: 'text.primary' }}>
            💡 <strong>How to install:</strong> Look for "Add to Home Screen" in your browser's menu, or wait for the install prompt to appear.
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
          <Button 
            onClick={handleInfoClose} 
            variant="contained"
            sx={{ minWidth: 100 }}
          >
            Got it!
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Don't show if already installed
  if (isInstalled) {
    return (
      <>
        <IconButton
          onClick={handleInfoClick}
          size="small"
          sx={{
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
            }
          }}
        >
          <InfoIcon />
        </IconButton>
        
        <Dialog
          open={showInfoDialog}
          onClose={handleInfoClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                App Already Installed! 🎉
              </Typography>
            </Box>
            <IconButton onClick={handleInfoClose} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
              Great! Stoct is already installed as a Progressive Web App on your device.
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
              Benefits you're enjoying:
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <SpeedIcon sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Faster loading times"
                  secondary="App loads instantly from your home screen"
                  primaryTypographyProps={{ color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <OfflineIcon sx={{ color: 'info.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Works offline"
                  secondary="Access your cards even without internet"
                  primaryTypographyProps={{ color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <HomeIcon sx={{ color: 'warning.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Native app experience"
                  secondary="Full-screen app without browser UI"
                  primaryTypographyProps={{ color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
            </List>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={handleInfoClose} 
              variant="contained"
              sx={{ minWidth: 100 }}
            >
              Got it!
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Don't show if no install prompt available
  if (!showInstallPrompt && !deferredPrompt) {
    return (
      <>
        {showInfoIcon && (
          <IconButton
            onClick={handleInfoClick}
            size="small"
            sx={{
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
              }
            }}
          >
            <InfoIcon />
          </IconButton>
        )}
        
        <Dialog
          open={showInfoDialog}
          onClose={handleInfoClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                About Installing Stoct
              </Typography>
            </Box>
            <IconButton onClick={handleInfoClose} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
              Stoct is a Progressive Web App (PWA) that can be installed on your device for a better experience.
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
              Benefits of installing:
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <SpeedIcon sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Faster loading"
                  secondary="Instant access from your home screen"
                  primaryTypographyProps={{ color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <OfflineIcon sx={{ color: 'info.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Offline access"
                  secondary="View your cards even without internet"
                  primaryTypographyProps={{ color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <HomeIcon sx={{ color: 'warning.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="App-like experience"
                  secondary="Full-screen without browser interface"
                  primaryTypographyProps={{ color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
            </List>
            
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontStyle: 'italic' }}>
              Note: Installation option will appear automatically when your browser supports it. 
              You can also manually add to home screen from your browser's menu.
            </Typography>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={handleInfoClose} 
              variant="contained"
              sx={{ minWidth: 100 }}
            >
              Got it!
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          onClick={handleInstallClick}
          variant="contained"
          size="small"
          sx={{
            backgroundColor: 'success.main',
            '&:hover': {
              backgroundColor: 'success.dark',
            }
          }}
        >
          Install App
        </Button>
        
        <IconButton
          onClick={handleInfoClick}
          size="small"
          sx={{
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
            }
          }}
        >
          <InfoIcon />
        </IconButton>
        
        <IconButton
          onClick={handleDismiss}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Dialog
        open={showInfoDialog}
        onClose={handleInfoClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            backdropFilter: 'blur(20px)',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Install Stoct as an App
            </Typography>
          </Box>
          <IconButton onClick={handleInfoClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
            Transform Stoct into a native-like app experience! Installing Stoct as a Progressive Web App gives you:
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <SpeedIcon sx={{ color: 'success.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Lightning-fast performance"
                secondary="Instant loading from your home screen"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <OfflineIcon sx={{ color: 'info.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Works offline"
                secondary="Access your cards even without internet connection"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <HomeIcon sx={{ color: 'warning.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Native app experience"
                secondary="Full-screen app without browser interface"
                primaryTypographyProps={{ color: 'text.primary' }}
                secondaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
          </List>
          
          <Typography variant="body2" sx={{ mt: 2, p: 2, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2, color: 'text.primary' }}>
            💡 <strong>How to install:</strong> Click the "Install App" button above, or look for "Add to Home Screen" in your browser's menu.
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
          <Button 
            onClick={handleInfoClose} 
            variant="outlined"
            sx={{ minWidth: 80 }}
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              handleInfoClose();
              handleInstallClick();
            }}
            variant="contained"
            sx={{ 
              minWidth: 120,
              backgroundColor: 'success.main',
              '&:hover': {
                backgroundColor: 'success.dark',
              }
            }}
          >
            Install Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
