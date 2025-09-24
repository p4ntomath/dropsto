import { motion, AnimatePresence } from 'framer-motion'
import React, { useState } from 'react'

export default function FilePreviewModal({ file, isOpen, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !file) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    
    // Create a download link
    const link = document.createElement('a');
    link.href = file.downloadURL;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset download state after a short delay
    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 backdrop-blur-sm bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-6xl w-full mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with file info */}
          <div className="p-4 bg-white/10 backdrop-blur-md flex items-center justify-between border-b border-white/20">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-white truncate">{file.name}</h3>
              <span className="text-sm text-white/70">{file.getFormattedSize()}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </>
                )}
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div className="relative bg-black/90 flex-1 flex items-center justify-center min-h-0">
            {file.isVideo() ? (
              <video
                className="max-h-[calc(90vh-8rem)] w-auto"
                controls
                src={file.downloadURL}
                autoPlay={false}
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            ) : file.isImage() ? (
              <img
                src={file.downloadURL}
                alt={file.name}
                className="max-h-[calc(90vh-8rem)] w-auto object-contain"
                onContextMenu={e => e.preventDefault()} // Prevent right-click save
              />
            ) : null}
          </div>

          {/* Footer with metadata */}
          <div className="p-4 bg-white/10 backdrop-blur-md border-t border-white/20">
            <div className="flex justify-between items-center">
              <div className="text-sm text-white/70">
                <p>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</p>
                {file.downloadCount > 0 && (
                  <p>Downloaded {file.downloadCount} time{file.downloadCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="text-sm text-white/50">
                Press ESC to close
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}