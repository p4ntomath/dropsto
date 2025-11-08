// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import FeaturesSection from '../components/FeaturesSection'

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [vantaEffect, setVantaEffect] = useState(null)
  const vantaRef = useRef(null)

  useEffect(() => {
    if (!vantaEffect && vantaRef.current && window.VANTA) {
      setVantaEffect(
        window.VANTA.BIRDS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          color1: 0x9333ea, // Purple theme for v6
          color2: 0xc084fc, // Secondary purple
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          backgroundColor: 0x4c1d95 // Deep purple background
        })
      )
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3
      }
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" ref={vantaRef}>
      <div className="relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
          <HeroSection />
          <FeaturesSection />
        </motion.div>
      </div>
    </div>
  )
}

export default LandingPage