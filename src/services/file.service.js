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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage'
import { db, storage } from '../firebase/config.js'
import { FileModel } from '../models/file.model.js'
import { COLLECTIONS, STORAGE_LIMITS, ALLOWED_FILE_TYPES } from '../utils/constants.js'
import { isValidFileType, calculateTotalStorage } from '../utils/helpers.js'
import { bucketService } from './bucket.service.js'

/**
 * File Service - Handles all file-related operations
 */
export class FileService {
  constructor() {
    this.files = new Map()
    this.listeners = []
  }

  /**
   * Upload files to a bucket
   * @param {FileList} files - Files to upload
   * @param {string} bucketId - Target bucket ID
   * @param {string} userId - User ID uploading the files
   * @returns {Promise<Array<FileModel>>} Uploaded files
   */
  async uploadFiles(files, bucketId, userId) {
    try {
      // Validate files
      const validation = await this.validateFiles(files, bucketId)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const uploadedFiles = []
      const fileArray = Array.from(files)

      for (const file of fileArray) {
        try {
          const uploadedFile = await this.uploadSingleFile(file, bucketId, userId)
          uploadedFiles.push(uploadedFile)
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error)
          // Continue with other files even if one fails
        }
      }

      // Update bucket file count and storage
      await this.updateBucketStats(bucketId)

      return uploadedFiles
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    }
  }

  /**
   * Upload a single file
   * @param {File} file - File to upload
   * @param {string} bucketId - Target bucket ID
   * @param {string} userId - User ID uploading the file
   * @returns {Promise<FileModel>} Uploaded file
   */
  async uploadSingleFile(file, bucketId, userId) {
    try {
      // Create file model
      const fileModel = FileModel.fromFile(file, bucketId, userId)
      
      // Generate storage path
      const storagePath = `buckets/${bucketId}/files/${fileModel.id}-${file.name}`
      const storageRef = ref(storage, storagePath)

      // Upload to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Update file model with storage info
      fileModel.downloadURL = downloadURL
      fileModel.storagePath = storagePath

      // Save to Firestore
      const docRef = await addDoc(collection(db, COLLECTIONS.FILES), fileModel.toFirestore())
      fileModel.id = docRef.id

      // Cache the file
      this.files.set(fileModel.id, fileModel)

      return fileModel
    } catch (error) {
      console.error('Error uploading single file:', error)
      throw new Error(`Failed to upload ${file.name}`)
    }
  }

  /**
   * Get files for a bucket
   * @param {string} bucketId - Bucket ID
   * @returns {Promise<Array<FileModel>>} Array of files
   */
  async getBucketFiles(bucketId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.FILES),
        where('bucketId', '==', bucketId),
        where('isActive', '==', true),
        orderBy('uploadedAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const files = []

      querySnapshot.forEach((doc) => {
        const file = FileModel.fromFirestore(doc.id, doc.data())
        this.files.set(file.id, file)
        files.push(file)
      })

      return files
    } catch (error) {
      console.error('Error fetching bucket files:', error)
      throw new Error('Failed to fetch files.')
    }
  }

  /**
   * Delete a file
   * @param {string} fileId - File ID
   * @param {boolean} permanent - Whether to permanently delete (default: false for soft delete)
   * @returns {Promise<void>}
   */
  async deleteFile(fileId, permanent = false) {
    try {
      const file = this.files.get(fileId) || await this.getFileById(fileId)
      if (!file) {
        throw new Error('File not found')
      }

      // Delete from Firebase Storage
      if (file.storagePath) {
        const storageRef = ref(storage, file.storagePath)
        await deleteObject(storageRef)
      }

      if (permanent) {
        // Permanently delete from Firestore
        const docRef = doc(db, COLLECTIONS.FILES, fileId)
        await deleteDoc(docRef)
      } else {
        // Soft delete in Firestore
        const docRef = doc(db, COLLECTIONS.FILES, fileId)
        await updateDoc(docRef, { 
          isActive: false,
          deletedAt: new Date().toISOString()
        })
      }

      // Remove from cache
      this.files.delete(fileId)

      // Update bucket stats if not permanent deletion (permanent deletion handles this at bucket level)
      if (!permanent) {
        await this.updateBucketStats(file.bucketId)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      throw new Error('Failed to delete file.')
    }
  }

  /**
   * Delete all files in a bucket (used during bucket deletion)
   * @param {string} bucketId - Bucket ID
   * @param {boolean} permanent - Whether to permanently delete files
   * @returns {Promise<void>}
   */
  async deleteAllBucketFiles(bucketId, permanent = false) {
    try {
      const files = await this.getBucketFiles(bucketId)
      
      // Delete all files
      for (const file of files) {
        try {
          await this.deleteFile(file.id, permanent)
        } catch (error) {
          console.error(`Error deleting file ${file.id}:`, error)
          // Continue with other files even if one fails
        }
      }

      console.log(`${permanent ? 'Permanently deleted' : 'Soft deleted'} ${files.length} files from bucket ${bucketId}`)
    } catch (error) {
      console.error(`Error deleting bucket files:`, error)
      throw error
    }
  }

  /**
   * Rename a file
   * @param {string} fileId - File ID
   * @param {string} newName - New file name
   * @returns {Promise<FileModel>} Updated file
   */
  async renameFile(fileId, newName) {
    try {
      const docRef = doc(db, COLLECTIONS.FILES, fileId)
      await updateDoc(docRef, { 
        name: newName,
        updatedAt: new Date().toISOString()
      })

      // Update cache
      if (this.files.has(fileId)) {
        const file = this.files.get(fileId)
        file.update({ name: newName })
        return file
      }

      return await this.getFileById(fileId)
    } catch (error) {
      console.error('Error renaming file:', error)
      throw new Error('Failed to rename file.')
    }
  }

  /**
   * Get file by ID
   * @param {string} fileId - File ID
   * @returns {Promise<FileModel|null>} File or null if not found
   */
  async getFileById(fileId) {
    try {
      if (this.files.has(fileId)) {
        return this.files.get(fileId)
      }

      const docRef = doc(db, COLLECTIONS.FILES, fileId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const file = FileModel.fromFirestore(docSnap.id, docSnap.data())
        this.files.set(file.id, file)
        return file
      }

      return null
    } catch (error) {
      console.error('Error fetching file:', error)
      throw new Error('Failed to fetch file.')
    }
  }

  /**
   * Download a file (record download event)
   * @param {string} fileId - File ID
   * @returns {Promise<string>} Download URL
   */
  async downloadFile(fileId) {
    try {
      const file = await this.getFileById(fileId)
      if (!file) {
        throw new Error('File not found')
      }

      // Record download
      await this.recordDownload(fileId)

      return file.downloadURL
    } catch (error) {
      console.error('Error downloading file:', error)
      throw new Error('Failed to download file.')
    }
  }

  /**
   * Record file download
   * @param {string} fileId - File ID
   */
  async recordDownload(fileId) {
    try {
      const file = this.files.get(fileId)
      if (file) {
        file.recordDownload()
      }

      const docRef = doc(db, COLLECTIONS.FILES, fileId)
      await updateDoc(docRef, {
        downloadCount: (file?.downloadCount || 0) + 1,
        lastDownloaded: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error recording download:', error)
      // Non-critical error, don't throw
    }
  }

  /**
   * Validate files before upload
   * @param {FileList} files - Files to validate
   * @param {string} bucketId - Target bucket ID
   * @returns {Promise<object>} Validation result
   */
  async validateFiles(files, bucketId) {
    try {
      const fileArray = Array.from(files)
      
      // Check individual file sizes
      const oversizedFiles = fileArray.filter(
        file => file.size > STORAGE_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024
      )
      
      if (oversizedFiles.length > 0) {
        return {
          valid: false,
          error: `Files exceed ${STORAGE_LIMITS.MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`
        }
      }

      // Check file types
      const invalidFiles = fileArray.filter(
        file => !isValidFileType(file.type, ALLOWED_FILE_TYPES)
      )
      
      if (invalidFiles.length > 0) {
        return {
          valid: false,
          error: `Unsupported file types: ${invalidFiles.map(f => f.name).join(', ')}`
        }
      }

      // Check total storage limit
      const currentFiles = await this.getBucketFiles(bucketId)
      const currentStorage = calculateTotalStorage(currentFiles)
      const newFilesSize = fileArray.reduce((total, file) => total + file.size, 0)
      const totalAfterUpload = (currentStorage + newFilesSize) / (1024 * 1024)

      if (totalAfterUpload > STORAGE_LIMITS.MAX_TOTAL_STORAGE_MB) {
        return {
          valid: false,
          error: `Upload would exceed ${STORAGE_LIMITS.MAX_TOTAL_STORAGE_MB}MB storage limit. Current: ${(currentStorage / (1024 * 1024)).toFixed(1)}MB, Adding: ${(newFilesSize / (1024 * 1024)).toFixed(1)}MB`
        }
      }

      return { valid: true }
    } catch (error) {
      console.error('Error validating files:', error)
      return {
        valid: false,
        error: 'Failed to validate files. Please try again.'
      }
    }
  }

  /**
   * Update bucket statistics (file count and storage used)
   * @param {string} bucketId - Bucket ID
   */
  async updateBucketStats(bucketId) {
    try {
      const files = await this.getBucketFiles(bucketId)
      const fileCount = files.length
      const storageUsed = calculateTotalStorage(files)

      await bucketService.updateBucket(bucketId, {
        fileCount,
        storageUsed
      })
    } catch (error) {
      console.error('Error updating bucket stats:', error)
      // Non-critical error, don't throw
    }
  }

  /**
   * Listen to file changes in a bucket
   * @param {string} bucketId - Bucket ID
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  listenToBucketFiles(bucketId, callback) {
    const q = query(
      collection(db, COLLECTIONS.FILES),
      where('bucketId', '==', bucketId),
      where('isActive', '==', true),
      orderBy('uploadedAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const files = []
      querySnapshot.forEach((doc) => {
        const file = FileModel.fromFirestore(doc.id, doc.data())
        this.files.set(file.id, file)
        files.push(file)
      })
      callback(files)
    })

    this.listeners.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Clear file cache
   */
  clearCache() {
    this.files.clear()
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
export const fileService = new FileService()