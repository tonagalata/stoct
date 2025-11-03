/**
 * Industry-standard password validation for cloud sync and recovery
 * Requirements: 8+ chars, uppercase, lowercase, numbers, symbols
 */

export interface PasswordValidation {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

export interface PasswordRequirement {
  met: boolean;
  description: string;
}

export interface PasswordStrength {
  requirements: {
    length: PasswordRequirement;
    uppercase: PasswordRequirement;
    lowercase: PasswordRequirement;
    numbers: PasswordRequirement;
    symbols: PasswordRequirement;
  };
  overall: PasswordValidation;
}

const REQUIRED_LENGTH = 8;
const RECOMMENDED_LENGTH = 12;

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length requirement
  const hasMinLength = password.length >= REQUIRED_LENGTH;
  const lengthRequirement: PasswordRequirement = {
    met: hasMinLength,
    description: `At least ${REQUIRED_LENGTH} characters`
  };
  
  if (!hasMinLength) {
    errors.push(`Password must be at least ${REQUIRED_LENGTH} characters long`);
  } else {
    score += 20;
    if (password.length >= RECOMMENDED_LENGTH) {
      score += 10;
    } else {
      suggestions.push(`Consider using ${RECOMMENDED_LENGTH}+ characters for better security`);
    }
  }

  // Uppercase requirement
  const hasUppercase = /[A-Z]/.test(password);
  const uppercaseRequirement: PasswordRequirement = {
    met: hasUppercase,
    description: 'At least one uppercase letter (A-Z)'
  };
  
  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 20;
  }

  // Lowercase requirement
  const hasLowercase = /[a-z]/.test(password);
  const lowercaseRequirement: PasswordRequirement = {
    met: hasLowercase,
    description: 'At least one lowercase letter (a-z)'
  };
  
  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 20;
  }

  // Numbers requirement
  const hasNumbers = /[0-9]/.test(password);
  const numbersRequirement: PasswordRequirement = {
    met: hasNumbers,
    description: 'At least one number (0-9)'
  };
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  } else {
    score += 20;
  }

  // Symbols requirement
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const symbolsRequirement: PasswordRequirement = {
    met: hasSymbols,
    description: 'At least one symbol (!@#$%^&* etc.)'
  };
  
  if (!hasSymbols) {
    errors.push('Password must contain at least one symbol (!@#$%^&* etc.)');
  } else {
    score += 20;
  }

  // Additional security checks
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /123456|654321|abcdef|qwerty|password|admin/i, // Common sequences
    /^[a-zA-Z]+$/, // Only letters
    /^[0-9]+$/, // Only numbers
  ];

  let hasWeakPatterns = false;
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      hasWeakPatterns = true;
      break;
    }
  }

  if (hasWeakPatterns) {
    score = Math.max(0, score - 15);
    suggestions.push('Avoid common patterns, repeated characters, or dictionary words');
  }

  // Bonus points for variety
  const uniqueChars = new Set(password).size;
  const varietyBonus = Math.min(10, Math.floor(uniqueChars / 2));
  score += varietyBonus;

  // Final score adjustment
  score = Math.min(100, Math.max(0, score));

  const isValid = errors.length === 0;

  // Add suggestions based on score
  if (score < 60) {
    suggestions.push('Consider making your password longer and more complex');
  } else if (score < 80) {
    suggestions.push('Good password! Consider adding more variety for maximum security');
  }

  return {
    requirements: {
      length: lengthRequirement,
      uppercase: uppercaseRequirement,
      lowercase: lowercaseRequirement,
      numbers: numbersRequirement,
      symbols: symbolsRequirement,
    },
    overall: {
      isValid,
      score,
      errors,
      suggestions,
    },
  };
}

export function getPasswordStrengthLabel(score: number): { label: string; color: string } {
  if (score < 30) return { label: 'Very Weak', color: '#f44336' };
  if (score < 50) return { label: 'Weak', color: '#ff9800' };
  if (score < 70) return { label: 'Fair', color: '#ffeb3b' };
  if (score < 85) return { label: 'Good', color: '#8bc34a' };
  return { label: 'Strong', color: '#4caf50' };
}

export function generateStrongPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each required category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
