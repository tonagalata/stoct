import { Card, CardInput, ExportData } from './types';
import { generateId } from './ids';

const INDEX_KEY = 'shortkut:index';
const CARD_KEY_PREFIX = 'shortkut:card:';

// Helper to safely parse JSON from localStorage
const safeJsonParse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

// Helper to safely stringify JSON for localStorage
const safeJsonStringify = (value: any): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
};

// Get all card IDs from the index
const getCardIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  const index = localStorage.getItem(INDEX_KEY);
  return safeJsonParse(index, []);
};

// Save all card IDs to the index
const saveCardIds = (ids: string[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INDEX_KEY, safeJsonStringify(ids));
};

// Get a single card by ID
const getCardById = (id: string): Card | null => {
  if (typeof window === 'undefined') return null;
  const cardJson = localStorage.getItem(`${CARD_KEY_PREFIX}${id}`);
  return safeJsonParse(cardJson, null);
};

// Save a single card
const saveCard = (card: Card): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${CARD_KEY_PREFIX}${card.id}`, safeJsonStringify(card));
};

// Remove a single card from storage
const removeCardFromStorage = (id: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${CARD_KEY_PREFIX}${id}`);
};

export const getAllCards = (): Card[] => {
  const ids = getCardIds();
  return ids.map(id => getCardById(id)).filter((card): card is Card => card !== null);
};

export const getCard = (id: string): Card | null => {
  return getCardById(id);
};

// Find a card by exact number match (after trimming)
export const findCardByNumber = (number: string): Card | null => {
  const normalized = number.trim();
  if (!normalized) return null;
  const cards = getAllCards();
  const found = cards.find(c => (c.number || '').trim() === normalized);
  return found || null;
};

export const createCard = (cardInput: CardInput): Card => {
  // Enforce uniqueness by number
  const existing = findCardByNumber(cardInput.number);
  if (existing) {
    const err: any = new Error('Duplicate card number');
    err.code = 'DUPLICATE_CARD';
    err.existingId = existing.id;
    throw err;
  }

  const now = Date.now();
  const card: Card = {
    ...cardInput,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  
  saveCard(card);
  
  // Add to index
  const ids = getCardIds();
  ids.push(card.id);
  saveCardIds(ids);
  
  return card;
};

export const updateCard = (card: Card): Card => {
  // Enforce uniqueness by number, excluding this card's id
  const existing = findCardByNumber(card.number);
  if (existing && existing.id !== card.id) {
    const err: any = new Error('Duplicate card number');
    err.code = 'DUPLICATE_CARD';
    err.existingId = existing.id;
    throw err;
  }

  const updatedCard = {
    ...card,
    updatedAt: Date.now(),
  };
  
  saveCard(updatedCard);
  return updatedCard;
};

export const removeCard = (id: string): boolean => {
  const card = getCardById(id);
  if (!card) return false;
  
  removeCardFromStorage(id);
  
  // Remove from index
  const ids = getCardIds();
  const filteredIds = ids.filter(cardId => cardId !== id);
  saveCardIds(filteredIds);
  
  return true;
};

export const exportAllCards = (): string => {
  const cards = getAllCards();
  const exportData: ExportData = {
    version: 1,
    cards,
  };
  return safeJsonStringify(exportData);
};

export const importAllCards = (jsonData: string): { success: boolean; count: number; error?: string } => {
  try {
    const data = JSON.parse(jsonData) as ExportData;
    
    // Basic validation
    if (!data || typeof data !== 'object') {
      return { success: false, count: 0, error: 'Invalid JSON format' };
    }
    
    if (!Array.isArray(data.cards)) {
      return { success: false, count: 0, error: 'Invalid cards array' };
    }
    
    // Validate each card has required fields
    for (const card of data.cards) {
      if (!card.id || !card.brand || !card.number) {
        return { success: false, count: 0, error: 'Invalid card data: missing required fields' };
      }
    }
    
    // Clear existing data
    const ids = getCardIds();
    ids.forEach(id => removeCardFromStorage(id));
    saveCardIds([]);
    
    // Import new cards
    const newIds: string[] = [];
    data.cards.forEach(card => {
      saveCard(card);
      newIds.push(card.id);
    });
    saveCardIds(newIds);
    
    return { success: true, count: data.cards.length };
  } catch (error) {
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
