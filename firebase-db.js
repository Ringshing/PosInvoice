import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager, 
    collection, 
    addDoc, 
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Your specific Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyApr0wOhEROd61l4CuXrrxK3qonOvEDbeE",
    authDomain: "ringshinginvoicepos.firebaseapp.com",
    projectId: "ringshinginvoicepos",
    storageBucket: "ringshinginvoicepos.firebasestorage.app",
    messagingSenderId: "259569956585",
    appId: "1:259569956585:web:f0bd1783e8ebf6b2382278",
    measurementId: "G-2Q9Q1S049W"
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth
const auth = getAuth(app);

// 3. Initialize Firestore with Multi-Tab Offline Persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// --- GLOBAL UTILITIES ---

/**
 * Promise that resolves when the Firebase Auth state is determined.
 * Used by HTML pages to hide/show the lock screen.
 */
window.firebaseReady = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
        resolve(!!user); // true if logged in, false if not
    });
});

/**
 * Validates the PIN entered by the user against Firebase Auth.
 * Uses a hardcoded email 'pos@ringshing.com'.
 */
window.loginWithPin = async function(pin) {
    try {
        await signInWithEmailAndPassword(auth, "pos@ringshing.com", pin);
        return true;
    } catch (error) {
        console.error("Auth Error:", error.code);
        return false;
    }
};

/**
 * Saves a new invoice to the cloud. 
 * If offline, Firestore queues this and syncs automatically later.
 */
window.saveInvoiceToCloud = async function(invoiceData) {
    if (!auth.currentUser) {
        console.error("Save blocked: System locked.");
        return;
    }
    try {
        const docRef = await addDoc(collection(db, "invoices"), invoiceData);
        console.log("Invoice synced/queued with ID: ", docRef.id);
    } catch (e) {
        console.error("Error saving invoice: ", e);
    }
};

/**
 * Saves a return record to the cloud.
 */
window.saveReturnToCloud = async function(returnData) {
    if (!auth.currentUser) return;
    try {
        await addDoc(collection(db, "returns"), returnData);
        console.log("Return synced/queued.");
    } catch (e) {
        console.error("Error saving return: ", e);
    }
};

/**
 * Fetches all sales and returns for Analytics.
 */
window.fetchStoreAnalytics = async function() {
    if (!auth.currentUser) throw new Error("Unauthorized access. Please unlock the system.");
    
    try {
        const salesSnapshot = await getDocs(collection(db, "invoices"));
        const returnsSnapshot = await getDocs(collection(db, "returns"));

        let sales = [];
        salesSnapshot.forEach((doc) => sales.push(doc.data()));

        let returns = [];
        returnsSnapshot.forEach((doc) => returns.push(doc.data()));

        return { sales, returns };
    } catch (e) {
        console.error("Error fetching analytics: ", e);
        throw e;
    }
};

/**
 * Search functionality for finding specific invoices.
 */
window.searchInvoiceInCloud = async function(searchId, searchDate) {
    if (!auth.currentUser) return [];
    
    try {
        const invoicesRef = collection(db, "invoices");
        let q;

        if (searchId) {
            q = query(invoicesRef, where("id", "==", searchId));
        } else if (searchDate) {
            const startOfDay = searchDate + "T00:00:00";
            const endOfDay = searchDate + "T23:59:59";
            q = query(invoicesRef, where("date", ">=", startOfDay), where("date", "<=", endOfDay));
        }

        const snapshot = await getDocs(q);
        let results = [];
        snapshot.forEach(doc => results.push(doc.data()));
        return results;
    } catch (e) {
        console.error("Search failed:", e);
        return [];
    }
};