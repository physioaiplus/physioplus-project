import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAUciFQbxq7droJnVRZ6T5RNVPpdKYyB3g",
  authDomain: "physioai-b5805.firebaseapp.com",
  projectId: "physioai-b5805",
  storageBucket: "physioai-b5805.firebasestorage.app",
  messagingSenderId: "570782811346",
  appId: "1:570782811346:web:4b0ae730f69f83bf08590b"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firebase Authentication
export const auth = getAuth(app);

// Inizializza Firestore
export const db = getFirestore(app);

// Connessione all'emulatore Firebase (solo per sviluppo)
// Disabilita questa riga in produzione
if (import.meta.env.DEV) {
  // connectAuthEmulator(auth, "http://localhost:9099");
}

export default app;



