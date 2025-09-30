import { logEvent } from 'firebase/analytics'
import { analytics } from '../firebase/config'
import Logger from '../utils/logger'

/**
 * Analytics Service - Handles all Firebase Analytics events
 */
export class AnalyticsService {
  /**
   * Log a file upload event
   * @param {string} bucketId - Bucket ID
   * @param {number} fileCount - Number of files uploaded
   * @param {number} totalSize - Total size of files in bytes
   */
  logFileUpload(bucketId, fileCount, totalSize) {
    if (!analytics) return
    
    try {
      logEvent(analytics, 'file_upload', {
        bucket_id: bucketId,
        file_count: fileCount,
        total_size: totalSize,
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log a file download event
   * @param {string} bucketId - Bucket ID
   * @param {string} fileId - File ID
   * @param {number} fileSize - File size in bytes
   */
  logFileDownload(bucketId, fileId, fileSize) {
    if (!analytics) return

    try {
      logEvent(analytics, 'file_download', {
        bucket_id: bucketId,
        file_id: fileId,
        file_size: fileSize,
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log a bucket creation event
   * @param {string} bucketId - Bucket ID
   */
  logBucketCreate(bucketId) {
    if (!analytics) return

    try {
      logEvent(analytics, 'bucket_create', {
        bucket_id: bucketId,
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log a bucket deletion event
   * @param {string} bucketId - Bucket ID
   * @param {number} fileCount - Number of files in bucket
   * @param {number} totalSize - Total size of bucket in bytes
   */
  logBucketDelete(bucketId, fileCount, totalSize) {
    if (!analytics) return

    try {
      logEvent(analytics, 'bucket_delete', {
        bucket_id: bucketId,
        file_count: fileCount,
        total_size: totalSize,
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log a PIN access event
   * @param {string} bucketId - Bucket ID
   */
  logPinAccess(bucketId) {
    if (!analytics) return

    try {
      logEvent(analytics, 'pin_access', {
        bucket_id: bucketId,
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log a PIN attempt event
   * @param {string} pin - The PIN that was attempted (masked for privacy)
   * @param {string} status - The status of the attempt (invalid_format, invalid_pin, recaptcha_required, etc)
   */
  logPinAttempt(pin, status) {
    if (!analytics) return

    try {
      // For privacy, we only track if it's a new or legacy format PIN
      const pinFormat = pin.length === 9 ? 'new' : pin.length === 13 ? 'legacy' : 'invalid'
      
      logEvent(analytics, 'pin_attempt', {
        pin_format: pinFormat,
        status: status
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log a user sign in event
   * @param {string} method - Sign in method (google, etc)
   * @param {string} userId - User ID
   */
  logUserSignIn(method, userId) {
    if (!analytics) return

    try {
      logEvent(analytics, 'login', {
        method: method,
        user_id: userId
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log user engagement session
   * @param {string} userId - User ID
   * @param {string} screenName - Current screen name
   */
  logScreenView(userId, screenName) {
    if (!analytics) return

    try {
      logEvent(analytics, 'screen_view', {
        user_id: userId,
        screen_name: screenName
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }

  /**
   * Log error events
   * @param {string} errorCode - Error code or type
   * @param {string} errorMessage - Error message
   */
  logError(errorCode, errorMessage) {
    if (!analytics) return

    try {
      logEvent(analytics, 'error', {
        error_code: errorCode,
        error_message: errorMessage
      })
    } catch (error) {
      Logger.error('Analytics error:', error)
    }
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService()