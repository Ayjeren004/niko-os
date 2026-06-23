import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Derive a 32-byte key from a passphrase using PBKDF2
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
}

export function encryptData(data: any, passphrase: string): string {
  const jsonString = JSON.stringify(data);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(jsonString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encryptedData
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted
  ].join(':');
}

export function decryptData(encryptedPayload: string, passphrase: string): any {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid backup file format.');
  }

  const [saltB64, ivB64, authTagB64, encryptedData] = parts;
  
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const key = deriveKey(passphrase, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    throw new Error('Failed to decrypt. Incorrect passphrase or corrupt file.');
  }
}
