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

// 1. Connection Engine
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

// 2. Security Engine (The PIN Check)
window.firebaseReady = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => resolve(!!user));
});

window.loginWithPin = async function(pin) {
    try {
        await signInWithEmailAndPassword(auth, "pos@ringshing.com", pin);
        return true;
    } catch (error) { return false; }
};

// 3. Sales Engine (Saves to Cloud + Offline Queue)
window.saveInvoiceToCloud = async function(invoiceData) {
    if (!auth.currentUser) return console.error("Database Locked");
    // This line ensures 'total' is always saved for Analytics to read
    const data = { ...invoiceData, total: invoiceData.total || invoiceData.grandTotal };
    await addDoc(collection(db, "invoices"), data);
};

// 4. Returns Engine
window.saveReturnToCloud = async function(returnData) {
    if (!auth.currentUser) return;
    await addDoc(collection(db, "returns"), returnData);
};

// 5. Analytics Engine (Powers your charts/totals)
window.fetchStoreAnalytics = async function() {
    if (!auth.currentUser) throw new Error("Locked");
    const sSnap = await getDocs(collection(db, "invoices"));
    const rSnap = await getDocs(collection(db, "returns"));
    let sales = []; sSnap.forEach(doc => sales.push(doc.data()));
    let returns = []; rSnap.forEach(doc => returns.push(doc.data()));
    return { sales, returns };
};

// 6. Search Engine (Look up old invoices)
window.searchInvoiceInCloud = async function(searchId, searchDate) {
    if (!auth.currentUser) return [];
    const invoicesRef = collection(db, "invoices");
    let q;
    if (searchId) {
        q = query(invoicesRef, where("id", "==", searchId));
    } else if (searchDate) {
        q = query(invoicesRef, where("date", ">=", searchDate + "T00:00:00"), where("date", "<=", searchDate + "T23:59:59"));
    }
    const snapshot = await getDocs(q);
    let res = []; snapshot.forEach(doc => res.push(doc.data()));
    return res;
};