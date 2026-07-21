const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const keyHex = localStorage.getItem('beehive-encryption-key');
  if (!keyHex) {
    const newKey = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(newKey).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('beehive-encryption-key', hex);
    return crypto.subtle.importKey(
      'raw',
      newKey,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }
  return crypto.subtle.importKey(
    'raw',
    hexToBytes(keyHex),
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(apiKey: string): Promise<{ encrypted: string; iv: string; authTag: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encoded = new TextEncoder().encode(apiKey);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );
  
  const cipherBytes = new Uint8Array(cipherBuffer);
  const authTag = cipherBytes.slice(-16);
  const encrypted = cipherBytes.slice(0, -16);
  
  return {
    encrypted: bytesToBase64(encrypted),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(authTag),
  };
}

export async function decryptApiKey(encrypted: string, iv: string, authTag: string): Promise<string> {
  const key = await getKey();
  const encryptedBytes = base64ToBytes(encrypted);
  const ivBytes = base64ToBytes(iv);
  const authTagBytes = base64ToBytes(authTag);
  
  const combined = new Uint8Array(encryptedBytes.length + authTagBytes.length);
  combined.set(encryptedBytes);
  combined.set(authTagBytes, encryptedBytes.length);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes },
    key,
    combined
  );
  
  return new TextDecoder().decode(decrypted);
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '••••';
  return apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
}
