import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { bucketService } from '../services/bucket.service'
import BucketFilesModal from './BucketFilesModal'
import copyIcon from '../assets/copy.svg'

function HeroSection() {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBucket, setSelectedBucket] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }

  const fadeInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.8,
        delay: 0.2
      }
    }
  }

  const fadeInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.8,
        delay: 0.4
      }
    }
  }

  const handlePinChange = (e) => {
    let value = e.target.value
    
    // Remove any non-alphanumeric characters except hyphens
    value = value.replace(/[^a-zA-Z0-9-]/g, '')
    
    // Auto-format: if user starts typing without "drop-", add it
    if (value && !value.toLowerCase().startsWith('drop-')) {
      if (value.toLowerCase().startsWith('drop')) {
        // Replace the "drop" part with lowercase "drop-"
        value = 'drop-' + value.substring(4).replace(/^-+/, '')
      } else {
        value = 'drop-' + value.replace(/^-+/, '')
      }
    } else if (value.toLowerCase().startsWith('drop-')) {
      // Ensure the prefix is lowercase but keep the rest as-is
      value = 'drop-' + value.substring(5)
    }
    
    // Limit to correct format: drop-XXXX or legacy drop-XXXXXXXX
    if (value.length > 13) {
      value = value.substring(0, 13)
    }
    
    setPin(value)
    if (pinError) setPinError('') // Clear error when user starts typing
  }

  const handleRetrieveFiles = async () => {
    if (!pin.trim()) {
      setPinError('Please enter a PIN code')
      return
    }

    // Check if it matches either format (drop-XXXX or drop-XXXXXXXX)
    const isValidFormat = /^drop-[A-Z0-9]{4}$/.test(pin) || /^drop-[A-Z0-9]{8}$/.test(pin)
    if (!isValidFormat) {
      setPinError('Please enter a valid PIN code')
      return
    }
    
    setIsLoading(true)
    setPinError('')
    
    try {
      // Use bucket service to find bucket by PIN
      const bucket = await bucketService.getBucketByPin(pin.trim())
      
      if (bucket) {
        // PIN is valid, show bucket files in modal
        setSelectedBucket(bucket)
        setIsModalOpen(true)
        setPin('') // Clear the PIN input
      } else {
        setPinError('Invalid PIN code. Please check and try again.')
      }
    } catch (error) {
      console.error('Error retrieving bucket:', error)
      setPinError('Error accessing bucket. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBucket(null)
  }

  const handlePinKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRetrieveFiles()
    }
  }

  const handleGetStarted = () => {
    if (user) {
      // User is already authenticated, redirect to home
      navigate('/home')
    } else {
      // User is not authenticated, redirect to auth page
      navigate('/auth')
    }
  }

  const handleWatchDemo = () => {
    window.open('https://www.youtube.com/watch?v=B-6DVxK2wAc', '_blank')
  }

  return (
    <>
      <section className="relative overflow-hidden pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative z-10">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold text-white mb-6"
              variants={fadeInUp}
            >
              Store. Share.
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Simplify.
              </span>
            </motion.h1>
            <motion.p 
              className="text-lg md:text-lg text-white/80 mb-12 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              The most secure and intuitive cloud storage platform. Access your files anywhere, 
              share instantly, and collaborate seamlessly.
            </motion.p>
                    {/* Enhanced PIN Input Section */}
            <motion.div 
              className="max-w-lg mx-auto mb-8"
              variants={fadeInUp}
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-500/20 rounded-full mb-4">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Access Your Files</h3>
                    <p className="text-white/70 text-sm">Enter your unique PIN to view and manage your bucket</p>
                  </div>

                  {/* PIN Input with Enhanced Styling */}
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        value={pin}
                        onChange={handlePinChange}
                        onKeyPress={handlePinKeyPress}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        placeholder="drop-XXXX"
                        className={`w-full bg-white/10 border-2 rounded-lg px-4 py-4 text-white placeholder-white/40 focus:outline-none text-center text-xl font-mono tracking-wider transition-all duration-300 ${
                          isInputFocused 
                            ? 'border-cyan-400 ring-4 ring-cyan-400/20 bg-white/15' 
                            : pinError 
                              ? 'border-red-400 bg-red-500/10' 
                              : 'border-white/30 hover:border-white/50'
                        }`}
                        maxLength={13}
                      />
                      
                      {/* PIN Format Indicator */}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {pin.length === 9 || pin.length === 13 ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : pin.length > 0 ? (
                          <div className="text-white/50 text-sm font-mono">
                            {pin.length}/{pin.length > 9 ? '13' : '9'}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    
                    {/* Format Help Text */}
                    {!pin && !isInputFocused && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-white/50 text-xs text-center"
                      >
                        Format: drop-XXXX (or drop-XXXXXXXX for legacy PINs)
                      </motion.div>
                    )}

                    {/* Error Display */}
                    {pinError && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-300 text-sm">{pinError}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleRetrieveFiles}
                    disabled={!pin.trim() || (pin.length !== 9 && pin.length !== 13) || isLoading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-lg text-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Accessing Bucket...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
                        </svg>
                        <span>Access Files</span>
                      </div>
                    )}
                  </button>

                  {/* Info Section */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Features</div>
                        <div className="text-white text-sm">View & Download</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Upload</div>
                        <div className="text-white text-sm">Add New Files</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              variants={fadeInUp}
            >
              <motion.button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-base font-semibold hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                variants={fadeInLeft}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </motion.button>
              <motion.button 
                onClick={handleWatchDemo}
                className="border-2 border-white/30 text-white px-4 py-2 rounded-xl text-base font-semibold hover:bg-white/10 transition-colors"
                variants={fadeInRight}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Watch Demo
              </motion.button>
            </motion.div>
          </div>
          
          {/* Floating Elements with animations */}
          <motion.div 
            className="absolute top-20 left-10 w-20 h-20 bg-cyan-400/20 rounded-full"
            animate={{ 
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          ></motion.div>
          <motion.div 
            className="absolute top-40 right-10 w-32 h-32 bg-blue-400/20 rounded-full"
            animate={{ 
              y: [0, 30, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          ></motion.div>
          <motion.div 
            className="absolute bottom-20 left-1/4 w-16 h-16 bg-white/10 rounded-full"
            animate={{ 
              y: [0, -15, 0],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          ></motion.div>
        </div>
      </section>

      {/* Bucket Files Modal */}
      <BucketFilesModal 
        bucket={selectedBucket}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}

export default HeroSection