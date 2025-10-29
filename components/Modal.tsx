'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style jsx>{`
        /* Mobile Responsive Modal Styles */
        @media (max-width: 768px) {
          .modal-content {
            max-width: 95vw !important;
            margin: 0 !important;
            border-radius: 12px !important;
          }
          
          .modal-footer {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          
          .modal-close-btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }
        
        @media (max-width: 480px) {
          .modal-content {
            max-width: 98vw !important;
            border-radius: 8px !important;
          }
        }
        
        /* Ensure modal content doesn't overflow */
        .modal-content {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}
      >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.12)',
          backgroundColor: 'background.paper',
          color: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '20px 20px 0 20px' }}>
          {title ? (
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {title}
            </h2>
          ) : null}
        </div>
        <div style={{ 
          padding: '20px',
          flex: '1',
          overflow: 'auto'
        }}>
          {children}
        </div>
        <div className="modal-footer" style={{ 
          padding: '0 20px 20px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onClose}
            className="modal-close-btn"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              minHeight: '44px', // Touch-friendly
              minWidth: '80px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>
  );
}


