import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBIdrzdu_ObCZCtjFGZYd399bp_kKtyI3M",
  authDomain: "variantstream.firebaseapp.com",
  projectId: "variantstream",
  storageBucket: "variantstream.firebasestorage.app",
  messagingSenderId: "20733837935",
  appId: "1:20733837935:web:02b55869e0feb48adbc39a",
  measurementId: "G-PEX981WGPQ"
};

// Initialize Firebase securely (prevent re-initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics conditionally (only on the client side)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics };
