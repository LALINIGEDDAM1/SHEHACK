import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration from Firebase Studio
const firebaseConfig = {
  apiKey: "AIzaSyAd1Ezhw8EFK5qeZAxhI8altfiVsNdxqaI",
  authDomain: "ai-powered-question-bank-gener.firebaseapp.com",
  projectId: "ai-powered-question-bank-gener",
  storageBucket: "ai-powered-question-bank-gener.firebasestorage.app",
  messagingSenderId: "363650287320",
  appId: "1:363650287320:web:f47dfa62e55cc6435ff9ad",
  measurementId: "G-2TFGG0DHTC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
