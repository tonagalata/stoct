'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/lib/types';
import { getAllCards, createCard, removeCard, exportAllCards, importAllCards } from '@/lib/storage';
import { Barcode } from '@/lib/barcode';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { InstallPrompt } from '@/components/InstallPrompt';
import { LandingPage } from '@/components/LandingPage';

export default function HomePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    number: '',
    pin: '',
    notes: '',
    barcodeType: 'code128' as 'qr' | 'code128'
  });

  const router = useRouter();

  // Check for first visit and load cards
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasVisited = localStorage.getItem('stoct-has-visited');
      if (hasVisited) {
        setIsFirstVisit(false);
        setShowLanding(false);
      }
      
      setCards(getAllCards());
    }
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem('stoct-has-visited', 'true');
    setShowLanding(false);
    setIsFirstVisit(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      
      router.push(`/k/${newCard.id}`);
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CARD') {
        router.push(`/k/${error.existingId}`);
      } else {
        alert('Error creating card: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    
    // Try to extract brand from URL or common patterns
    let brand = '';
    let notes = '';
    
    if (data.startsWith('http')) {
      try {
        const url = new URL(data);
        brand = url.hostname.replace('www.', '').split('.')[0];
        notes = `Scanned from: ${data}`;
      } catch {
        brand = 'Scanned Card';
        notes = data;
      }
    } else if (data.includes('@')) {
      brand = 'Email Card';
      notes = data;
    } else {
      brand = 'Scanned Card';
      notes = data;
    }

    try {
      const newCard = createCard({
        brand: brand,
        number: data,
        notes: notes,
        barcodeType: 'code128'
      });
      
      setCards(getAllCards());
      router.push(`/k/${newCard.id}`);
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CARD') {
        router.push(`/k/${error.existingId}`);
      } else {
        alert('Error creating card: ' + error.message);
      }
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      removeCard(id);
      setCards(getAllCards());
    }
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

  // Show landing page for first-time visitors (only on client to prevent hydration mismatch)
  if (typeof window !== 'undefined' && showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div className="container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '40px',
          padding: '20px 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Image src="/logo.png" alt="Stoct Logo" width={50} height={50} style={{ borderRadius: '12px' }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              margin: '0',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Stoct
            </h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('stoct-has-visited');
              setShowLanding(true);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            Show Landing
          </button>
        </div>

        {/* PWA Install Prompt */}
        <InstallPrompt />

        {/* New Card Form */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '40px',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: '0 0 20px 0',
            color: '#ffffff'
          }}>
            Add New Card
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                  Brand *
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="e.g., Starbucks, Library Card"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                  Number *
                </label>
                <input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Card number or ID"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                  PIN (Optional)
                </label>
                <input
                  type="text"
                  name="pin"
                  value={formData.pin}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="PIN or password"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                  Barcode Type
                </label>
                <select
                  name="barcodeType"
                  value={formData.barcodeType}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  <option value="code128">Code 128</option>
                  <option value="qr">QR Code</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#e0e0e0' }}>
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="Additional notes or details"
              />
            </div>

            <div className="stack-sm" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={isSubmitting || !formData.brand.trim() || !formData.number.trim()}
                style={{
                  background: isSubmitting || !formData.brand.trim() || !formData.number.trim() 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                  color: isSubmitting || !formData.brand.trim() || !formData.number.trim() 
                    ? 'rgba(255, 255, 255, 0.5)' 
                    : '#000000',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: isSubmitting || !formData.brand.trim() || !formData.number.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  flex: '1'
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Card'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                disabled={isSubmitting}
                style={{
                  background: 'rgba(33, 150, 243, 0.2)',
                  color: '#2196F3',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📷 Scan Barcode/QR
              </button>
            </div>
          </form>
        </div>

        {/* PWA Installation Instructions */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '40px'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            margin: '0 0 15px 0',
            color: '#4CAF50',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            📱 Install as App
          </h3>
          <p style={{
            margin: '0 0 15px 0',
            color: '#e0e0e0',
            lineHeight: '1.5'
          }}>
            Add Stoct to your home screen for a faster, app-like experience:
          </p>
          <ul style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#e0e0e0',
            lineHeight: '1.6'
          }}>
            <li><strong>iPhone/iPad:</strong> Tap Share → "Add to Home Screen"</li>
            <li><strong>Android:</strong> Tap menu (⋮) → "Add to Home screen"</li>
            <li><strong>Desktop:</strong> Look for install icon in address bar</li>
          </ul>
        </div>

        {/* Export/Import */}
        <div className="stack-sm" style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '40px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleExport}
            style={{
              background: 'rgba(33, 150, 243, 0.2)',
              color: '#2196F3',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📤 Export All Cards
          </button>
          
          <label style={{
            background: 'rgba(76, 175, 80, 0.2)',
            color: '#4CAF50',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📥 Import Cards
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Cards List */}
        <div>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '600',
            margin: '0 0 20px 0',
            color: '#ffffff'
          }}>
            Your Cards ({cards.length})
          </h2>
          
          {cards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#b0b0b0'
            }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: '20px'
              }}>
                💳
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                margin: '0 0 10px 0',
                color: '#e0e0e0'
              }}>
                No cards yet
              </h3>
              <p style={{
                margin: '0',
                fontSize: '1rem'
              }}>
                Create your first card above or scan a barcode to get started
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {cards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '20px',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '15px'
                  }}>
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      margin: '0',
                      color: '#ffffff'
                    }}>
                      {card.brand}
                    </h3>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#b0b0b0',
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      {card.barcodeType || 'Code 128'}
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '1rem',
                    color: '#e0e0e0',
                    marginBottom: '15px',
                    fontFamily: 'monospace',
                    letterSpacing: '1px'
                  }}>
                    {maskNumber(card.number)}
                  </div>
                  
                  <div style={{
                    marginBottom: '15px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <Barcode
                      data={card.number}
                      type={card.barcodeType || 'code128'}
                      width={200}
                      height={60}
                    />
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '10px'
                  }}>
                    <button
                      onClick={() => router.push(`/k/${card.id}`)}
                      style={{
                        background: 'rgba(33, 150, 243, 0.2)',
                        color: '#2196F3',
                        border: '1px solid rgba(33, 150, 243, 0.3)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        flex: '1'
                      }}
                    >
                      Open
                    </button>
                    
                    <button
                      onClick={() => navigator.clipboard.writeText(card.number)}
                      style={{
                        background: 'rgba(76, 175, 80, 0.2)',
                        color: '#4CAF50',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Copy
                    </button>
                    
                    <button
                      onClick={() => handleDelete(card.id)}
                      style={{
                        background: 'rgba(244, 67, 54, 0.2)',
                        color: '#F44336',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
        />
      )}
    </div>
  );
}