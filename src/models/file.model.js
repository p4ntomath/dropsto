import { formatFileSize } from '../utils/helpers.js'

/**
 * File Model - Represents an uploaded file
 */
export class FileModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.name = data.name || ''
    this.originalName = data.originalName || data.name || ''
    this.size = data.size || 0 // in bytes
    this.type = data.type || this.getFileExtension(data.name)
    this.mimeType = data.mimeType || ''
    this.bucketId = data.bucketId || ''
    this.uploadedAt = data.uploadedAt || new Date().toISOString()
    this.uploadedBy = data.uploadedBy || ''
    this.downloadURL = data.downloadURL || ''
    this.storagePath = data.storagePath || ''
    this.isActive = data.isActive !== undefined ? data.isActive : true
    this.downloadCount = data.downloadCount || 0
    this.lastDownloaded = data.lastDownloaded || null
    
    // Client-side properties (not stored in Firestore)
    this.file = data.file || null // Original File object
    this.url = data.url || null // Blob URL for preview
  }

  /**
   * Generate unique file ID
   * @returns {string}
   */
  generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Get file extension from filename
   * @param {string} filename
   * @returns {string}
   */
  getFileExtension(filename) {
    if (!filename) return ''
    return filename.split('.').pop().toLowerCase()
  }

  /**
   * Get formatted file size
   * @returns {string}
   */
  getFormattedSize() {
    return formatFileSize(this.size)
  }

  /**
   * Get file type category for icons/display
   * @returns {string}
   */
  getFileCategory() {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf']
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
    const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'ogg']
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz']

    if (imageTypes.includes(this.type)) return 'image'
    if (documentTypes.includes(this.type)) return 'document'
    if (videoTypes.includes(this.type)) return 'video'
    if (audioTypes.includes(this.type)) return 'audio'
    if (archiveTypes.includes(this.type)) return 'archive'
    return 'file'
  }

  /**
   * Check if file is an image
   * @returns {boolean}
   */
  isImage() {
    return this.getFileCategory() === 'image'
  }

  /**
   * Check if file is a document
   * @returns {boolean}
   */
  isDocument() {
    return this.getFileCategory() === 'document'
  }

  /**
   * Increment download count
   */
  recordDownload() {
    this.downloadCount++
    this.lastDownloaded = new Date().toISOString()
  }

  /**
   * Update file properties
   * @param {object} updates - Properties to update
   */
  update(updates) {
    Object.assign(this, updates)
  }

  /**
   * Convert to Firestore document format
   * @returns {object}
   */
  toFirestore() {
    return {
      name: this.name,
      originalName: this.originalName,
      size: this.size,
      type: this.type,
      mimeType: this.mimeType,
      bucketId: this.bucketId,
      uploadedAt: this.uploadedAt,
      uploadedBy: this.uploadedBy,
      downloadURL: this.downloadURL,
      storagePath: this.storagePath,
      isActive: this.isActive,
      downloadCount: this.downloadCount,
      lastDownloaded: this.lastDownloaded
    }
  }

  /**
   * Create FileModel instance from Firestore document
   * @param {string} id - Document ID
   * @param {object} data - Document data
   * @returns {FileModel}
   */
  static fromFirestore(id, data) {
    return new FileModel({
      id,
      ...data
    })
  }

  /**
   * Create FileModel from browser File object
   * @param {File} file - Browser File object
   * @param {string} bucketId - Associated bucket ID
   * @param {string} uploadedBy - User ID who uploaded
   * @returns {FileModel}
   */
  static fromFile(file, bucketId, uploadedBy) {
    return new FileModel({
      name: file.name,
      originalName: file.name,
      size: file.size,
      type: file.name.split('.').pop().toLowerCase(),
      mimeType: file.type,
      bucketId,
      uploadedBy,
      file,
      url: URL.createObjectURL(file)
    })
  }

  /**
   * Convert to legacy localStorage format for backward compatibility
   * @returns {object}
   */
  toLegacyFormat() {
    return {
      id: this.id,
      name: this.name,
      size: this.getFormattedSize(),
      type: this.type,
      uploadedAt: this.uploadedAt,
      url: this.url || this.downloadURL,
      file: this.file
    }
  }
}