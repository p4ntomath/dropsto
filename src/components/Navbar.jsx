import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function Navbar({ isMenuOpen, setIsMenuOpen }) {
  return (
    <>
      <nav className="relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 flex items-center justify-center">
                <img 
                  src="/dropstoLogoNoText.png" 
                  alt="DropSto Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-white">DropSto</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-white/80 text-md hover:text-white transition-colors">How To Use</a>
              <Link 
                to="/auth" 
                className="bg-white/20 text-white text-md px-4 py-1 rounded-lg hover:bg-white/30 transition-colors"
              >
                Sign In
              </Link>
            </div>

            <button 
              className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/20"
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col space-y-4">
              <a 
                href="#features" 
                className="text-white/80 text-lg hover:text-white transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                How To Use
              </a>
              <Link 
                to="/auth" 
                className="bg-white/20 text-white text-lg px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}

export default Navbar