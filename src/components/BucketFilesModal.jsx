import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fileService } from '../services/file.service'
import { formatFileSize, formatDate } from '../utils/helpers'
import Logger from '../utils/logger.js'
import FilePreviewModal from './FilePreviewModal'

export default function BucketFilesModal({ bucket, isOpen, onClose }) {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [downloadingFiles, setDownloadingFiles] = useState(new Set())
  const [previewFile, setPreviewFile] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && bucket?.id) {
      loadFiles()
    }
  }, [isOpen, bucket?.id])

  const loadFiles = async () => {
    if (!bucket?.id) {
      setError('Invalid bucket')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const bucketFiles = await fileService.getBucketFiles(bucket.id)
      setFiles(bucketFiles)
    } catch (error) {
      Logger.error('Error loading files:', error)
      setError('Failed to load files. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return
    
    await handleUpload(selectedFiles)
  }

  const handleUpload = async (filesToUpload) => {
    setIsUploading(true)
    setError('')
    try {
      await fileService.uploadFiles(filesToUpload, bucket.id, 'pin-user')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      const bucketFiles = await fileService.getBucketFiles(bucket.id)
      setFiles(bucketFiles)
    } catch (error) {
      Logger.error('Error uploading files:', error)
      setError(error.message || 'Failed to upload files. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (file) => {
    if (downloadingFiles.has(file.id)) {
      return
    }

    try {
      setDownloadingFiles(prev => new Set(prev).add(file.id))
      const downloadUrl = await fileService.downloadFileForPinUser(file.id)
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }
      
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      Logger.error('Error downloading file:', error)
      setError('Failed to download file. Please try again.')
    } finally {
      setTimeout(() => {
        setDownloadingFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(file.id)
          return newSet
        })
      }, 2000)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      await handleUpload(droppedFiles)
    }
  }

  const handlePreview = (file) => {
    if (file.isPreviewable()) {
      setPreviewFile(file)
    }
  }

  if (!bucket) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{bucket?.name || 'Bucket'}</h2>
                <p className="text-sm text-gray-500 mt-1">Upload and manage your files</p>
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
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Upload Area */}
            <div className="mt-6">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    'Upload Files'
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-2">or drag and drop files here</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : files.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
                              </svg>
                              <p className="text-sm truncate max-w-[150px]">{file.type.toUpperCase()}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate text-sm" title={file.name}>
                            {file.name}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">{file.getFormattedSize()}</p>
                            <p className="text-xs text-gray-400">{formatDate(file.uploadedAt)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                            disabled={downloadingFiles.has(file.id)}
                            className="p-2 text-gray-400 hover:text-green-600 rounded transition-colors"
                            title="Download"
                          >
                            {downloadingFiles.has(file.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.isPreviewable() && (
                          <button
                            onClick={() => handlePreview(file)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(file)}
                          disabled={downloadingFiles.has(file.id)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingFiles.has(file.id) ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                              <span>Downloading...</span>
                            </div>
                          ) : (
                            'Download'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center text-gray-500 py-4">
                No files uploaded yet
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
      />
    </AnimatePresence>
  )
}