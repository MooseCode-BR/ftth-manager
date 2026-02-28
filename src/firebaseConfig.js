import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <--- NOVO IMPORT

const firebaseConfig = {
    apiKey: "AIzaSyDYN2incS0xb5QZO7nrdukw0nXsHl5wwqE",
    authDomain: "ftth-mgr.firebaseapp.com",
    projectId: "ftth-mgr",
    storageBucket: "ftth-mgr.firebasestorage.app",
    messagingSenderId: "235638910340",
    appId: "1:235638910340:web:3b60dc54cee7e3983401d1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // <--- NOVA EXPORTAÇÃO