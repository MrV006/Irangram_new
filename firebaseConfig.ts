
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { CONFIG } from "./config";

// ------------------------------------------------------------------
// تنظیمات پروژه جدید (irangram-onlinemessenger)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAzZX5GMMO2DrZCDlOxRgiXQEt2IJ2Vkw8",
  authDomain: "irangram-onlinemessenger.firebaseapp.com",
  projectId: "irangram-onlinemessenger",
  storageBucket: "irangram-onlinemessenger.firebasestorage.app",
  messagingSenderId: "1024255822080",
  appId: "1:1024255822080:web:fae66b39d1e0b762edcbe5",
  measurementId: "G-4SXP4GPBV1"
};

// Initialize Firebase
let app;
let db: any = null;
let auth: any = null;
let storage: any = null;
let analytics: any = null;

try {
    app = initializeApp(firebaseConfig);
    
    // --- PROXY CONFIGURATION FOR FIRESTORE ---
    // If a proxy URL is set in config, parse the hostname and use it for Firestore.
    // This allows database traffic to route through Cloudflare.
    let firestoreSettings: any = {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    };

    if (CONFIG.CLOUDFLARE_PROXY_URL && CONFIG.CLOUDFLARE_PROXY_URL.startsWith('http')) {
        try {
            const proxyUrl = new URL(CONFIG.CLOUDFLARE_PROXY_URL);
            firestoreSettings = {
                ...firestoreSettings,
                host: proxyUrl.host,
                ssl: true
            };
            console.log("Using Firestore Proxy:", proxyUrl.host);
        } catch (e) {
            console.error("Invalid Proxy URL in config", e);
        }
    }

    try {
        db = initializeFirestore(app, firestoreSettings);
        console.log("Firestore initialized with settings");
    } catch (e) {
        console.warn("Firestore init failed, falling back to default", e);
        db = getFirestore(app);
    }

    auth = getAuth(app);
    
    // Analytics (Optional)
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics not supported in this environment");
      }
    }
    
    // Initialize Storage
    try {
        storage = getStorage(app);
    } catch (storageError) {
        console.warn("Firebase Storage not available. File uploads will be disabled.", storageError);
        storage = null;
    }
    
    // Explicitly set persistence to LOCAL
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Firebase Persistence Error:", error);
    });

    console.log("Firebase Connected Successfully");
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

export { db, auth, storage, analytics };
