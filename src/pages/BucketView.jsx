import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { bucketService } from '../services/bucket.service'
import { fileService } from '../services/file.service'
import FilePreviewModal from '../components/FilePreviewModal'
import { 
  getDaysUntilExpiration, 
  getExpirationStatus, 
  formatDate, 
  showTooltip 
} from '../utils/helpers'
import potIcon from '../assets/potIcon.png'
import Logger from '../utils/logger.js'

function BucketView() {
  const { bucketId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  
  // State management
  const [bucket, setBucket] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingFileId, setDeletingFileId] = useState(null) // Track which file is being deleted
  const [bucketPin, setBucketPin] = useState(null)
  const [copyingPin, setCopyingPin] = useState(false)
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationData, setNotificationData] = useState({
    type: 'success',
    title: '',
    message: '',
    details: []
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [newFileName, setNewFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [showDeleteBucketModal, setShowDeleteBucketModal] = useState(false)
  const [deletingBucket, setDeletingBucket] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)

  // Load bucket and files on component mount
  useEffect(() => {
    loadBucketData()
  }, [bucketId])

  // Enhanced loadBucketData with PIN retrieval
  const loadBucketData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load bucket information
      const bucketData = await bucketService.getBucketById(bucketId)
      if (!bucketData) {
        setError('Bucket not found')
        return
      }
      setBucket(bucketData)

      // Load bucket PIN if owned
      if (bucketData.isOwned) {
        const pin = await bucketData.getPinCode()
        setBucketPin(pin)
      }

      // Load files in the bucket
      const bucketFiles = await fileService.getBucketFiles(bucketId)
      setFiles(bucketFiles)
    } catch (err) {
      Logger.error('Error loading bucket data:', err)
      setError(err.message || 'Failed to load bucket data')
    } finally {
      setLoading(false)
    }
  }

  // Show notification modal
  const showNotification = (type, title, message, details = []) => {
    setNotificationData({ type, title, message, details })
    setShowNotificationModal(true)
  }

  // Handle file upload using the service
  const handleFileUpload = async (uploadedFiles) => {
    if (!uploadedFiles.length) return

    try {
      setUploading(true)
      
      // Upload files using the service (includes validation)
      const uploadedFileModels = await fileService.uploadFiles(uploadedFiles, bucketId, user.uid)
      
      // Only show success if files were actually uploaded
      if (uploadedFileModels.length > 0) {
        // Add to local state
        setFiles(prev => [...uploadedFileModels, ...prev])
        setShowUploadModal(false)
        
        // Refresh bucket data to get updated storage info
        await refreshBucketData()
        
        // Show success notification
        const totalSize = Array.from(uploadedFiles).reduce((total, file) => total + file.size, 0)
        const uploadedSizeMB = (totalSize / (1024 * 1024)).toFixed(1)
        
        showNotification(
          'success',
          'Upload Successful!',
          `Successfully uploaded ${uploadedFileModels.length} file${uploadedFileModels.length > 1 ? 's' : ''}.`,
          [
            `Added: ${uploadedSizeMB}MB`,
            `Files uploaded: ${uploadedFileModels.map(f => f.name).join(', ')}`
          ]
        )
      } else {
        // Show error if no files were uploaded
        showNotification(
          'error',
          'Upload Failed',
          'No files were successfully uploaded. Please check the errors and try again.',
          []
        )
      }
    } catch (error) {
      Logger.error('Upload error:', error)
      showNotification(
        'error',
        'Upload Failed',
        error.message,
        []
      )
    } finally {
      setUploading(false)
    }
  }

  // Delete file using the service
  const deleteFile = async (fileId) => {
    // Prevent double-clicks by checking if this file is already being deleted
    if (deletingFileId === fileId) return
    
    try {
      setDeletingFileId(fileId) // Set loading state for this specific file
      await fileService.deleteFile(fileId)
      setFiles(prev => prev.filter(file => file.id !== fileId))
      
      // Refresh bucket data to get updated storage info
      await refreshBucketData()
      
      showNotification(
        'success',
        'File Deleted',
        'File has been successfully deleted.',
        []
      )
    } catch (error) {
      Logger.error('Delete error:', error)
      showNotification(
        'error',
        'Delete Failed',
        error.message,
        []
      )
    } finally {
      setDeletingFileId(null) // Clear loading state
    }
  }

  // Refresh bucket data helper function
  const refreshBucketData = async () => {
    try {
      // Clear cache for this specific bucket to force fresh data
      bucketService.buckets.delete(bucketId)
      
      const updatedBucket = await bucketService.getBucketById(bucketId)
      if (updatedBucket) {
        setBucket(updatedBucket)
      }
    } catch (error) {
      Logger.error('Error refreshing bucket data:', error)
    }
  }

  // Rename file using the service
  const renameFile = async () => {
    if (!newFileName.trim() || !selectedFile) return

    try {
      const updatedFile = await fileService.renameFile(selectedFile.id, newFileName.trim())
      
      // Update local state
      setFiles(prev => prev.map(file => 
        file.id === selectedFile.id ? updatedFile : file
      ))
      
      setShowRenameModal(false)
      setSelectedFile(null)
      setNewFileName('')
      
      showNotification(
        'success',
        'File Renamed',
        `File renamed to "${newFileName.trim()}" successfully.`,
        []
      )
    } catch (error) {
      Logger.error('Rename error:', error)
      showNotification(
        'error',
        'Rename Failed',
        error.message,
        []
      )
    }
  }

  // Download file using the service
  const downloadFile = async (file) => {
    try {
      const downloadURL = await fileService.downloadFile(file.id)
      
      // Create download link
      const link = document.createElement('a')
      link.href = downloadURL
      link.download = file.name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showNotification(
        'success',
        'Download Started',
        `Download started for "${file.name}".`,
        []
      )
    } catch (error) {
      Logger.error('Download error:', error)
      showNotification(
        'error',
        'Download Failed',
        error.message,
        []
      )
    }
  }

  // Start rename process
  const startRename = (file) => {
    setSelectedFile(file)
    setNewFileName(file.name)
    setShowRenameModal(true)
  }

  // Delete bucket function
  const deleteBucket = async () => {
    if (!bucket || !bucket.isOwned) {
      showNotification('error', 'Permission Denied', 'You can only delete buckets you own.', [])
      return
    }

    try {
      setDeletingBucket(true)
      
      // Delete all files in the bucket first
      await fileService.deleteAllBucketFiles(bucketId, true)
      
      // Delete the bucket
      await bucketService.deleteBucket(bucketId)
      
      showNotification(
        'success',
        'Bucket Deleted',
        `Bucket "${bucket.name}" has been permanently deleted along with all its files.`,
        []
      )
      
      // Navigate back to homepage after a short delay
      setTimeout(() => {
        navigate('/home')
      }, 2000)
      
    } catch (error) {
      Logger.error('Delete bucket error:', error)
      showNotification(
        'error',
        'Delete Failed',
        error.message || 'Failed to delete bucket. Please try again.',
        []
      )
    } finally {
      setDeletingBucket(false)
      setShowDeleteBucketModal(false)
    }
  }

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  // Handle PIN copy with visual feedback
  const handleCopyPin = async (e) => {
    if (!bucketPin || copyingPin) return
    
    try {
      setCopyingPin(true)
      await navigator.clipboard.writeText(bucketPin)
      showTooltip(e.pageX, e.pageY, 'PIN copied!')
    } catch (err) {
      Logger.error('Failed to copy PIN:', err)
    } finally {
      setCopyingPin(false)
    }
  }

  // File type icons
  const getFileIcon = (type, className = "w-6 h-6") => {
    const fileIcons = {
      pdf: (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M8,2V6H16V2H8M16,8V22H8V8H16M18,8V6A2,2 0 0,0 16,4V0H8V4A2,2 0 0,0 6,6V8H4V10H6V22A2,2 0 0,0 8,24H16A2,2 0 0,0 18,22V10H20V8H18Z" />
        </svg>
      ),
      jpg: (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,16L8.5,12.5L11,15.5L14.5,11L19,16H5Z" />
        </svg>
      ),
      png: (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,16L8.5,12.5L11,15.5L14.5,11L19,16H5Z" />
        </svg>
      ),
      default: (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
        </svg>
      )
    }
    return fileIcons[type] || fileIcons.default
  }

  // Add this new function to handle preview
  const handlePreview = (file) => {
    if (file.isPreviewable()) {
      setPreviewFile(file)
    } else {
      showNotification(
        'error',
        'Preview Not Available',
        'This file type does not support preview.',
        []
      )
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bucket...</p>
        </div>
      </div>
    )
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Bucket
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={loadBucketData}
              disabled={loading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </button>
            
            <button
              onClick={() => navigate('/home')}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!bucket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bucket Not Found</h2>
          <p className="text-gray-600 mb-4">The requested bucket could not be found.</p>
          <button
            onClick={() => navigate('/home')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    )
  }

  const daysLeft = getDaysUntilExpiration(bucket.createdAt)
  const expirationStatus = getExpirationStatus(daysLeft)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 py-4 sm:py-0 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <img src="/dropstoLogoNoText.png" alt="DropSto Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{bucket.name}</h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{bucket.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9,5V9H21V5M9,19H21V15H9M9,14H21V10H9M4,9H8V5H4M4,19H8V15H4M4,14H8V10H4V14Z" />
                  </svg>
                </button>
              </div>
              
              {/* Delete Bucket Button - Only show if user owns the bucket */}
              {bucket && bucket.isOwned && (
                <button
                  onClick={() => setShowDeleteBucketModal(true)}
                  className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                  title="Delete Bucket"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={uploading}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Bucket Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r ${bucket.color} rounded-lg flex items-center justify-center`}>
                <img src={potIcon} alt="Bucket" className="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <div>
                <h2 className="text-base lg:text-lg font-semibold text-gray-900">{files.length} files</h2>
                <p className="text-sm text-gray-500">
                  Total size: {bucket.getFormattedSize ? bucket.getFormattedSize() : '0 Bytes'}
                </p>
                <p className={`text-xs lg:text-sm font-semibold px-2 py-1 rounded-lg inline-block ${expirationStatus.color} mt-1`}>
                  {expirationStatus.text}
                </p>
              </div>
            </div>
            
            {bucketPin && (
              <div className="text-left lg:text-right">
                <p className="text-sm text-gray-500 mb-1">Bucket PIN</p>
                <button
                  onClick={handleCopyPin}
                  disabled={copyingPin}
                  className="text-base lg:text-lg font-mono font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded border border-blue-200 transition-colors flex items-center space-x-2"
                  title="Click to copy PIN"
                >
                  <span>{bucketPin}</span>
                  {copyingPin ? (
                    <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 text-blue-600/50 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Files Section */}
        {files.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-8 lg:p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <svg className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
            <p className="text-sm lg:text-base text-gray-500 mb-6">Upload your first file to get started</p>
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={uploading}
              className="bg-blue-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        ) : (
          <div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
                    onClick={() => file.isPreviewable() && handlePreview(file)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Preview Area */}
                    <div className="aspect-video relative bg-gray-100 flex items-center justify-center">
                      {file.isImage() ? (
                        <img
                          src={file.downloadURL}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : file.isVideo() ? (
                        <div className="w-full h-full relative">
                          <video
                            src={file.downloadURL}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg className="w-12 h-12 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center p-4">
                            {getFileIcon(file.type, "w-12 h-12 mx-auto mb-2")}
                            <p className="text-sm truncate max-w-[150px]">{file.type.toUpperCase()}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base" title={file.name}>
                          {file.name}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">{file.getFormattedSize()}</p>
                          <p className="text-xs text-gray-400">{formatDate(file.uploadedAt)}</p>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 rounded"
                            title="Download"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(file);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Rename"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.id);
                            }}
                            disabled={deletingFileId === file.id}
                            className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingFileId === file.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      {file.downloadCount > 0 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Downloaded {file.downloadCount} time{file.downloadCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Mobile-friendly table with horizontal scroll */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Downloads</th>
                        <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {files.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.getFormattedSize()}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(file.uploadedAt)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.downloadCount || 0}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                              {(file.type === 'image' || file.type === 'video' || 
                                file.mimeType?.startsWith('image/') || file.mimeType?.startsWith('video/')) && (
                                <button
                                  onClick={() => handlePreview(file)}
                                  className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs lg:text-sm"
                                >
                                  Preview
                                </button>
                              )}
                              <button
                                onClick={() => downloadFile(file)}
                                className="text-green-600 hover:text-green-700 px-2 py-1 text-xs lg:text-sm"
                              >
                                Download
                              </button>
                              <button
                                onClick={() => startRename(file)}
                                className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs lg:text-sm"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => deleteFile(file.id)}
                                disabled={deletingFileId === file.id}
                                className="text-red-600 hover:text-red-700 px-2 py-1 text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                              >
                                {deletingFileId === file.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  <span>Delete</span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Upload Files</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 mb-4">Drag and drop files here, or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Browse Files'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <div className="mt-4 text-xs text-gray-500">
                <p>Maximum total storage: 50MB per user</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Rename File</h2>
              <button
                onClick={() => setShowRenameModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && renameFile()}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={renameFile}
                disabled={!newFileName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rename
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showNotificationModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${notificationData.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {notificationData.title}
              </h2>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">{notificationData.message}</p>
              {notificationData.details.length > 0 && (
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {notificationData.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteBucketModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-red-600">Delete Bucket</h2>
              <button
                onClick={() => setShowDeleteBucketModal(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={deletingBucket}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Warning: This action cannot be undone</h3>
                  <p className="text-sm text-red-700">All files in this bucket will be permanently deleted</p>
                </div>
              </div>

              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the bucket <strong>"{bucket?.name}"</strong>?
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    • <strong>{files.length}</strong> file{files.length !== 1 ? 's' : ''} will be permanently deleted
                  </p>
                  <p className="text-sm text-gray-600">
                    • Total storage: <strong>{bucket?.getFormattedSize ? bucket.getFormattedSize() : '0 Bytes'}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    • PIN: <strong>{bucket?.pinCode}</strong> will become invalid
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteBucketModal(false)}
                disabled={deletingBucket}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteBucket}
                disabled={deletingBucket}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {deletingBucket ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Bucket</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  )
}

export default BucketView