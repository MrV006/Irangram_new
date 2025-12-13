
/**
 * App Configuration
 * This file centralizes connection settings. 
 */

export const CONFIG = {
  // Toggle this to switch between Local Mock and Real Server (Keep false for Firebase)
  USE_REAL_SERVER: false, 

  // Direct connection - No Proxy
  CLOUDFLARE_PROXY_URL: '',

  // App Info
  APP_NAME: 'ایران‌گرام',
  VERSION: '2.1.0',
  
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
