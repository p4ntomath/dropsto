import { useState, useEffect, useCallback } from 'react'
import { bucketService } from '../services/bucket.service.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Custom hook for managing buckets
 */
export const useBuckets = () => {
  const { user } = useAuth()
  const [buckets, setBuckets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load user's buckets with retry mechanism
  const loadBuckets = useCallback(async (retryCount = 0) => {
    if (!user?.uid) {
      setBuckets([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - Please check your internet connection and try again')), 15000)
      )

      // Run both bucket queries in parallel for faster loading
      const bucketsPromise = Promise.all([
        bucketService.getUserBuckets(user.uid),
        bucketService.getSharedBuckets(user.email)
      ])

      const [ownedBuckets, sharedBuckets] = await Promise.race([
        bucketsPromise,
        timeoutPromise
      ])

      // Combine and sort buckets
      const allBuckets = [
        ...ownedBuckets.map(bucket => ({ ...bucket, isOwned: true })),
        ...sharedBuckets.map(bucket => ({ ...bucket, isOwned: false }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setBuckets(allBuckets)
    } catch (err) {
      console.error('Error loading buckets:', err)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load buckets. Please try again.'
      
      if (err.message.includes('timeout')) {
        errorMessage = 'Loading buckets is taking too long. Please check your internet connection and try again.'
      } else if (err.message.includes('permission')) {
        errorMessage = 'Authentication expired. Please sign in again to access your buckets.'
      } else if (err.message.includes('indexes')) {
        errorMessage = 'Database is being set up. Please wait a moment and try again.'
      } else if (err.code === 'unavailable') {
        errorMessage = 'Database is temporarily unavailable. Please try again in a moment.'
      }
      
      setError(errorMessage)
      
      // Set empty buckets on error to show the UI
      setBuckets([])
    } finally {
      setLoading(false)
    }
  }, [user?.uid, user?.email])

  // Retry loading buckets (useful for error recovery)
  const retryLoadBuckets = useCallback(() => {
    loadBuckets(0)
  }, [loadBuckets])

  // Create a new bucket
  const createBucket = useCallback(async (bucketData) => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    try {
      const newBucket = await bucketService.createBucket({
        ...bucketData,
        ownerEmail: user.email,
        owner: user.displayName || user.email,
        collaborators: [user.email]
      }, user.uid)

      // Add to local state
      setBuckets(prev => [{ ...newBucket, isOwned: true }, ...prev])
      
      return newBucket
    } catch (err) {
      console.error('Error creating bucket:', err)
      setError(err.message)
      throw err
    }
  }, [user])

  // Delete a bucket
  const deleteBucket = useCallback(async (bucketId) => {
    try {
      await bucketService.deleteBucket(bucketId)
      
      // Remove from local state
      setBuckets(prev => prev.filter(bucket => bucket.id !== bucketId))
    } catch (err) {
      console.error('Error deleting bucket:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Update a bucket
  const updateBucket = useCallback(async (bucketId, updates) => {
    try {
      const updatedBucket = await bucketService.updateBucket(bucketId, updates)
      
      // Update local state
      setBuckets(prev => prev.map(bucket => 
        bucket.id === bucketId ? { ...updatedBucket, isOwned: bucket.isOwned } : bucket
      ))
      
      return updatedBucket
    } catch (err) {
      console.error('Error updating bucket:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Get bucket by PIN
  const getBucketByPin = useCallback(async (pinCode) => {
    try {
      setError(null)
      const bucket = await bucketService.getBucketByPin(pinCode)
      return bucket
    } catch (err) {
      console.error('Error getting bucket by PIN:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Filter buckets by ownership
  const getOwnedBuckets = useCallback(() => {
    return buckets.filter(bucket => bucket.isOwned)
  }, [buckets])

  const getSharedBuckets = useCallback(() => {
    return buckets.filter(bucket => !bucket.isOwned)
  }, [buckets])

  // Load buckets when user changes
  useEffect(() => {
    loadBuckets()
  }, [loadBuckets])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return {
    buckets,
    loading,
    error,
    createBucket,
    deleteBucket,
    updateBucket,
    getBucketByPin,
    getOwnedBuckets,
    getSharedBuckets,
    refreshBuckets: loadBuckets,
    clearError: () => setError(null),
    retryLoadBuckets
  }
}