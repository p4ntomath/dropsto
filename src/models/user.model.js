/**
 * User Model - Represents a Firebase Auth user
 */
export class User {
  constructor(firebaseUser) {
    this.uid = firebaseUser?.uid || null
    this.email = firebaseUser?.email || null
    this.displayName = firebaseUser?.displayName || null
    this.photoURL = firebaseUser?.photoURL || null
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.uid
  }

  /**
   * Get user's initials for avatar
   * @returns {string}
   */
  getInitials() {
    if (this.displayName) {
      return this.displayName.charAt(0).toUpperCase()
    }
    if (this.email) {
      return this.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  /**
   * Convert to plain object for storage
   * @returns {object}
   */
  toJSON() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      photoURL: this.photoURL
    }
  }

  /**
   * Create User instance from plain object
   * @param {object} data
   * @returns {User}
   */
  static fromJSON(data) {
    const user = new User()
    user.uid = data.uid
    user.email = data.email
    user.displayName = data.displayName
    user.photoURL = data.photoURL
    return user
  }
}