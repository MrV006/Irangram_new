
/**
 * App Configuration
 * This file centralizes connection settings. 
 * Switch `USE_REAL_SERVER` to true when you have a Node.js/Python backend ready.
 */

export const CONFIG = {
  // Toggle this to switch between Local Mock and Real Server
  USE_REAL_SERVER: false, 

  // Your Backend URL (e.g., http://localhost:5000 or https://api.mydomain.com)
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // Socket URL for real-time features
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',

  // App Info
  APP_NAME: 'ایران‌گرام',
  VERSION: '1.8.0',
  
  // SUPER ADMIN EMAILS
  OWNER_EMAIL: 'amirrezaveisi45@gmail.com',
  DEVELOPER_EMAIL: 'developer.irangram@gmail.com'
};

export const ENDPOINTS = {
  LOGIN: '/auth/login',
  MESSAGES: '/messages',
  CONTACTS: '/contacts',
  UPLOAD: '/upload'
};
