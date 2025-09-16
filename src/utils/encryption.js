// ----------------------
// CONFIG
// ----------------------
const IV_LENGTH = 12;        // 12 bytes for AES-GCM
const ENCRYPTION_SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'default-secret';

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
async function getKey(secret) {
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
    ['encrypt', 'decrypt']
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
    console.error('Encryption error:', err);
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
    console.error('Decryption error:', err);
    return null;
  }
}

export { encryptPIN, decryptPIN };