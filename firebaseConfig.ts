
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { CONFIG } from "./config";

// ------------------------------------------------------------------
// تنظیمات پروژه فایربیس
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDr4iEohbuEX6DCJfBkAwpTIuS6xIHj8rY",
  authDomain: "irangram-f89b7.firebaseapp.com",
  projectId: "irangram-f89b7",
  storageBucket: "irangram-f89b7.firebasestorage.app",
  messagingSenderId: "173676831384",
  appId: "1:173676831384:web:7d62284ba90d2652de26ed",
  measurementId: "G-WMEL98VM47"
};

// Initialize Firebase
let app;
let db: any = null;
let auth: any = null;
let storage: any = null;
let analytics: any = null;

try {
    app = initializeApp(firebaseConfig);
    
    // Direct Firestore Connection with Long Polling enforced for better connectivity in restricted networks
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            experimentalForceLongPolling: true, // Critical fix for Iran/Restrictive Networks
            ignoreUndefinedProperties: true
        });
        console.log("Firestore initialized (Long Polling & Offline Mode)");
    } catch (e) {
        console.warn("Firestore init failed, falling back to default", e);
        db = getFirestore(app);
        enableIndexedDbPersistence(db).catch((err) => {
            console.warn('Persistence warning:', err.code);
        });
    }

    auth = getAuth(app);
    
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        // console.warn("Analytics not supported");
      }
    }
    
    try {
        storage = getStorage(app);
    } catch (storageError) {
        console.warn("Firebase Storage not available.", storageError);
        storage = null;
    }
    
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Firebase Persistence Error:", error);
    });

    console.log("Firebase Connected Successfully");
} catch (error) {
    console.error("Firebase Initialization Error - Check your firebaseConfig settings:", error);
    alert("خطا در اتصال به فایربیس. لطفا فایل firebaseConfig.ts را بررسی کنید.");
}

export { db, auth, storage, analytics };
