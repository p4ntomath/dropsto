/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");

// Initialize Firebase Admin
initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * Scheduled function that runs daily at midnight UTC to clean up expired buckets
 * Buckets older than 7 days are automatically deleted along with their files
 */
exports.cleanupExpiredBuckets = onSchedule("0 0 * * *", async (event) => {
  const db = getFirestore();
  const storage = getStorage();
  
  // Calculate the cutoff date (7 days ago)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString();
  
  logger.info(`Starting cleanup of buckets created before: ${cutoffDate}`);
  
  try {
    // Find expired buckets (created more than 7 days ago and still active)
    const expiredBucketsQuery = await db.collection('buckets')
      .where('createdAt', '<=', cutoffDate)
      .where('isActive', '==', true)
      .get();
    
    if (expiredBucketsQuery.empty) {
      logger.info('No expired buckets found');
      return null;
    }
    
    logger.info(`Found ${expiredBucketsQuery.docs.length} expired buckets to clean up`);
    
    const batch = db.batch();
    let totalFilesDeleted = 0;
    let totalStorageFreed = 0;
    
    for (const bucketDoc of expiredBucketsQuery.docs) {
      const bucketId = bucketDoc.id;
      const bucketData = bucketDoc.data();
      
      logger.info(`Processing bucket: ${bucketData.name} (ID: ${bucketId})`);
      
      try {
        // Find all files in this bucket
        const filesQuery = await db.collection('files')
          .where('bucketId', '==', bucketId)
          .where('isActive', '==', true)
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
              // Log storage deletion errors but continue with cleanup
              logger.warn(`Failed to delete file from storage: ${fileData.storagePath}`, storageError);
            }
          }
          
          // Mark file as deleted in Firestore
          batch.update(fileDoc.ref, { 
            isActive: false,
            deletedAt: new Date().toISOString(),
            deletedReason: 'bucket_expired'
          });
          
          totalFilesDeleted++;
        }
        
        // Mark bucket as deleted
        batch.update(bucketDoc.ref, { 
          isActive: false,
          deletedAt: new Date().toISOString(),
          deletedReason: 'expired_7_days'
        });
        
        logger.info(`Prepared deletion for bucket: ${bucketData.name} with ${filesQuery.docs.length} files`);
        
      } catch (bucketError) {
        logger.error(`Error processing bucket ${bucketId}:`, bucketError);
        // Continue with other buckets even if one fails
      }
    }
    
    // Commit all deletions in a single batch
    await batch.commit();
    
    const summary = {
      bucketsDeleted: expiredBucketsQuery.docs.length,
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
exports.shouldDeleteBucket = (createdAt) => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7;
};
