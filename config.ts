
/**
 * App Configuration
 * This file centralizes connection settings. 
 */

const DEFAULT_PROXY = 'https://irangram-proxy.amirrezaveisi45.workers.dev';

export const CONFIG = {
  // Toggle this to switch between Local Mock and Real Server (Keep false for Firebase)
  USE_REAL_SERVER: false, 

  // IMPORTANT: Set this to your Cloudflare Worker URL to bypass filtering in Iran.
  // We allow reading from localStorage to let users change the proxy dynamically.
  get CLOUDFLARE_PROXY_URL() {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('irangram_proxy_url') || DEFAULT_PROXY;
      }
      return DEFAULT_PROXY;
  },

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
