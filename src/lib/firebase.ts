import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGjSbGtXfnCB0XhF0M4QVRXCaqsJ5SDHQ",
  authDomain: "crpao-meetingroom.firebaseapp.com",
  projectId: "crpao-meetingroom",
  storageBucket: "crpao-meetingroom.firebasestorage.app",
  messagingSenderId: "732552112611",
  appId: "1:732552112611:web:faa32d4e1f478274c4d8d6"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db   = getFirestore(app);
export const auth = getAuth(app);