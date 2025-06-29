import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgQAxLLQUMtnooqx5r5_9AmTV6irmFmOw",
  authDomain: "healthapp-45111.firebaseapp.com",
  projectId: "healthapp-45111",
  storageBucket: "healthapp-45111.firebasestorage.app",
  messagingSenderId: "1042837733335",
  appId: "1:1042837733335:web:df8a01a2da5351b18f9592",
  measurementId: "G-GGCBQ59FGP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialized successfully");
console.log("Using project Id :", app.options.projectId);

export { app, auth, db };