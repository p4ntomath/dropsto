import { Link } from 'react-router-dom'

function Navbar({ isMenuOpen, setIsMenuOpen }) {
  return (
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
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar