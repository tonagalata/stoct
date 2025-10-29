'use client';

import { useState, useEffect, ReactNode } from 'react';
import { PasscodeSetup } from './PasscodeSetup';
import { PasscodeVerification } from './PasscodeVerification';
import { 
  isPasscodeSetup, 
  shouldShowPasscode, 
  initializeSession, 
  updateSessionActivity,
  endSession 
} from '@/lib/passcode-storage';

interface PasscodeProviderProps {
  children: ReactNode;
}

export function PasscodeProvider({ children }: PasscodeProviderProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializePasscodeFlow = async () => {
      try {
        // Initialize session on app start
        await initializeSession();
        
        // Check if passcode is set up
        const passcodeSetup = isPasscodeSetup();
        
        if (!passcodeSetup) {
          // Show setup if no passcode is configured
          setShowSetup(true);
        } else {
          // Check if we should show verification
          const shouldVerify = shouldShowPasscode();
          setShowVerification(shouldVerify);
        }
      } catch (error) {
        console.error('Passcode initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePasscodeFlow();
  }, []);

  // Update session activity on user interaction
  useEffect(() => {
    const handleUserActivity = () => {
      updateSessionActivity();
    };

    // Listen for user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, end session
        endSession();
      } else {
        // Page is visible again, check if we need verification
        if (isPasscodeSetup() && shouldShowPasscode()) {
          setShowVerification(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  const handleSetupSkip = () => {
    setShowSetup(false);
  };

  const handleVerificationSuccess = () => {
    setShowVerification(false);
  };

  const handleVerificationSkip = () => {
    setShowVerification(false);
  };

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#666', margin: 0 }}>Loading Stoct...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {children}
      
      <PasscodeSetup
        open={showSetup}
        onComplete={handleSetupComplete}
        onSkip={handleSetupSkip}
      />
      
      <PasscodeVerification
        open={showVerification}
        onSuccess={handleVerificationSuccess}
        onSkip={handleVerificationSkip}
      />
    </>
  );
}
