
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

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
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Analytics (Optional)
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics not supported in this environment");
      }
    }
    
    // Initialize Storage separately to prevent app crash if service is disabled/unavailable
    try {
        storage = getStorage(app);
    } catch (storageError) {
        console.warn("Firebase Storage not available. File uploads will be disabled.", storageError);
        storage = null;
    }
    
    // Explicitly set persistence to LOCAL (persists even after window close)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Firebase Persistence Error:", error);
    });

    console.log("Firebase Connected Successfully (New Project)");
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

export { db, auth, storage, analytics };
