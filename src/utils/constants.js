// Storage and file constraints
export const STORAGE_LIMITS = {
  MAX_TOTAL_STORAGE_MB: 30,
  MAX_FILE_SIZE_MB: 10,
  BUCKET_EXPIRY_DAYS: 7
}

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/',
  
  // Videos
  'video/',
  
  // Audio
  'audio/',
  
  // Text files
  'text/',
  
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument',
  'application/x-python-code',
  'application/x-python',
  'text/x-python',
  'text/x-python-script',
  'application/javascript',
  'text/javascript',
  'application/json',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-php',
  'text/x-ruby',
  'text/x-go',
  'text/x-rust',
  'text/x-kotlin',
  'text/x-swift',
  'text/x-typescript',
  'application/typescript',
  'text/x-sql',
  'application/sql',
  'text/x-sh',
  'application/x-sh',
  'text/x-yaml',
  'application/x-yaml',
  'text/yaml',
  'application/yaml',
  'text/xml',
  'application/xml',
  'text/html',
  'application/xhtml+xml',
  'text/css',
  'text/x-sass',
  'text/x-scss',
  'text/x-less',
  'text/markdown',
  'text/x-markdown',
  'application/x-dockerfile',
  'text/x-dockerfile',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-7z-compressed',
  'application/x-wine-extension-ini',
  'text/x-properties',
  'application/x-httpd-php'
]

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
  FILES: 'files',
  PIN_MAPPINGS: 'pinMappings'
}

// Local storage keys
export const STORAGE_KEYS = {
  PIN_MAPPINGS: 'dropsto-pin-mappings'
}