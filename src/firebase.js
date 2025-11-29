import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD72_-Cm0S62nmpMEoMZQ8WBjpcT9jxEtE",
  authDomain: "main-to-let.firebaseapp.com",
  projectId: "main-to-let",
  storageBucket: "main-to-let.firebasestorage.app",
  messagingSenderId: "877285902",
  appId: "1:877285902:web:962f2028d9de9ccb09225f",
  measurementId: "G-TQMLF94W5J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);