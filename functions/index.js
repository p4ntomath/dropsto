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
 * Scheduled function that runs daily at midnight UTC to clean up expired and inactive buckets
 * - Buckets older than 7 days are automatically deleted along with their files
 * - Inactive buckets older than 24 hours are permanently deleted
 */
exports.cleanupBuckets = onSchedule("0 0 * * *", async (event) => {
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
exports.shouldDeleteBucket = (createdAt) => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7;
};
