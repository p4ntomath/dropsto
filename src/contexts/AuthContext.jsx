import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/auth.service.js'
import Logger from '../utils/logger.js'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Listen for authentication state changes using the service
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Sign in with Google using the service
  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)
      const user = await authService.signInWithGoogle()
      return user
    } catch (error) {
      Logger.error('Login error:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      Logger.error('Logout error:', error)
    }
  }

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    logout: signOut,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext