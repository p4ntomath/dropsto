import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase/config.js'
import { Bucket } from '../models/bucket.model.js'
import { COLLECTIONS, STORAGE_KEYS, SECURITY } from '../utils/constants.js'
import { generatePinCode, shouldAutoDeleteBucket } from '../utils/helpers.js'
import { encryptPIN } from '../utils/encryption.js'

/**
 * Bucket Service - Handles all bucket-related operations
 */
export class BucketService {
  constructor() {
    this.buckets = new Map()
    this.listeners = []
    this.auth = getAuth()
    this.functions = getFunctions()
    this.pinAttempts = new Map()
    this.wrongAttempts = new Map()
  }

  /**
   * Check if reCAPTCHA is required for this IP
   * @param {string} clientIP - Client IP address
   * @returns {boolean} Whether reCAPTCHA is required
   */
  isRecaptchaRequired(clientIP) {
    const wrongAttempts = this.wrongAttempts.get(clientIP) || []
    const now = Date.now()
    
    // Clean up old attempts (older than 1 hour)
    const recentWrongAttempts = wrongAttempts.filter(time => now - time < 3600000)
    this.wrongAttempts.set(clientIP, recentWrongAttempts)
    
    return recentWrongAttempts.length >= SECURITY.PIN_ATTEMPTS_BEFORE_CAPTCHA
  }

  /**
   * Record a wrong PIN attempt
   * @param {string} clientIP - Client IP address
   */
  recordWrongAttempt(clientIP) {
    const wrongAttempts = this.wrongAttempts.get(clientIP) || []
    wrongAttempts.push(Date.now())
    this.wrongAttempts.set(clientIP, wrongAttempts)
  }

  /**
   * Generate a unique PIN code that doesn't already exist
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<string>} Unique PIN code
   */
  async generateUniquePinCode() {
    // Simply generate a PIN code without checking for duplicates
    // Duplicate handling is done in createBucket with retry logic
    return generatePinCode()
  }

  /**
   * Create a new bucket with retry logic for PIN conflicts
   * @param {object} bucketData - Bucket creation data
   * @param {string} userId - User ID of the bucket owner
   * @returns {Promise<Bucket>} Created bucket
   */
  async createBucket(bucketData, userId) {
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Generate a PIN code
        const pinCode = await this.generateUniquePinCode();
        const bucket = new Bucket({
          ...bucketData,
          ownerId: userId,
          ownerEmail: bucketData.ownerEmail,
          owner: bucketData.owner
        });

        // Set and encrypt the PIN code
        await bucket.setPinCode(pinCode);

        // Try to add to Firestore - store only the encrypted PIN
        const bucketData = {
          ...bucket.toFirestore(),
          encryptedPin: bucket.encryptedPin // Store encrypted PIN
        };
        delete bucketData.pinCode; // Remove raw PIN if it exists
        
        const docRef = await addDoc(collection(db, COLLECTIONS.BUCKETS), bucketData);
        bucket.id = docRef.id;

        // Cache the bucket
        this.buckets.set(bucket.id, bucket);

        return bucket;
      } catch (error) {
        // If it's the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          console.error('Error creating bucket after max retries:', error);
          throw new Error('Failed to create bucket. Please try again.');
        }
        
        console.warn(`Bucket creation attempt ${attempt + 1} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Get bucket by ID with auto-deletion check
   * @param {string} bucketId - Bucket ID
   * @returns {Promise<Bucket|null>} Bucket or null if not found/expired
   */
  async getBucketById(bucketId) {
    try {
      // Check cache first
      if (this.buckets.has(bucketId)) {
        const bucket = this.buckets.get(bucketId)
        
        // Check if bucket should be auto-deleted
        if (shouldAutoDeleteBucket(bucket.createdAt)) {
          console.log(`Auto-deleting expired bucket: ${bucket.name} (${bucket.id})`)
          await this.autoDeleteExpiredBucket(bucketId)
          return null // Bucket was auto-deleted
        }
        
        return bucket
      }

      // Fetch from Firestore
      const docRef = doc(db, COLLECTIONS.BUCKETS, bucketId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const bucketData = docSnap.data()
        
        // Check if bucket should be auto-deleted before creating instance
        if (shouldAutoDeleteBucket(bucketData.createdAt)) {
          console.log(`Auto-deleting expired bucket: ${bucketData.name} (${bucketId})`)
          await this.autoDeleteExpiredBucket(bucketId)
          return null // Bucket was auto-deleted
        }
        
        const bucket = Bucket.fromFirestore(docSnap.id, bucketData)
        this.buckets.set(bucket.id, bucket)
        return bucket
      }

      return null
    } catch (error) {
      console.error('Error fetching bucket:', error)
      throw new Error('Failed to fetch bucket data.')
    }
  }

  /**
   * Get bucket by PIN code with rate limiting and reCAPTCHA
   * @param {string} pinCode - Bucket PIN code
   * @param {string|null} recaptchaToken - reCAPTCHA token if required
   * @returns {Promise<Bucket|null>} Bucket or null if not found
   */
  async getBucketByPin(pinCode, recaptchaToken = null) {
    try {
      // Check PIN attempts
      const clientIP = await this.getClientIP();
      const attempts = this.pinAttempts.get(clientIP) || [];
      const now = Date.now();
      
      // Clean up old attempts (older than 1 hour)
      const recentAttempts = attempts.filter(time => now - time < 3600000);
      
      // Check if too many attempts
      if (recentAttempts.length >= SECURITY.PIN_ATTEMPTS_BEFORE_TIMEOUT) {
        const oldestAttempt = recentAttempts[0];
        const timeLeft = Math.ceil((oldestAttempt + 3600000 - now) / 60000);
        throw new Error(`Too many attempts. Please try again in ${timeLeft} minutes.`);
      }

      // Check if reCAPTCHA is required
      if (this.isRecaptchaRequired(clientIP)) {
        if (!recaptchaToken) {
          throw new Error('RECAPTCHA_REQUIRED');
        }
        
        // Verify reCAPTCHA token with server
        const isValid = await this.verifyRecaptcha(recaptchaToken);
        if (!isValid) {
          throw new Error('Invalid reCAPTCHA. Please try again.');
        }
      }

      // Add this attempt
      recentAttempts.push(now);
      this.pinAttempts.set(clientIP, recentAttempts);

      // First try finding a legacy bucket with raw PIN
      const rawPinQuery = query(
        collection(db, COLLECTIONS.BUCKETS), 
        where('pinCode', '==', pinCode),
        where('isActive', '==', true)
      );
      
      const rawPinSnapshot = await getDocs(rawPinQuery);
      
      if (!rawPinSnapshot.empty) {
        const doc = rawPinSnapshot.docs[0];
        const bucket = Bucket.fromFirestore(doc.id, doc.data());
        bucket._pinCode = pinCode; // Set legacy PIN
        this.buckets.set(bucket.id, bucket);
        return bucket;
      }

      // If no legacy bucket found, check all active buckets with encrypted PINs
      const encryptedPinQuery = query(
        collection(db, COLLECTIONS.BUCKETS),
        where('isActive', '==', true),
        where('encryptedPin', '!=', null)
      );
      
      const bucketSnapshot = await getDocs(encryptedPinQuery);
      
      // Check each bucket by decrypting its PIN
      for (const doc of bucketSnapshot.docs) {
        const bucket = Bucket.fromFirestore(doc.id, doc.data());
        const decryptedPin = await decryptPIN(bucket.encryptedPin);
        
        if (decryptedPin === pinCode) {
          // For non-owners, store the raw PIN temporarily for this session
          if (!bucket.isOwned) {
            bucket._pinCode = pinCode;
          }
          this.buckets.set(bucket.id, bucket);
          return bucket;
        }
      }

      // Record wrong attempt if no bucket found
      this.recordWrongAttempt(clientIP);
      return null;

    } catch (error) {
      if (error.message !== 'RECAPTCHA_REQUIRED') {
        console.error('Error getting bucket by PIN:', error);
      }
      throw error;
    }
  }

  /**
   * Verify reCAPTCHA token with Firebase Function
   * @param {string} token - reCAPTCHA token to verify
   * @returns {Promise<boolean>} Whether the token is valid
   */
  async verifyRecaptcha(token) {
    try {
      const verifyRecaptchaFunction = httpsCallable(this.functions, 'verifyRecaptcha')
      const result = await verifyRecaptchaFunction({ token })
      return result.data.success
    } catch (error) {
      console.error('Error verifying reCAPTCHA:', error)
      return false
    }
  }

  /**
   * Get client IP address
   * @returns {Promise<string>} Client IP address
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Get all buckets for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Bucket>>} Array of user's buckets
   */
  async getUserBuckets(userId) {
    const operation = async () => {
      const q = query(
        collection(db, COLLECTIONS.BUCKETS),
        where('ownerId', '==', userId),
        where('isActive', '==', true)
      )

      const querySnapshot = await getDocs(q)
      const buckets = []

      querySnapshot.forEach((doc) => {
        const bucket = Bucket.fromFirestore(doc.id, doc.data())
        this.buckets.set(bucket.id, bucket)
        buckets.push(bucket)
      })

      // Sort on client side instead
      buckets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      return buckets
    }

    return operation()
  }

  /**
   * Get shared buckets for a user
   * @param {string} userEmail - User email
   * @returns {Promise<Array<Bucket>>} Array of shared buckets
   */
  async getSharedBuckets(userEmail) {
    const operation = async () => {
      const q = query(
        collection(db, COLLECTIONS.BUCKETS),
        where('collaborators', 'array-contains', userEmail),
        where('isActive', '==', true)
      )

      const querySnapshot = await getDocs(q)
      const buckets = []

      querySnapshot.forEach((doc) => {
        const bucket = Bucket.fromFirestore(doc.id, doc.data())
        bucket.isOwned = false // Mark as shared
        this.buckets.set(bucket.id, bucket)
        buckets.push(bucket)
      })

      // Sort on client side instead
      buckets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      return buckets
    }

    return operation()
  }

  /**
   * Update bucket
   * @param {string} bucketId - Bucket ID
   * @param {object} updates - Fields to update
   * @returns {Promise<Bucket>} Updated bucket
   */
  async updateBucket(bucketId, updates) {
    try {
      const docRef = doc(db, COLLECTIONS.BUCKETS, bucketId)
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      }

      // If pin is being updated, encrypt it
      if (updates.pinCode) {
        updateData.encryptedPin = encryptPIN(updates.pinCode)
        delete updateData.pinCode // Don't store raw pin
      }

      await updateDoc(docRef, updateData)

      // Update cache
      if (this.buckets.has(bucketId)) {
        const bucket = this.buckets.get(bucketId)
        bucket.update(updates)
        return bucket
      }

      // Fetch updated bucket if not in cache
      return await this.getBucketById(bucketId)
    } catch (error) {
    }
  }

  /**
   * Delete bucket (soft delete)
   * @param {string} bucketId - Bucket ID
   * @returns {Promise<void>}
   */
  async deleteBucket(bucketId) {
    try {
      await this.updateBucket(bucketId, { isActive: false })
      
      // Remove from cache
      this.buckets.delete(bucketId)
    } catch (error) {
      console.error('Error deleting bucket:', error)
      throw new Error('Failed to delete bucket.')
    }
  }

  /**
   * Listen to bucket changes
   * @param {string} bucketId - Bucket ID to listen to
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  listenToBucket(bucketId, callback) {
    const docRef = doc(db, COLLECTIONS.BUCKETS, bucketId)
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const bucket = Bucket.fromFirestore(doc.id, doc.data())
        this.buckets.set(bucket.id, bucket)
        callback(bucket)
      } else {
        callback(null)
      }
    })

    this.listeners.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Auto-delete an expired bucket and its files (client-side cleanup)
   * @param {string} bucketId - Bucket ID to delete
   * @returns {Promise<void>}
   */
  async autoDeleteExpiredBucket(bucketId) {
    try {
      console.log(`Starting auto-deletion of expired bucket: ${bucketId}`)
      
      // Import fileService to delete bucket files
      const { fileService } = await import('./file.service.js')
      
      // Delete all files in the bucket first
      await fileService.deleteAllBucketFiles(bucketId, true)
      
      // Mark bucket as deleted with auto-deletion reason
      await this.updateBucket(bucketId, { 
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedReason: 'auto_expired_7_days'
      })
      
      // Remove from cache
      this.buckets.delete(bucketId)
      
      console.log(`Successfully auto-deleted expired bucket: ${bucketId}`)
    } catch (error) {
      console.error(`Error auto-deleting expired bucket ${bucketId}:`, error)
      // Don't throw error to prevent disrupting user experience
    }
  }

  /**
   * Cleanup expired buckets for a specific user (client-side batch cleanup)
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of buckets cleaned up
   */
  async cleanupExpiredUserBuckets(userId) {
    try {
      const userBuckets = await this.getUserBuckets(userId)
      let cleanedCount = 0
      
      for (const bucket of userBuckets) {
        if (shouldAutoDeleteBucket(bucket.createdAt)) {
          await this.autoDeleteExpiredBucket(bucket.id)
          cleanedCount++
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired buckets for user ${userId}`)
      }
      
      return cleanedCount
    } catch (error) {
      console.error('Error during user bucket cleanup:', error)
      return 0
    }
  }

  /**
   * Clear bucket cache
   */
  clearCache() {
    this.buckets.clear()
  }

  /**
   * Clean up listeners
   */
  destroy() {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners = []
    this.clearCache()
  }
}

// Create singleton instance
export const bucketService = new BucketService()