'use client';

// Credit card issuer patterns
const CARD_PATTERNS = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12}$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  diners: /^3[0689][0-9]{12}$/,
  jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
  unionpay: /^(62|88)[0-9]{14,17}$/,
  maestro: /^(5[0678]|6[0-9])[0-9]{11,18}$/,
  mir: /^220[0-4][0-9]{12}$/
};

export interface CardIssuer {
  name: string;
  icon: string;
  color: string;
}

export const CARD_ISSUERS: Record<string, CardIssuer> = {
  visa: {
    name: 'Visa',
    icon: '💳',
    color: '#1A1F71'
  },
  mastercard: {
    name: 'Mastercard',
    icon: '💳',
    color: '#EB001B'
  },
  amex: {
    name: 'American Express',
    icon: '💳',
    color: '#006FCF'
  },
  discover: {
    name: 'Discover',
    color: '#FF6000',
    icon: '💳'
  },
  diners: {
    name: 'Diners Club',
    icon: '💳',
    color: '#0079BE'
  },
  jcb: {
    name: 'JCB',
    icon: '💳',
    color: '#007B49'
  },
  unionpay: {
    name: 'UnionPay',
    icon: '💳',
    color: '#E21836'
  },
  maestro: {
    name: 'Maestro',
    icon: '💳',
    color: '#0066CC'
  },
  mir: {
    name: 'Mir',
    icon: '💳',
    color: '#00A651'
  },
  unknown: {
    name: 'Unknown',
    icon: '💳',
    color: '#666666'
  }
};

/**
 * Luhn algorithm to validate credit card numbers
 */
export function luhnCheck(cardNumber: string): boolean {
  // Remove all non-digit characters
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  // Process digits from right to left
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Detect credit card issuer based on number pattern
 */
export function detectCardIssuer(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  for (const [issuer, pattern] of Object.entries(CARD_PATTERNS)) {
    if (pattern.test(cleanNumber)) {
      return issuer;
    }
  }
  
  return 'unknown';
}

/**
 * Format credit card number with spaces
 */
export function formatCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const issuer = detectCardIssuer(cleanNumber);
  
  // Different formatting based on issuer
  if (issuer === 'amex') {
    // American Express: XXXX XXXXXX XXXXX
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  } else if (issuer === 'diners') {
    // Diners Club: XXXX XXXXXX XXXX
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
  } else {
    // Visa, Mastercard, Discover, etc.: XXXX XXXX XXXX XXXX
    return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
}

/**
 * Get card issuer information
 */
export function getCardIssuer(cardNumber: string): CardIssuer {
  const issuer = detectCardIssuer(cardNumber);
  return CARD_ISSUERS[issuer] || CARD_ISSUERS.unknown;
}

/**
 * Validate credit card number (Luhn + length check)
 */
export function validateCardNumber(cardNumber: string): {
  isValid: boolean;
  issuer: CardIssuer;
  formatted: string;
  error?: string;
} {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const issuer = getCardIssuer(cardNumber);
  const formatted = formatCardNumber(cardNumber);
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return {
      isValid: false,
      issuer,
      formatted,
      error: 'Card number must be between 13 and 19 digits'
    };
  }
  
  if (!luhnCheck(cleanNumber)) {
    return {
      isValid: false,
      issuer,
      formatted,
      error: 'Invalid card number (Luhn check failed)'
    };
  }
  
  return {
    isValid: true,
    issuer,
    formatted
  };
}

/**
 * Mask credit card number for display
 */
export function maskCardNumber(cardNumber: string, visibleDigits: number = 4): string {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (cleanNumber.length <= visibleDigits) {
    return cleanNumber;
  }
  
  const masked = '*'.repeat(cleanNumber.length - visibleDigits);
  const lastDigits = cleanNumber.slice(-visibleDigits);
  const formatted = formatCardNumber(masked + lastDigits);
  
  return formatted;
}
