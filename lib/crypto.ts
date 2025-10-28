'use client';

// Minimal crypto helpers using Web Crypto API: PBKDF2 + AES-GCM

export interface EncryptedPayload {
  v: number; // version
  s: string; // salt (base64)
  iv: string; // iv (base64)
  c: string; // ciphertext (base64)
  t: string; // token (unique identifier for one-time use)
}

function getSubtle(): SubtleCrypto {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto not available');
  }
  return window.crypto.subtle;
}

function toBytes(str: string): Uint8Array {
  const bytes = new TextEncoder().encode(str);
  // Ensure we have a proper ArrayBuffer for Web Crypto API
  return new Uint8Array(bytes.buffer.slice(0));
}

function fromBytes(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

function b64encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function b64decode(b64: string): Uint8Array {
  return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey('raw', toBytes(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJsonWithPin(data: unknown, pin: string): Promise<EncryptedPayload> {
  const subtle = getSubtle();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const token = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt);
  const plaintext = toBytes(JSON.stringify(data));
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    v: 1,
    s: b64encode(salt),
    iv: b64encode(iv),
    c: b64encode(new Uint8Array(ciphertext)),
    t: b64encode(token),
  };
}

export async function decryptJsonWithPin(payload: EncryptedPayload, pin: string): Promise<unknown> {
  const subtle = getSubtle();
  const salt = b64decode(payload.s);
  const iv = b64decode(payload.iv);
  const key = await deriveKey(pin, salt);
  const ciphertext = b64decode(payload.c);
  const plaintext = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(fromBytes(plaintext));
}

export function encodeToUrlFragment(obj: unknown): string {
  return encodeURIComponent(btoa(JSON.stringify(obj)));
}

export function decodeFromUrlFragment(fragment: string): EncryptedPayload {
  const json = atob(decodeURIComponent(fragment.replace(/^#/, '')));
  return JSON.parse(json);
}

// One-time use token management
const USED_TOKENS_KEY = 'stoct:used-tokens';

export function isTokenUsed(token: string): boolean {
  if (typeof window === 'undefined') return false;
  const usedTokens = JSON.parse(localStorage.getItem(USED_TOKENS_KEY) || '[]');
  return usedTokens.includes(token);
}

export function markTokenAsUsed(token: string): void {
  if (typeof window === 'undefined') return;
  const usedTokens = JSON.parse(localStorage.getItem(USED_TOKENS_KEY) || '[]');
  if (!usedTokens.includes(token)) {
    usedTokens.push(token);
    localStorage.setItem(USED_TOKENS_KEY, JSON.stringify(usedTokens));
  }
}

export function checkAndMarkTokenUsed(payload: EncryptedPayload): boolean {
  if (isTokenUsed(payload.t)) {
    return false; // Already used
  }
  markTokenAsUsed(payload.t);
  return true; // First time use
}


