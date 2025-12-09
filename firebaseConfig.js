import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyDUTJCmHyrNA-mioeqttYSY3YbAHvp_Fcc",
    authDomain: "iots-8b0ed.firebaseapp.com",
    databaseURL: "https://iots-8b0ed-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "iots-8b0ed",
    storageBucket: "iots-8b0ed.firebasestorage.app",
    messagingSenderId: "519817040946",
    appId: "1:519817040946:web:030311f5a9047fb58d982b",
    measurementId: "G-YTFKKEYR3P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

// Initialize Firestore and get a reference to the service
const firestore = getFirestore(app);

export { database, firestore };
