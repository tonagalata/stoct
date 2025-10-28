'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    { icon: '💳', title: 'Card Management', desc: 'Store all your cards in one place' },
    { icon: '📱', title: 'Offline First', desc: 'Works without internet connection' },
    { icon: '🔒', title: 'Privacy Focused', desc: 'Data never leaves your device' },
    { icon: '📷', title: 'Barcode Scanner', desc: 'Scan cards with your camera' },
    { icon: '📤', title: 'Export/Import', desc: 'Backup and restore your data' },
    { icon: '⚡', title: 'Fast & Light', desc: 'Quick access to your cards' }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '100px',
        height: '100px',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '15%',
        width: '60px',
        height: '60px',
        background: 'radial-gradient(circle, rgba(33, 150, 243, 0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '20%',
        width: '80px',
        height: '80px',
        background: 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 7s ease-in-out infinite'
      }} />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Logo with animation */}
      <div style={{
        width: '120px',
        height: '120px',
        background: 'linear-gradient(45deg, #ffffff, #e0e0e0)',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '40px',
        boxShadow: '0 20px 40px rgba(255, 255, 255, 0.1)',
        animation: isVisible ? 'fadeInUp 1s ease-out' : 'none',
        position: 'relative'
      }}>
        <Image src="/logo.png" alt="Stoct Logo" width={70} height={70} />
        <div style={{
          position: 'absolute',
          top: '-5px',
          right: '-5px',
          width: '20px',
          height: '20px',
          background: 'linear-gradient(45deg, #4CAF50, #2196F3)',
          borderRadius: '50%',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
      </div>
      
      {/* Main heading with staggered animation */}
      <h1 style={{
        fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
        fontWeight: '800',
        margin: '0 0 20px 0',
        background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #b0b0b0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: '1.1',
        animation: isVisible ? 'fadeInUp 1s ease-out 0.2s both' : 'none',
        letterSpacing: '-0.02em'
      }}>
        Welcome to Stoct
      </h1>
      
      {/* Subtitle with animation */}
      <p style={{
        fontSize: '1.3rem',
        color: '#b0b0b0',
        margin: '0 0 50px 0',
        maxWidth: '700px',
        lineHeight: '1.6',
        animation: isVisible ? 'fadeInUp 1s ease-out 0.4s both' : 'none',
        fontWeight: '300'
      }}>
        Your private, on-device card manager. Store loyalty cards, membership details, and more, all offline and secure.
      </p>

      {/* Feature showcase */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '50px',
        maxWidth: '800px',
        animation: isVisible ? 'fadeInUp 1s ease-out 0.6s both' : 'none'
      }}>
        {features.map((feature, index) => (
          <div
            key={index}
            style={{
              background: currentFeature === index 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(255, 255, 255, 0.05)',
              border: currentFeature === index 
                ? '1px solid rgba(255, 255, 255, 0.2)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '15px 20px',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              transform: currentFeature === index ? 'scale(1.05)' : 'scale(1)',
              backdropFilter: 'blur(10px)',
              minWidth: '120px'
            }}
          >
            <div style={{
              fontSize: '1.5rem',
              marginBottom: '8px'
            }}>
              {feature.icon}
            </div>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '4px'
            }}>
              {feature.title}
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#b0b0b0'
            }}>
              {feature.desc}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button with enhanced animation */}
      <button
        onClick={onGetStarted}
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
          color: '#000000',
          border: 'none',
          padding: '18px 40px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '1.3rem',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: isVisible ? 'fadeInUp 1s ease-out 0.8s both' : 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 15px 40px rgba(255, 255, 255, 0.3)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 255, 255, 0.2)';
        }}
      >
        <span>Get Started</span>
        <span style={{ 
          fontSize: '1.5rem',
          transition: 'transform 0.3s ease'
        }}>
          →
        </span>
      </button>

      {/* Privacy note with animation */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        fontSize: '0.9rem',
        color: '#808080',
        animation: isVisible ? 'fadeInUp 1s ease-out 1s both' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🔒</span>
        <span>Your data stays on your device. Always.</span>
      </div>
    </div>
  );
};