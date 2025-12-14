
/**
 * App Configuration
 * This file centralizes connection settings. 
 */

export const CONFIG = {
  // Toggle this to switch between Local Mock and Real Server
  USE_REAL_SERVER: true, 

  // Direct connection - No Proxy
  CLOUDFLARE_PROXY_URL: '',

  // App Info
  APP_NAME: 'ایران‌گرام',
  VERSION: '2.2.0',
  
  // SUPER ADMIN EMAILS
  OWNER_EMAIL: 'amirrezaveisi45@gmail.com',
  DEVELOPER_EMAIL: 'developer.irangram@gmail.com',

  // --- ADVERTISING SETTINGS ---
  ADS: {
    ENABLED: true, // Master switch for ads
    USE_MOCK: false, // Set to false when you have real ad scripts
    SIDEBAR_BANNER: true,
    CHAT_TOP_BANNER: true,
    // Configuration for Ad Providers (e.g., Yektanet, Google AdSense)
    PROVIDERS: {
        SIDEBAR_ID: 'sidebar-ad-slot', // For rectangle/banner ads
        CHAT_ID: 'chat-ad-slot', // For top of chat
        // Updated to your specific text ad ID
        NATIVE_LIST_ID: 'pos-article-text-113845', 
        NATIVE_LIST_POS: 3 // Shows after the 3rd chat
    }
  }
};

export const ENDPOINTS = {
  LOGIN: '/auth/login',
  MESSAGES: '/messages',
  CONTACTS: '/contacts',
  UPLOAD: '/upload'
};
