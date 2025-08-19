import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fileService } from '../services/file.service'
import { formatFileSize, formatDate } from '../utils/helpers'

function BucketFilesModal({ bucket, isOpen, onClose }) {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && bucket) {
      loadFiles()
    }
  }, [isOpen, bucket])

  const loadFiles = async () => {
    setIsLoading(true)
    setError('')
    try {
      const bucketFiles = await fileService.getBucketFiles(bucket.id)
      setFiles(bucketFiles)
    } catch (error) {
      console.error('Error loading files:', error)
      setError('Failed to load files. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setUploadFiles(selectedFiles)
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return

    setIsUploading(true)
    setError('')
    try {
      await fileService.uploadFiles(uploadFiles, bucket.id, 'pin-user')
      setUploadFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadFiles() // Refresh file list
    } catch (error) {
      console.error('Error uploading files:', error)
      setError('Failed to upload files. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (file) => {
    try {
      const downloadUrl = await fileService.downloadFile(file.id)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
      setError('Failed to download file. Please try again.')
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

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      setUploadFiles(droppedFiles)
    }
  }

  const removeUploadFile = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

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
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{bucket?.name || 'Bucket Files'}</h2>
                <p className="text-white/80 mt-1">
                  PIN: {bucket?.pinCode} • {files.length} files
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Upload Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Upload Files</h3>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-cyan-500 bg-cyan-50' 
                    : 'border-gray-300 hover:border-cyan-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-gray-600">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium">Drop files here or click to select</p>
                  <p className="text-sm text-gray-500 mt-1">Upload multiple files at once</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 bg-cyan-500 text-white px-6 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Select Files
                </button>
              </div>

              {/* Upload Queue */}
              {uploadFiles.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Files to Upload ({uploadFiles.length})</h4>
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Upload All'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">📄</div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeUploadFile(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Files List */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Files in Bucket</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">No files in this bucket yet</p>
                  <p className="text-sm">Upload some files to get started</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">
                          {file.type?.startsWith('image/') ? '🖼️' :
                           file.type?.startsWith('video/') ? '🎥' :
                           file.type?.startsWith('audio/') ? '🎵' :
                           file.type?.includes('pdf') ? '📄' :
                           file.type?.includes('document') ? '📝' :
                           file.type?.includes('spreadsheet') ? '📊' :
                           file.type?.includes('presentation') ? '📽️' :
                           '📄'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{file.name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                          </p>
                          {file.downloadCount > 0 && (
                            <p className="text-xs text-gray-400">
                              Downloaded {file.downloadCount} times
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Download
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BucketFilesModal