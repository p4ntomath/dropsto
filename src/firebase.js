// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyD1hXYD-0Uc5Omu5ImL3sffJHEw23wIsZI",
  authDomain: "dropsto-auth.firebaseapp.com",
  projectId: "dropsto-auth",
  storageBucket: "dropsto-auth.firebasestorage.app",
  messagingSenderId: "767678266941",
  appId: "1:767678266941:web:3abc5b71b003652ccd3454",
  measurementId: "G-76XSVLJD6H"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider("microsoft.com");

const db = getFirestore(app);

export { auth, googleProvider, microsoftProvider, signInWithPopup, signOut, db };
