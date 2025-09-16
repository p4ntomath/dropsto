import { initializeApp } from 'firebase-admin/app'
import fetch from 'node-fetch'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

// Initialize Firebase Admin
initializeApp()

/**
 * Verify reCAPTCHA token
 */
export const verifyRecaptcha = onCall(async (request) => {
  try {
    const { token } = request.data
    
    if (!token) {
      throw new HttpsError('invalid-argument', 'No reCAPTCHA token provided')
    }

    // Get secret key from functions config
    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    if (!secretKey) {
      throw new HttpsError('internal', 'reCAPTCHA configuration is missing')
    }

    // Verify with Google's reCAPTCHA API
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`
    })

    const result = await response.json()

    if (!result.success) {
      logger.error('reCAPTCHA verification failed:', result['error-codes'])
      throw new HttpsError('invalid-argument', 'reCAPTCHA verification failed: ' + (result['error-codes'] || []).join(', '))
    }

    return { success: true }
  } catch (error) {
    logger.error('Error verifying reCAPTCHA:', error)
    if (error instanceof HttpsError) {
      throw error
    }
    throw new HttpsError('internal', 'Failed to verify reCAPTCHA')
  }
})

/**
 * Scheduled function that runs daily at midnight UTC to clean up expired and inactive buckets
 * - Buckets older than 7 days are automatically deleted along with their files
 * - Inactive buckets older than 24 hours are permanently deleted
 */
export const cleanupBuckets = onSchedule("0 0 * * *", async (event) => {
  const db = getFirestore();
  const storage = getStorage();
  
  // Calculate the cutoff dates
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysCutoff = sevenDaysAgo.toISOString();

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayCutoff = oneDayAgo.toISOString();
  
  logger.info(`Starting cleanup of buckets:
  - Created before (expired): ${sevenDaysCutoff}
  - Inactive since: ${oneDayCutoff}`);
  
  try {
    // Find expired buckets (created more than 7 days ago and still active)
    const expiredBucketsQuery = await db.collection('buckets')
      .where('createdAt', '<=', sevenDaysCutoff)
      .where('isActive', '==', true)
      .get();
    
    // Find inactive buckets (marked inactive for more than 24 hours)
    const inactiveBucketsQuery = await db.collection('buckets')
      .where('isActive', '==', false)
      .where('updatedAt', '<=', oneDayCutoff)
      .get();
    
    if (expiredBucketsQuery.empty && inactiveBucketsQuery.empty) {
      logger.info('No buckets to clean up');
      return null;
    }
    
    logger.info(`Found buckets to clean up:
    - Expired: ${expiredBucketsQuery.docs.length}
    - Inactive: ${inactiveBucketsQuery.docs.length}`);
    
    const batch = db.batch();
    let totalFilesDeleted = 0;
    let totalStorageFreed = 0;
    
    // Helper function to process bucket deletion
    const processBucketDeletion = async (bucketDoc, reason) => {
      const bucketId = bucketDoc.id;
      const bucketData = bucketDoc.data();
      
      logger.info(`Processing ${reason} bucket: ${bucketData.name} (ID: ${bucketId})`);
      
      try {
        // Find all files in this bucket
        const filesQuery = await db.collection('files')
          .where('bucketId', '==', bucketId)
          .get();
        
        // Delete files from Firebase Storage and mark as deleted in Firestore
        for (const fileDoc of filesQuery.docs) {
          const fileData = fileDoc.data();
          
          // Delete from Firebase Storage
          if (fileData.storagePath) {
            try {
              await storage.bucket().file(fileData.storagePath).delete();
              totalStorageFreed += fileData.size || 0;
              logger.info(`Deleted file from storage: ${fileData.storagePath}`);
            } catch (storageError) {
              logger.warn(`Failed to delete file from storage: ${fileData.storagePath}`, storageError);
            }
          }
          
          // Mark file as deleted in Firestore
          batch.delete(fileDoc.ref);
          totalFilesDeleted++;
        }
        
        // Delete bucket document
        batch.delete(bucketDoc.ref);
        
        logger.info(`Prepared deletion for bucket: ${bucketData.name} with ${filesQuery.docs.length} files`);
      } catch (bucketError) {
        logger.error(`Error processing bucket ${bucketId}:`, bucketError);
      }
    };

    // Process expired buckets
    for (const bucketDoc of expiredBucketsQuery.docs) {
      await processBucketDeletion(bucketDoc, 'expired');
    }

    // Process inactive buckets
    for (const bucketDoc of inactiveBucketsQuery.docs) {
      await processBucketDeletion(bucketDoc, 'inactive');
    }
    
    // Commit all deletions in a single batch
    await batch.commit();
    
    const summary = {
      expiredBucketsDeleted: expiredBucketsQuery.docs.length,
      inactiveBucketsDeleted: inactiveBucketsQuery.docs.length,
      totalBucketsDeleted: expiredBucketsQuery.docs.length + inactiveBucketsQuery.docs.length,
      filesDeleted: totalFilesDeleted,
      storageFreedBytes: totalStorageFreed,
      storageFreedMB: (totalStorageFreed / (1024 * 1024)).toFixed(2)
    };
    
    logger.info('Cleanup completed successfully:', summary);
    return summary;
    
  } catch (error) {
    logger.error('Error during bucket cleanup:', error);
    throw error;
  }
});

/**
 * Helper function to check if a bucket should be deleted based on creation date
 * This can be called from other functions if needed
 */
export const shouldDeleteBucket = (createdAt) => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7;
};
