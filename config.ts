
/**
 * App Configuration
 * This file centralizes connection settings. 
 */

export const CONFIG = {
  // Toggle this to switch between Local Mock and Real Server (Keep false for Firebase)
  USE_REAL_SERVER: false, 

  // IMPORTANT: Set this to your Cloudflare Worker URL to bypass filtering in Iran.
  // 1. Create a Worker in Cloudflare Dashboard.
  // 2. Paste the code from `proxy-worker.js`.
  // 3. Copy the Worker URL (e.g. https://your-worker.subdomain.workers.dev) and paste it below.
  // IF LEFT EMPTY: The app will try to connect directly to Google (Requires VPN).
  CLOUDFLARE_PROXY_URL: 'https://irangram-proxy.amirrezaveisi45.workers.dev', 

  // App Info
  APP_NAME: 'ایران‌گرام',
  VERSION: '2.0.0',
  
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
