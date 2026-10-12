const STORAGE_KEY = 'device_fingerprint';
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

let memoryFingerprint: string | null = null;

function generateFingerprint(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function getFingerprint(): string {
  const storage = getStorage();
  const stored = storage?.getItem(STORAGE_KEY) ?? memoryFingerprint;
  if (stored !== null && FINGERPRINT_PATTERN.test(stored)) return stored;

  const fingerprint = generateFingerprint();
  memoryFingerprint = fingerprint;
  try {
    storage?.setItem(STORAGE_KEY, fingerprint);
  } catch {
    return fingerprint;
  }
  return fingerprint;
}
