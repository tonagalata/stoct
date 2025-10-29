'use client';

import React from 'react';
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

// Map issuer keys to local vendored SVG filenames (logo style)
const mapToLocalLogo: Record<IssuerKey, string> = {
  visa: 'visa.svg',
  mastercard: 'mastercard.svg',
  amex: 'amex.svg',
  discover: 'discover.svg',
  diners: 'diners.svg',
  jcb: 'jcb.svg',
  unionpay: 'unionpay.svg',
  maestro: 'maestro.svg',
  mir: 'mir.svg',
  unknown: 'generic.svg'
};

export function PaymentBrandIcon({ issuer, size = 28 }: { issuer: IssuerKey; size?: number }) {
  const file = mapToLocalLogo[issuer] || mapToLocalLogo.unknown;
  if (file) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/ccicons/logo/${file}`} width={size} height={size} alt={`${issuer} logo`} style={{ display: 'block' }} />;
  }
  return <CardIssuerIcon issuer={issuer} size={size} />;
}


