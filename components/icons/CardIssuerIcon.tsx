'use client';

import React from 'react';

type IssuerKey =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'maestro'
  | 'mir'
  | 'unknown';

export function CardIssuerIcon({ issuer, size = 20 }: { issuer: IssuerKey; size?: number }) {
  const common = { width: size, height: size } as const;

  switch (issuer) {
    case 'visa':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Visa" role="img">
          <rect width="48" height="16" rx="3" fill="#1A1F71"/>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial" fontSize="8" fontWeight="700">VISA</text>
        </svg>
      );
    case 'mastercard':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Mastercard" role="img">
          <rect width="48" height="16" rx="3" fill="#000"/>
          <circle cx="20" cy="8" r="5" fill="#EB001B"/>
          <circle cx="28" cy="8" r="5" fill="#F79E1B"/>
        </svg>
      );
    case 'amex':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="American Express" role="img">
          <rect width="48" height="16" rx="3" fill="#006FCF"/>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial" fontSize="6" fontWeight="700">AMEX</text>
        </svg>
      );
    case 'discover':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Discover" role="img">
          <rect width="48" height="16" rx="3" fill="#fff"/>
          <circle cx="36" cy="8" r="5" fill="#FF6000"/>
          <text x="14" y="10" fill="#000" fontSize="6" fontWeight="700">DISC</text>
        </svg>
      );
    case 'diners':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Diners Club" role="img">
          <rect width="48" height="16" rx="3" fill="#0079BE"/>
          <circle cx="24" cy="8" r="5" fill="#fff"/>
        </svg>
      );
    case 'jcb':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="JCB" role="img">
          <rect width="48" height="16" rx="3" fill="#007B49"/>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">JCB</text>
        </svg>
      );
    case 'unionpay':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="UnionPay" role="img">
          <rect width="48" height="16" rx="3" fill="#E21836"/>
        </svg>
      );
    case 'maestro':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Maestro" role="img">
          <rect width="48" height="16" rx="3" fill="#0066CC"/>
          <circle cx="22" cy="8" r="5" fill="#EB001B"/>
          <circle cx="26" cy="8" r="5" fill="#0066CC" opacity="0.7"/>
        </svg>
      );
    case 'mir':
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Mir" role="img">
          <rect width="48" height="16" rx="3" fill="#00A651"/>
        </svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 48 16" aria-label="Card" role="img">
          <rect width="48" height="16" rx="3" fill="#666"/>
        </svg>
      );
  }
}


