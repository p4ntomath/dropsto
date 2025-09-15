import { generatePinCode } from '../utils/helpers.js'

/**
 * Bucket Model - Represents a storage bucket
 */
export class Bucket {
  constructor(data = {}) {
    this.id = data.id || Date.now()
    this.name = data.name || ''
    this.description = data.description || 'No description provided'
    this.type = 'bucket'
    this.preview = data.preview || 'folder'
    this.color = data.color || 'from-blue-500 to-cyan-500'
    this.owner = data.owner || ''
    this.ownerEmail = data.ownerEmail || ''
    this.ownerId = data.ownerId || ''
    this.isOwned = data.isOwned !== undefined ? data.isOwned : true
    this.collaborators = data.collaborators || []
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
    this._pinCode = data.pinCode // Raw PIN code (for creation and legacy)
    this.hashedPin = data.hashedPin // Hashed PIN (for new buckets)
    this.fileCount = data.fileCount || 0
    this.storageUsed = data.storageUsed || 0 // in bytes
    this.isActive = data.isActive !== undefined ? data.isActive : true
  }

  // Getter for pinCode that handles both new and legacy buckets
  get pinCode() {
    // For new buckets, only show PIN if user is the owner
    if (this._pinCode || (!this.hashedPin && this.isOwned)) {
      return this._pinCode;
    }
    return null;
  }

  // Only allow setting pinCode during creation
  set pinCode(value) {
    if (!this._pinCode) {
      this._pinCode = value;
    }
  }

  /**
   * Update bucket properties
   * @param {object} updates - Properties to update
   */
  update(updates) {
    Object.assign(this, updates)
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Add a collaborator to the bucket
   * @param {string} email - Collaborator's email
   */
  addCollaborator(email) {
    if (!this.collaborators.includes(email)) {
      this.collaborators.push(email)
      this.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Remove a collaborator from the bucket
   * @param {string} email - Collaborator's email
   */
  removeCollaborator(email) {
    this.collaborators = this.collaborators.filter(c => c !== email)
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Check if user has access to bucket
   * @param {string} userEmail - User's email
   * @returns {boolean}
   */
  hasAccess(userEmail) {
    return this.ownerEmail === userEmail || this.collaborators.includes(userEmail)
  }

  /**
   * Get formatted storage size
   * @returns {string}
   */
  getFormattedSize() {
    return this.formatFileSize(this.storageUsed)
  }

  /**
   * Format file size helper
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Convert to Firestore document format
   * @returns {object}
   */
  toFirestore() {
    const data = {
      name: this.name,
      description: this.description,
      type: this.type,
      preview: this.preview,
      color: this.color,
      owner: this.owner,
      ownerEmail: this.ownerEmail,
      ownerId: this.ownerId,
      collaborators: this.collaborators,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hashedPin: this.hashedPin,
      fileCount: this.fileCount,
      storageUsed: this.storageUsed,
      isActive: this.isActive
    };

    // Store raw pinCode only for legacy buckets
    if (this._pinCode && !this.hashedPin) {
      data.pinCode = this._pinCode;
    }

    return data;
  }

  /**
   * Create Bucket instance from Firestore document
   * @param {string} id - Document ID
   * @param {object} data - Document data
   * @returns {Bucket}
   */
  static fromFirestore(id, data) {
    return new Bucket({
      id,
      ...data
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
      description: this.description,
      type: this.type,
      items: this.fileCount,
      size: this.getFormattedSize(),
      preview: this.preview,
      collaborators: this.collaborators,
      color: this.color,
      owner: this.owner,
      ownerEmail: this.ownerEmail,
      isOwned: this.isOwned,
      createdAt: this.createdAt,
      pinCode: this._pinCode // Keep raw PIN in legacy format for compatibility
    }
  }
}