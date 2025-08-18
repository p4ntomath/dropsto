import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { bucketService } from '../services/bucket.service'
import { fileService } from '../services/file.service'
import { getDaysUntilExpiration, getExpirationStatus, formatFileSize } from '../utils/helpers'
import dropstoLogo from '/dropstoLogoNoText.png'
import potIcon from '../assets/potIcon.png'

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

  // Load bucket and files on component mount
  useEffect(() => {
    loadBucketData()
  }, [bucketId])

  // Enhanced loadBucketData with better error handling
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

      // Load files in the bucket
      const bucketFiles = await fileService.getBucketFiles(bucketId)
      setFiles(bucketFiles)
    } catch (err) {
      console.error('Error loading bucket data:', err)
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
      
      // Add to local state
      setFiles(prev => [...uploadedFileModels, ...prev])
      setShowUploadModal(false)
      
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
    } catch (error) {
      console.error('Upload error:', error)
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
    try {
      await fileService.deleteFile(fileId)
      setFiles(prev => prev.filter(file => file.id !== fileId))
      
      showNotification(
        'success',
        'File Deleted',
        'File has been successfully deleted.',
        []
      )
    } catch (error) {
      console.error('Delete error:', error)
      showNotification(
        'error',
        'Delete Failed',
        error.message,
        []
      )
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
      console.error('Rename error:', error)
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
      console.error('Download error:', error)
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
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Back to Dashboard
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-3">
                <img src={dropstoLogo} alt="DropSto Logo" className="w-8 h-8 object-contain" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{bucket.name}</h1>
                  <p className="text-sm text-gray-500">{bucket.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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
              
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bucket Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${bucket.color} rounded-lg flex items-center justify-center`}>
                <img src={potIcon} alt="Bucket" className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{files.length} files</h2>
                <p className="text-sm text-gray-500">
                  Total size: {bucket.getFormattedSize ? bucket.getFormattedSize() : '0 Bytes'}
                </p>
                <p className={`text-sm font-semibold px-2 py-1 rounded-lg inline-block ${expirationStatus.color}`}>
                  {expirationStatus.text}
                </p>
              </div>
            </div>
            
            {bucket.pinCode && (
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Bucket PIN</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bucket.pinCode)
                    showNotification('success', 'PIN Copied', 'Bucket PIN copied to clipboard', [])
                  }}
                  className="text-lg font-mono font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded border border-blue-200 transition-colors"
                  title="Click to copy PIN"
                >
                  {bucket.pinCode}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Files Section */}
        {files.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
            <p className="text-gray-500 mb-6">Upload your first file to get started</p>
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        ) : (
          <div>
            {/* Files Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-blue-600">
                        {getFileIcon(file.type, "w-8 h-8")}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-1 text-gray-400 hover:text-green-600 rounded"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => startRename(file)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="Rename"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 truncate mb-1" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">{file.getFormattedSize()}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                    {file.downloadCount > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Downloaded {file.downloadCount} time{file.downloadCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Downloads</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="text-blue-600">
                              {getFileIcon(file.type, "w-6 h-6")}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.getFormattedSize()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.downloadCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => downloadFile(file)}
                              className="text-green-600 hover:text-green-700"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => startRename(file)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Upload Modal */}
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
                <p>Maximum file size: 10MB</p>
                <p>Maximum total storage: 30MB</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ...existing modals... */}
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

      {/* Notification Modal */}
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
    </div>
  )
}

export default BucketView