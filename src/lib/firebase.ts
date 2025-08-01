import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB547TQHbppse8_kcrZUqU5NOMyyHkiK6k",
  authDomain: "tarimozkatalogdatabase.firebaseapp.com",
  projectId: "tarimozkatalogdatabase",
  storageBucket: "tarimozkatalogdatabase.firebasestorage.app",
  messagingSenderId: "957984539715",
  appId: "1:957984539715:web:e8fa7cdcad6d9fe85b80f6",
  measurementId: "G-N6S9Z7S04N"
};

// Firebase başlat
const app = initializeApp(firebaseConfig);

// Export edilen servisler
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
