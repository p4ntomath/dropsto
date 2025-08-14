import { motion } from 'framer-motion'

function HeroSection() {
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

  return (
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
            className="text-lg md:text-lg text-white/80 mb-8 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            The most secure and intuitive cloud storage platform. Access your files anywhere, 
            share instantly, and collaborate seamlessly.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={fadeInUp}
          >
            <motion.button 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-base font-semibold hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 shadow-2xl"
              variants={fadeInLeft}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started Free
            </motion.button>
            <motion.button 
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
  )
}

export default HeroSection