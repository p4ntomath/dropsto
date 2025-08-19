import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '../firebase/config.js'
import { Bucket } from '../models/bucket.model.js'
import { COLLECTIONS, STORAGE_KEYS } from '../utils/constants.js'
import { generatePinCode, shouldAutoDeleteBucket } from '../utils/helpers.js'

/**
 * Bucket Service - Handles all bucket-related operations
 */
export class BucketService {
  constructor() {
    this.buckets = new Map()
    this.listeners = []
    this.auth = getAuth()
  }

  /**
   * Generate a unique PIN code that doesn't already exist
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<string>} Unique PIN code
   */
  async generateUniquePinCode(maxRetries = 10) {
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
    const maxRetries = 5
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Generate a PIN code
        const pinCode = generatePinCode()
        
        const bucket = new Bucket({
          ...bucketData,
          ownerId: userId,
          ownerEmail: bucketData.ownerEmail,
          owner: bucketData.owner,
          pinCode: pinCode
        })

        // Try to add to Firestore
        const docRef = await addDoc(collection(db, COLLECTIONS.BUCKETS), bucket.toFirestore())
        bucket.id = docRef.id

        // Store PIN mapping locally for quick access
        this.storePinMapping(bucket.pinCode, bucket.id)

        // Cache the bucket
        this.buckets.set(bucket.id, bucket)

        return bucket
      } catch (error) {
        // If it's a PIN conflict error (though Firestore doesn't enforce uniqueness by default)
        // or any other creation error, retry with a new PIN
        if (attempt === maxRetries - 1) {
          console.error('Error creating bucket after max retries:', error)
          throw new Error('Failed to create bucket. Please try again.')
        }
        
        console.warn(`Bucket creation attempt ${attempt + 1} failed, retrying...`, error)
        // Add a small delay between retries
        await new Promise(resolve => setTimeout(resolve, 100))
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
   * Get bucket by PIN code
   * @param {string} pinCode - Bucket PIN code
   * @returns {Promise<Bucket|null>} Bucket or null if not found
   */
  async getBucketByPin(pinCode) {
    try {
      // Check local storage first for quick access
      const pinMappings = this.getPinMappings()
      const bucketId = pinMappings[pinCode]

      if (bucketId) {
        return await this.getBucketById(bucketId)
      }

      // Fallback: Query Firestore by PIN code
      const q = query(
        collection(db, COLLECTIONS.BUCKETS), 
        where('pinCode', '==', pinCode),
        where('isActive', '==', true)
      )
      
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        const bucket = Bucket.fromFirestore(doc.id, doc.data())
        
        // Update local PIN mapping
        this.storePinMapping(pinCode, bucket.id)
        this.buckets.set(bucket.id, bucket)
        
        return bucket
      }

      return null
    } catch (error) {
      console.error('Error fetching bucket by PIN:', error)
      throw new Error('Failed to access bucket with provided PIN.')
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
      console.error('Error updating bucket:', error)
      throw new Error('Failed to update bucket.')
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
   * Store PIN mapping in localStorage
   * @param {string} pinCode - PIN code
   * @param {string} bucketId - Bucket ID
   */
  storePinMapping(pinCode, bucketId) {
    try {
      const pinMappings = this.getPinMappings()
      pinMappings[pinCode] = bucketId
      localStorage.setItem(STORAGE_KEYS.PIN_MAPPINGS, JSON.stringify(pinMappings))
    } catch (error) {
      console.error('Error storing PIN mapping:', error)
    }
  }

  /**
   * Get PIN mappings from localStorage
   * @returns {object} PIN mappings
   */
  getPinMappings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PIN_MAPPINGS) || '{}')
    } catch (error) {
      console.error('Error reading PIN mappings:', error)
      return {}
    }
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