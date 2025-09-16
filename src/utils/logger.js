// Environment-based logging
const isProd = import.meta.env.PROD;

class Logger {
  static error(message, error) {
    if (isProd) {
      // In production, you might want to send this to an error tracking service
      // For now, we'll still log errors but only the message
      console.error(message);
    } else {
      console.error(message, error);
    }
  }

  static warn(message, data) {
    if (!isProd) {
      console.warn(message, data);
    }
  }

  static info(message, data) {
    if (!isProd) {
      console.log(message, data);
    }
  }

  static debug(message, data) {
    if (!isProd) {
      console.log('[DEBUG]', message, data);
    }
  }
}

export default Logger;