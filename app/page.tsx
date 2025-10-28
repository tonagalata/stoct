'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardInput } from '@/lib/types';
import { getAllCards, createCard, removeCard, exportAllCards, importAllCards } from '@/lib/storage';
import { copyToClipboard } from '@/lib/clipboard';
import { Barcode } from '@/lib/barcode';
import { InstallPrompt } from '@/components/InstallPrompt';
import { BarcodeScanner } from '@/components/BarcodeScanner';

export default function HomePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [formData, setFormData] = useState<CardInput>({
    brand: '',
    number: '',
    pin: '',
    notes: '',
    barcodeType: 'code128',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const router = useRouter();

  // Load cards on component mount
  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      setCards(getAllCards());
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // Basic validation
      if (!formData.brand.trim() || !formData.number.trim()) {
        setMessage('Brand and number are required');
        return;
      }

      const newCard = createCard(formData);
      setCards(prev => [...prev, newCard]);
      
      // Reset form
      setFormData({
        brand: '',
        number: '',
        pin: '',
        notes: '',
        barcodeType: 'code128',
      });

      // Navigate to the new card
      router.push(`/k/${newCard.id}`);
    } catch (error: any) {
      if (error && error.code === 'DUPLICATE_CARD' && error.existingId) {
        setMessage('Card already exists. Opening it.');
        router.push(`/k/${error.existingId}`);
      } else {
        setMessage('Error creating card');
        console.error('Error creating card:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = (id: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      const success = removeCard(id);
      if (success) {
        setCards(prev => prev.filter(card => card.id !== id));
        setMessage('Card deleted');
      } else {
        setMessage('Error deleting card');
      }
    }
  };

  const handleCopyNumber = async (number: string) => {
    const success = await copyToClipboard(number);
    if (success) {
      setMessage('Number copied to clipboard');
    } else {
      setMessage('Failed to copy to clipboard');
    }
  };

  const handleExport = () => {
    try {
      const exportData = exportAllCards();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shortkut-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('Cards exported successfully');
    } catch (error) {
      setMessage('Error exporting cards');
      console.error('Export error:', error);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = event.target?.result as string;
        const result = importAllCards(jsonData);
        
        if (result.success) {
          setCards(getAllCards());
          setMessage(`Successfully imported ${result.count} cards`);
        } else {
          setMessage(`Import failed: ${result.error}`);
        }
      } catch (error) {
        setMessage('Error reading import file');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };

  const handleScan = (scannedData: string) => {
    // Close the scanner popup
    setShowScanner(false);
    
    // Try to parse the scanned data and create a card automatically
    try {
      let brand = '';
      let notes = '';
      
      // If it's a URL, try to extract useful information
      if (scannedData.startsWith('http')) {
        const url = new URL(scannedData);
        const hostname = url.hostname;

        // Extract brand from URL (e.g., "www.visa.com" -> "Visa")
        brand = hostname
          .replace('www.', '')
          .split('.')[0]
          .charAt(0).toUpperCase() + hostname
          .replace('www.', '')
          .split('.')[0]
          .slice(1);
        
        notes = `Scanned from: ${scannedData}`;
      } else {
        // For other data, try to extract brand from common patterns
        const lowerData = scannedData.toLowerCase();
        if (lowerData.includes('visa')) brand = 'Visa';
        else if (lowerData.includes('mastercard') || lowerData.includes('master')) brand = 'Mastercard';
        else if (lowerData.includes('amex') || lowerData.includes('american express')) brand = 'American Express';
        else if (lowerData.includes('discover')) brand = 'Discover';
        else brand = 'Scanned Card';
        
        notes = 'Scanned barcode/QR code';
      }

      // Create the card automatically
      const cardData: CardInput = {
        brand: brand,
        number: scannedData,
        pin: '',
        notes: notes,
        barcodeType: 'code128',
      };

      const newCard = createCard(cardData);
      setCards(prev => [...prev, newCard]);
      
      // Navigate to the new card page
      router.push(`/k/${newCard.id}`);
      
      setMessage(`Card created successfully from scanned data: ${scannedData}`);
    } catch (error: any) {
      if (error && error.code === 'DUPLICATE_CARD' && error.existingId) {
        setMessage('Card already exists. Opening it.');
        router.push(`/k/${error.existingId}`);
      } else {
        // Fallback: create a basic card with the raw data
        try {
          const cardData: CardInput = {
            brand: 'Scanned Card',
            number: scannedData,
            pin: '',
            notes: 'Scanned barcode/QR code',
            barcodeType: 'code128',
          };

          const newCard = createCard(cardData);
          setCards(prev => [...prev, newCard]);
          router.push(`/k/${newCard.id}`);
          setMessage(`Card created from scanned data: ${scannedData}`);
        } catch (inner: any) {
          if (inner && inner.code === 'DUPLICATE_CARD' && inner.existingId) {
            setMessage('Card already exists. Opening it.');
            router.push(`/k/${inner.existingId}`);
          } else {
            setMessage('Failed to create card from scanned data');
            console.error('Scan create error:', inner);
          }
        }
      }
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const maskNumber = (number: string): string => {
    if (number.length <= 4) return number;
    return '*'.repeat(number.length - 4) + number.slice(-4);
  };

  return (
    <div>
      <h1>shortKut - Card Manager</h1>
      <InstallPrompt />
      
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

      {/* New Card Form */}
      <form onSubmit={handleSubmit}>
        <h2>New Card</h2>
        <div>
          <label htmlFor="brand">Brand *</label>
          <input
            type="text"
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="number">Number *</label>
          <input
            type="text"
            id="number"
            name="number"
            value={formData.number}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="pin">PIN</label>
          <input
            type="text"
            id="pin"
            name="pin"
            value={formData.pin}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            disabled={isSubmitting}
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="barcodeType">Barcode Type</label>
          <select
            id="barcodeType"
            name="barcodeType"
            value={formData.barcodeType}
            onChange={handleInputChange}
            disabled={isSubmitting}
          >
            <option value="code128">Code 128</option>
            <option value="qr">QR Code</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Card'}
          </button>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📷 Scan Barcode/QR
          </button>
        </div>
      </form>

      {/* PWA Installation Instructions */}
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        backgroundColor: '#f0f8ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <strong>📱 Install as App:</strong>
        <div style={{ marginTop: '8px' }}>
          <strong>Desktop (Chrome/Edge):</strong> Look for the install icon (⊕) in the address bar
          <br />
          <strong>iPhone/iPad (Safari):</strong> Tap Share → "Add to Home Screen"
          <br />
          <strong>Android (Chrome):</strong> Tap menu (⋮) → "Add to Home screen"
          <br />
          <strong>Manual Install:</strong> Use the install prompt below if available
        </div>
      </div>

      {/* Export/Import Section */}
      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Backup & Restore</h2>
        <button onClick={handleExport}>Export All Cards</button>
        <div style={{ marginTop: '10px' }}>
          <label htmlFor="import-file">Import Cards:</label>
          <input
            type="file"
            id="import-file"
            accept=".json"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Cards List */}
      <div>
        <h2>Your Cards ({cards.length})</h2>
        {cards.length === 0 ? (
          <p>No cards yet. Create your first card above!</p>
        ) : (
          <div>
            {cards.map((card) => (
              <div key={card.id} className="card">
                <div>
                  <strong>{card.brand}</strong> - {maskNumber(card.number)}
                </div>
                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                  ID: {card.id} | Barcode: {card.barcodeType || 'Code 128'}
                </div>
                <div style={{ margin: '10px 0', textAlign: 'center' }}>
                  <Barcode 
                    data={card.number} 
                    type={card.barcodeType || 'code128'} 
                    size={120}
                  />
                </div>
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => router.push(`/k/${card.id}`)}>
                    Open
                  </button>
                  <button onClick={() => handleCopyNumber(card.number)}>
                    Copy Number
                  </button>
                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    style={{ backgroundColor: '#ff4444', color: 'white' }}
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
  );
}