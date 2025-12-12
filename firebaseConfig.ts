
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiTAiDphBPNjd4dKwEYArGY8pXWf55sZQ",
  authDomain: "irangram-79830.firebaseapp.com",
  projectId: "irangram-79830",
  storageBucket: "irangram-79830.firebasestorage.app",
  messagingSenderId: "355877653612",
  appId: "1:355877653612:web:5512841c0ab55b6b011c49",
  measurementId: "G-RZWEBR7XJ7"
};

// Initialize Firebase
let app;
let db: any = null;
let auth: any = null;
let storage: any = null;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
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

    console.log("Firebase Connected Successfully");
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

export { db, auth, storage };
