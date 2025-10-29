'use client';

import React from 'react';
import * as PaymentIcons from 'react-svg-credit-card-payment-icons';
import { CardIssuerIcon } from './CardIssuerIcon';

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

const mapToLibName: Record<IssuerKey, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'AmericanExpress',
  discover: 'Discover',
  diners: 'DinersClub',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  maestro: 'Maestro',
  mir: 'Mir',
  unknown: ''
};

export function PaymentBrandIcon({ issuer, size = 28 }: { issuer: IssuerKey; size?: number }) {
  const compName = mapToLibName[issuer] || '';
  // Prefer library component; fallback to inline icon if not found
  const Comp = (PaymentIcons as any)[compName] || null;
  if (Comp) {
    // Prefer the library's non-flat/original logo style when available.
    // Many libs accept one of these props; unknown props are safely ignored.
    return (
      <Comp 
        width={size} 
        height={size} 
        variant="original" 
        type="original" 
        theme="original" 
        format="logo"
      />
    );
  }
  return <CardIssuerIcon issuer={issuer} size={size} />;
}


