import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyApr0wOhEROd61l4CuXrrxK3qonOvEDbeE",
    authDomain: "ringshinginvoicepos.firebaseapp.com",
    projectId: "ringshinginvoicepos",
    storageBucket: "ringshinginvoicepos.firebasestorage.app",
    messagingSenderId: "259569956585",
    appId: "1:259569956585:web:f0bd1783e8ebf6b2382278",
    measurementId: "G-2Q9Q1S049W"
};

// Initialize Firebase & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

// CORE FIX: An awaitable state to prevent UI crashes on slow internet
window.firebaseReady = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
        resolve(!!user); // Returns true if logged in, false if not
    });
});

window.loginWithPin = async function(pin) {
    try {
        // Authenticates securely with Google using the PIN as the password
        await signInWithEmailAndPassword(auth, "pos@ringshing.com", pin);
        return true;
    } catch (error) {
        console.error("Login failed:", error.message);
        return false;
    }
};

window.fetchStoreAnalytics = async function() {
    if (!auth.currentUser) throw new Error("System Locked");
    try {
        const salesSnapshot = await getDocs(collection(db, "invoices"));
        const returnsSnapshot = await getDocs(collection(db, "returns"));
        let sales = [];
        salesSnapshot.forEach((doc) => sales.push(doc.data()));
        let returns = [];
        returnsSnapshot.forEach((doc) => returns.push(doc.data()));
        return { sales, returns };
    } catch (e) {
        console.error("❌ Error fetching analytics: ", e);
        throw e;
    }
};

window.searchInvoiceInCloud = async function(searchId, searchDate) {
    if (!auth.currentUser) throw new Error("System Locked");
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
        console.error("❌ Search failed:", e);
        return [];
    }
};

window.saveInvoiceToCloud = async function(invoiceData) {
    if (!auth.currentUser) throw new Error("System Locked");
    await addDoc(collection(db, "invoices"), invoiceData);
};

window.saveReturnToCloud = async function(returnData) {
    if (!auth.currentUser) throw new Error("System Locked");
    await addDoc(collection(db, "returns"), returnData);
};