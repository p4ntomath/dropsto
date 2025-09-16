import { encryptPIN, decryptPIN, hashPIN } from '../utils/encryption';
import { formatFileSize } from '../utils/helpers';
import { getAuth } from 'firebase/auth';

/**
 * Bucket Model - Represents a storage bucket
 */
export class Bucket {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.ownerId = data.ownerId || null;
    this.ownerEmail = data.ownerEmail || null;
    this.owner = data.owner || null;
    this.collaborators = data.collaborators || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;
    this.isActive = data.isActive !== false;
    this.fileCount = data.fileCount || 0;
    this.storageUsed = data.storageUsed || 0;
    this.preview = data.preview || 'folder';
    this.color = data.color || 'from-blue-500 to-cyan-500';
    
    // Handle PIN data
    if (data.pinCode) {
      this._pinCode = data.pinCode; // Legacy PIN
    } else if (data.encryptedPin) {
      this.encryptedPin = data.encryptedPin;
      this.hashedPin = data.hashedPin;
    }
    
    if (data.isOwned !== undefined) this.isOwned = data.isOwned;
  }

  // Getter for pinCode that handles both legacy and encrypted PINs
  async getPinCode() {
    // For legacy buckets, return the raw PIN
    if (this._pinCode) {
      return this._pinCode;
    }
    
    // For encrypted PINs, decrypt only if user owns the bucket
    if (this.isOwned && this.encryptedPin) {
      return await decryptPIN(this.encryptedPin);
    }
    
    return null;
  }

  /**
   * Set PIN - for new buckets only
   */
  async setPinCode(value) {
    if (!this.encryptedPin && !this._pinCode && value) {
      // For new buckets, store both encrypted and hashed PINs
      this.encryptedPin = await encryptPIN(value);
      this.hashedPin = await hashPIN(value);
      // Store PIN temporarily for owner
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
    return formatFileSize(this.storageUsed);
  }

  /**
   * Convert to Firestore document format
   * @returns {object}
   */
  toFirestore() {
    const data = {
      name: this.name,
      description: this.description,
      ownerId: this.ownerId,
      ownerEmail: this.ownerEmail,
      owner: this.owner,
      collaborators: this.collaborators,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
      fileCount: this.fileCount,
      storageUsed: this.storageUsed,
      preview: this.preview,
      color: this.color
    };

    // Always include encrypted and hashed PIN data for new buckets
    if (this.encryptedPin && this.hashedPin) {
      data.encryptedPin = this.encryptedPin;
      data.hashedPin = this.hashedPin;
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
      ...data,
      isOwned: data.ownerId === getAuth()?.currentUser?.uid
    });
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
      type: 'bucket',
      items: this.fileCount,
      size: this.getFormattedSize(),
      preview: this.preview,
      collaborators: this.collaborators,
      color: this.color,
      owner: this.owner,
      ownerEmail: this.ownerEmail,
      isOwned: this.isOwned,
      createdAt: this.createdAt,
      pinCode: this._pinCode // Only include raw PIN for legacy buckets
    };
  }
}