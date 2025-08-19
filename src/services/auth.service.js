import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config.js'
import { User } from '../models/user.model.js'

/**
 * Authentication Service - Handles all Firebase Auth operations
 */
export class AuthService {
  constructor() {
    this.currentUser = null
    this.authListeners = []
    this.initialized = false
    this.init()
  }

  /**
   * Initialize the auth service
   */
  async init() {
    try {
      // Set persistence to local storage
      await setPersistence(auth, browserLocalPersistence)
      this.initialized = true
    } catch (error) {
      console.error('Error setting auth persistence:', error)
      throw error
    }
  }

  /**
   * Listen for authentication state changes
   * @param {function} callback - Function to call when auth state changes
   * @returns {function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      this.currentUser = firebaseUser ? new User(firebaseUser) : null
      callback(this.currentUser)
    })

    this.authListeners.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Sign in with Google
   * @returns {Promise<User>} Authenticated user
   */
  async signInWithGoogle() {
    try {
      if (!this.initialized) {
        await this.init()
      }
      
      const result = await signInWithPopup(auth, googleProvider)
      this.currentUser = new User(result.user)
      return this.currentUser
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw this.handleAuthError(error)
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      await signOut(auth)
      this.currentUser = null
    } catch (error) {
      console.error('Sign out error:', error)
      throw this.handleAuthError(error)
    }
  }

  /**
   * Get current authenticated user
   * @returns {User|null}
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser
  }

  /**
   * Handle authentication errors with user-friendly messages
   * @param {Error} error - Firebase auth error
   * @returns {Error} Formatted error
   */
  handleAuthError(error) {
    const errorMessages = {
      'auth/user-disabled': 'Your account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups and try again.',
      'auth/api-key-not-valid': 'Firebase configuration error. Please check your API key.'
    }

    const message = errorMessages[error.code] || error.message || 'An unexpected error occurred.'
    return new Error(message)
  }

  /**
   * Clean up listeners when service is destroyed
   */
  destroy() {
    this.authListeners.forEach(unsubscribe => unsubscribe())
    this.authListeners = []
  }
}

// Create singleton instance
export const authService = new AuthService()