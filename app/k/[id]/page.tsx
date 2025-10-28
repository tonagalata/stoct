'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardInput } from '@/lib/types';
import { getCard, updateCard } from '@/lib/storage';
import { copyToClipboard } from '@/lib/clipboard';
import { Barcode } from '@/lib/barcode';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface CardPageProps {
  params: Promise<{
    id: string;
  }>;
}


export default function CardPage({ params }: CardPageProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [cardId, setCardId] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<CardInput>({
    brand: '',
    number: '',
    pin: '',
    notes: '',
    barcodeType: 'code128',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadCard = async () => {
      try {
        const resolvedParams = await params;
        setCardId(resolvedParams.id);
        
        // Only run on client side to avoid hydration mismatch
        if (typeof window !== 'undefined') {
          const cardData = getCard(resolvedParams.id);
          if (cardData) {
            setCard(cardData);
            // Initialize edit data
            setEditData({
              brand: cardData.brand,
              number: cardData.number,
              pin: cardData.pin || '',
              notes: cardData.notes || '',
              barcodeType: cardData.barcodeType || 'code128',
            });
          }
        }
      } catch (error) {
        console.error('Error loading card:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [params]);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setMessage(`${label} copied to clipboard`);
    } else {
      setMessage(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleScan = (scannedData: string) => {
    // Close the scanner popup
    setShowScanner(false);
    
    // If in edit mode, update the number field
    if (isEditing) {
      setEditData(prev => ({
        ...prev,
        number: scannedData
      }));
      setMessage(`Scanned data added to number field: ${scannedData}`);
    } else {
      // Copy scanned data to clipboard
      copyToClipboard(scannedData).then(success => {
        if (success) {
          setMessage(`Scanned data copied to clipboard: ${scannedData}`);
        } else {
          setMessage('Failed to copy scanned data to clipboard');
        }
      });
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (card) {
      setEditData({
        brand: card.brand,
        number: card.number,
        pin: card.pin || '',
        notes: card.notes || '',
        barcodeType: card.barcodeType || 'code128',
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!card) return;

    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!editData.brand.trim() || !editData.number.trim()) {
        setMessage('Brand and number are required');
        return;
      }

      // Update the card
      const updatedCard: Card = {
        ...card,
        brand: editData.brand,
        number: editData.number,
        pin: editData.pin,
        notes: editData.notes,
        barcodeType: editData.barcodeType,
        updatedAt: Date.now(),
      };
      
      const savedCard = updateCard(updatedCard);
      setCard(savedCard);
      setIsEditing(false);
      setMessage('Card updated successfully');
    } catch (error: any) {
      if (error && error.code === 'DUPLICATE_CARD' && error.existingId) {
        setMessage('Another card with this number exists. Opening it.');
        router.push(`/k/${error.existingId}`);
      } else {
        setMessage('Error updating card');
        console.error('Update error:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div>
        <h1>Loading...</h1>
        <button onClick={() => router.push('/')}>← Back to Home</button>
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <h1>Card not found</h1>
        <p>The requested card could not be found.</p>
        <button onClick={() => router.push('/')}>← Back to Home</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Card Details</h1>
      
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
        />
      )}
      
      {message && (
        <div style={{ padding: '10px', margin: '10px 0', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      {!isEditing ? (
        // View Mode
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>{card.brand}</h2>
            <button onClick={handleEdit} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Edit Card
            </button>
          </div>
        
        <div style={{ margin: '15px 0' }}>
          <strong>Number:</strong>
          <div style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '1.2em' }}>
            {card.number}
          </div>
          <button onClick={() => handleCopy(card.number, 'Number')}>
            Copy Number
          </button>
        </div>

        {card.pin && (
          <div style={{ margin: '15px 0' }}>
            <strong>PIN:</strong>
            <div style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '1.2em' }}>
              {card.pin}
            </div>
            <button onClick={() => handleCopy(card.pin!, 'PIN')}>
              Copy PIN
            </button>
          </div>
        )}

        {card.notes && (
          <div style={{ margin: '15px 0' }}>
            <strong>Notes:</strong>
            <div style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
              {card.notes}
            </div>
            <button onClick={() => handleCopy(card.notes!, 'Notes')}>
              Copy Notes
            </button>
          </div>
        )}

        <div style={{ margin: '15px 0' }}>
          <strong>Barcode:</strong>
          <div style={{ margin: '10px 0' }}>
            <Barcode 
              data={card.number} 
              type={card.barcodeType || 'code128'} 
              size={200}
            />
          </div>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
            Type: {card.barcodeType || 'Code 128'} | Data: {card.number}
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleCopy(card.number, 'Barcode Data')}
                style={{ 
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Copy Data
              </button>
              <button 
                onClick={() => setShowScanner(true)}
                style={{ 
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📷 Scan
              </button>
            </div>
          </div>
        </div>

          <div style={{ margin: '15px 0', fontSize: '0.9em', color: '#666' }}>
            <div><strong>Created:</strong> {formatDate(card.createdAt)}</div>
            <div><strong>Updated:</strong> {formatDate(card.updatedAt)}</div>
            <div><strong>ID:</strong> {card.id}</div>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Edit Card</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSave} disabled={isSubmitting} style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={handleCancelEdit} disabled={isSubmitting} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div style={{ margin: '15px 0' }}>
              <label htmlFor="brand">Brand *</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={editData.brand}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ margin: '15px 0' }}>
              <label htmlFor="number">Number *</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  id="number"
                  name="number"
                  value={editData.number}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📷 Scan
                </button>
              </div>
            </div>

            <div style={{ margin: '15px 0' }}>
              <label htmlFor="pin">PIN</label>
              <input
                type="text"
                id="pin"
                name="pin"
                value={editData.pin}
                onChange={handleInputChange}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ margin: '15px 0' }}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={editData.notes}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>

            <div style={{ margin: '15px 0' }}>
              <label htmlFor="barcodeType">Barcode Type</label>
              <select
                id="barcodeType"
                name="barcodeType"
                value={editData.barcodeType}
                onChange={handleInputChange}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="code128">Code 128</option>
                <option value="qr">QR Code</option>
              </select>
            </div>

            <div style={{ margin: '15px 0', fontSize: '0.9em', color: '#666' }}>
              <div><strong>Created:</strong> {formatDate(card.createdAt)}</div>
              <div><strong>Updated:</strong> {formatDate(card.updatedAt)}</div>
              <div><strong>ID:</strong> {card.id}</div>
            </div>
          </form>
        </div>
      )}

      {/* Shortcut Instructions */}
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        backgroundColor: '#f0f8ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <strong>💡 Create a Shortcut:</strong>
        <div style={{ marginTop: '8px' }}>
          <strong>iPhone/iPad (Safari):</strong> Tap the Share button → "Add to Home Screen"
          <br />
          <strong>Android (Chrome):</strong> Tap the menu (⋮) → "Add to Home screen"
          <br />
          <strong>Desktop:</strong> Bookmark this page in your browser
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        <button onClick={() => router.push('/')}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
