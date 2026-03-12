import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAd1Ezhw8EFK5qeZAxhI8altfiVsNdxqaI",
  authDomain: "ai-powered-question-bank-gener.firebaseapp.com",
  projectId: "ai-powered-question-bank-gener",
  storageBucket: "ai-powered-question-bank-gener.firebasestorage.app",
  messagingSenderId: "363650287320",
  appId: "1:363650287320:web:f47dfa62e55cc6435ff9ad",
  measurementId: "G-2TFGG0DHTC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
