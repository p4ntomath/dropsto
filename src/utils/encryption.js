import Logger from './logger.js';

// ----------------------
// CONFIG
// ----------------------
const IV_LENGTH = 12;        // 12 bytes for AES-GCM
if (!import.meta.env.VITE_ENCRYPTION_SECRET) {
  throw new Error('VITE_ENCRYPTION_SECRET environment variable is not set. Refusing to use weak default secret.');
}
if (!import.meta.env.VITE_HMAC_SECRET) {
  throw new Error('VITE_HMAC_SECRET environment variable is not set. Refusing to use weak default secret.');
}
const ENCRYPTION_SECRET = import.meta.env.VITE_ENCRYPTION_SECRET;
const HMAC_SECRET = import.meta.env.VITE_HMAC_SECRET;

// Convert string to ArrayBuffer
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert ArrayBuffer to base64
function ab2base64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Convert base64 to ArrayBuffer
function base642ab(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate encryption key from secret
async function getKey(secret, usage = ['encrypt', 'decrypt']) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: str2ab('salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    usage
  );
}

// Generate HMAC key from secret
async function getHmacKey(secret) {
  return await crypto.subtle.importKey(
    'raw',
    str2ab(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

// ----------------------
// FUNCTIONS
// ----------------------
async function encryptPIN(pin) {
  try {
    const key = await getKey(ENCRYPTION_SECRET);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      str2ab(pin)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
    return ab2base64(combined);
  } catch (err) {
    Logger.error('Encryption error:', err);
    return null;
  }
}

async function decryptPIN(encryptedData) {
  try {
    const key = await getKey(ENCRYPTION_SECRET);
    const data = base642ab(encryptedData);
    
    // Split IV and encrypted data
    const iv = data.slice(0, IV_LENGTH);
    const ciphertext = data.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    Logger.error('Decryption error:', err);
    return null;
  }
}

async function hashPIN(pin) {
  try {
    const key = await getHmacKey(HMAC_SECRET);
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      str2ab(pin)
    );
    return ab2base64(signature);
  } catch (err) {
    Logger.error('Hashing error:', err);
    return null;
  }
}

export { encryptPIN, decryptPIN, hashPIN };