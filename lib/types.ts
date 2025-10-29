export type CardType = 'loyalty' | 'credit' | 'otp';

export interface BaseCard {
  id: string;
  type: CardType;
  brand: string;
  createdAt: number;
  updatedAt: number;
}

export interface LoyaltyCard extends BaseCard {
  type: 'loyalty';
  number: string;
  pin?: string;
  notes?: string;
  barcodeType?: 'qr' | 'code128';
}

export interface CreditCard extends BaseCard {
  type: 'credit';
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv?: string;
  cardholderName?: string;
  notes?: string;
}

export interface OneTimePassword extends BaseCard {
  type: 'otp';
  password: string;
  description: string;
  expiresAt: number;
  isUsed: boolean;
  notes?: string;
}

export type Card = LoyaltyCard | CreditCard | OneTimePassword;

export interface LoyaltyCardInput {
  type: 'loyalty';
  brand: string;
  number: string;
  pin?: string;
  notes?: string;
  barcodeType?: 'qr' | 'code128';
}

export interface CreditCardInput {
  type: 'credit';
  brand: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv?: string;
  cardholderName?: string;
  notes?: string;
}

export interface OneTimePasswordInput {
  type: 'otp';
  brand: string;
  password: string;
  description: string;
  expiresInHours: number;
  notes?: string;
}

export type CardInput = LoyaltyCardInput | CreditCardInput | OneTimePasswordInput;

export type ExportData = {
  version: number;
  cards: Card[];
};
