// Storage and file constraints
export const STORAGE_LIMITS = {
  MAX_TOTAL_STORAGE_MB: 30,
  BUCKET_EXPIRY_DAYS: 7
}

// PIN format constants
export const PIN_LENGTH = {
  NEW: 9,      // Total length for 'drop-XXXX' format
  LEGACY: 13   // Total length for 'drop-XXXXXXXX' format
}

// Security settings
export const SECURITY = {
  PIN_ATTEMPTS_BEFORE_CAPTCHA: 3,
  PIN_ATTEMPTS_BEFORE_TIMEOUT: 10,
  PIN_TIMEOUT_MINUTES: 60,
  RECAPTCHA_SITE_KEY: '6LcR0sorAAAAAIOTAy5vW3EBoOY6XGqrQLdpplvE'
}

// Bucket color options
export const BUCKET_COLORS = [
  { name: 'Blue', value: 'from-blue-500 to-cyan-500' },
  { name: 'Purple', value: 'from-purple-500 to-pink-500' },
  { name: 'Green', value: 'from-green-500 to-blue-500' },
  { name: 'Orange', value: 'from-orange-500 to-red-500' },
  { name: 'Indigo', value: 'from-indigo-500 to-purple-500' },
  { name: 'Gray', value: 'from-gray-500 to-slate-600' }
]

// Bucket icon options
export const BUCKET_ICONS = [
  { name: 'Folder', value: 'folder' },
  { name: 'Document', value: 'document' },
  { name: 'Image', value: 'image' },
  { name: 'Video', value: 'video' },
  { name: 'Briefcase', value: 'briefcase' },
  { name: 'Database', value: 'database' }
]

// Firestore collection names
export const COLLECTIONS = {
  BUCKETS: 'buckets',
  FILES: 'files'
}

// Local storage keys
export const STORAGE_KEYS = {
}