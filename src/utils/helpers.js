import { STORAGE_LIMITS } from './constants.js'

/**
 * Generate a unique PIN code for bucket access
 * @returns {string} PIN code in format "drop-XXXXXXXX"
 */
export const generatePinCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'drop-'
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Convert file size string back to bytes
 * @param {string} sizeString - Size string like "2.5 MB"
 * @returns {number} Size in bytes
 */
export const parseSizeToBytes = (sizeString) => {
  const [size, unit] = sizeString.split(' ')
  const sizeNum = parseFloat(size)
  
  switch(unit) {
    case 'KB': return sizeNum * 1024
    case 'MB': return sizeNum * 1024 * 1024
    case 'GB': return sizeNum * 1024 * 1024 * 1024
    case 'Bytes': return sizeNum
    default: return 0
  }
}

/**
 * Calculate days until bucket expiration
 * @param {string} createdAt - ISO timestamp of bucket creation
 * @returns {number} Days remaining (0 if expired)
 */
export const getDaysUntilExpiration = (createdAt) => {
  const createdDate = new Date(createdAt)
  const currentDate = new Date()
  const expirationDate = new Date(
    createdDate.getTime() + (STORAGE_LIMITS.BUCKET_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  )
  const timeLeft = expirationDate.getTime() - currentDate.getTime()
  const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))
  return Math.max(0, daysLeft)
}

/**
 * Check if a bucket has expired
 * @param {string} createdAt - ISO timestamp of bucket creation
 * @returns {boolean} True if bucket has expired
 */
export const isBucketExpired = (createdAt) => {
  return getDaysUntilExpiration(createdAt) === 0
}

/**
 * Get the exact expiration date for a bucket
 * @param {string} createdAt - ISO timestamp of bucket creation
 * @returns {Date} Expiration date
 */
export const getBucketExpirationDate = (createdAt) => {
  const createdDate = new Date(createdAt)
  return new Date(
    createdDate.getTime() + (STORAGE_LIMITS.BUCKET_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  )
}

/**
 * Get expiration status with styling information
 * @param {number} daysLeft - Days until expiration
 * @returns {object} Status object with text and color
 */
export const getExpirationStatus = (daysLeft) => {
  if (daysLeft === 0) return { text: 'Expired', color: 'text-red-600 bg-red-100' }
  if (daysLeft === 1) return { text: '1 day left', color: 'text-red-600 bg-red-100' }
  if (daysLeft <= 2) return { text: `${daysLeft} days left`, color: 'text-orange-600 bg-orange-100' }
  if (daysLeft <= 4) return { text: `${daysLeft} days left`, color: 'text-yellow-600 bg-yellow-100' }
  return { text: `${daysLeft} days left`, color: 'text-green-600 bg-green-100' }
}

/**
 * Validate file type against allowed types
 * @param {string} fileType - MIME type of the file
 * @param {Array} allowedTypes - Array of allowed MIME type prefixes
 * @returns {boolean} Whether file type is allowed
 */
export const isValidFileType = (fileType, allowedTypes) => {
  return allowedTypes.some(type => fileType.startsWith(type))
}

/**
 * Calculate total storage usage in bytes
 * @param {Array} files - Array of file objects
 * @returns {number} Total storage in bytes
 */
export const calculateTotalStorage = (files) => {
  return files.reduce((total, file) => {
    const bytes = typeof file.size === 'string' 
      ? parseSizeToBytes(file.size)
      : file.size
    return total + bytes
  }, 0)
}