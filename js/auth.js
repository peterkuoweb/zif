import { firebaseConfig, USE_FIREBASE } from './firebase-config.js';
import { auth as mockAuth, db as mockDb } from './mock-firebase.js';

let authInstance;
let dbInstance;

// Setup Real Firebase (Code is present but inactive unless USE_FIREBASE is true)
async function initFirebase() {
    if (USE_FIREBASE) {
        // Dynamic import from CDN to avoid loading if not needed
        // Note: In a real environment without a bundler, you might need <script> tags in HTML
        // For this demo, we assume modules are supported (modern browsers).

        // This is a simplified view. In production, you'd paste the CDN links in your HTML
        // and access the global `firebase` object or use import maps.
        // Since I cannot change the user's environment to add script tags easily to all files dynamically,
        // I will provide the instructions.

        console.warn("Real Firebase mode requires adding Firebase SDK script tags in your HTML files.");
        console.warn("Please see https://firebase.google.com/docs/web/setup#available-libraries");

        // Fallback or placeholder if SDK not present
        if (window.firebase) {
            const app = firebase.initializeApp(firebaseConfig);
            authInstance = firebase.auth();
            dbInstance = firebase.firestore();
        } else {
             throw new Error("Firebase SDK not loaded. Add CDN links to HTML.");
        }
    } else {
        console.log("Using Mock Firebase (Demo Mode)");
        authInstance = mockAuth;
        dbInstance = mockDb;
    }
}

// User Management Functions

export async function registerUser(email, password, role = 'student', name = '') {
    // If name is provided, we might want to save it in the profile
    try {
        const cred = await authInstance.createUserWithEmailAndPassword(email, password);
        const user = cred.user;

        // Create user document
        const userData = {
            uid: user.uid,
            email: user.email,
            role: role,
            name: name || email.split('@')[0],
            joinedAt: new Date().toISOString(),
            progress: {} // Course progress
        };

        if (USE_FIREBASE) {
            await dbInstance.collection('users').doc(user.uid).set(userData);
        } else {
             await dbInstance.setDoc('users', user.uid, userData);
        }

        return user;
    } catch (error) {
        throw error;
    }
}

export async function loginUser(email, password) {
    try {
        const cred = await authInstance.signInWithEmailAndPassword(email, password);
        return cred.user;
    } catch (error) {
        throw error;
    }
}

export async function logoutUser() {
    await authInstance.signOut();
    window.location.href = 'login.html';
}

export async function getCurrentUser() {
    return new Promise((resolve) => {
        authInstance.onAuthStateChanged(async (user) => {
            if (user) {
                // Fetch full profile including role
                let userData;
                if (USE_FIREBASE) {
                    const doc = await dbInstance.collection('users').doc(user.uid).get();
                    userData = doc.data();
                } else {
                    const doc = await dbInstance.getDoc('users', user.uid);
                    userData = doc.data();
                }
                resolve({ ...user, ...userData });
            } else {
                resolve(null);
            }
        });
    });
}

export async function checkAuth() {
    // Helper to redirect if not logged in
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
    }
    return user;
}

// "Zifadmin" backdoor
export async function tryPromoteToAdmin() {
    const code = prompt("Enter Administrator Code:");
    if (code === 'zifadmin') {
        const user = await getCurrentUser();
        if (!user) return alert("Please login first.");

        // Update role
        if (USE_FIREBASE) {
            await dbInstance.collection('users').doc(user.uid).update({ role: 'admin' });
        } else {
            await dbInstance.updateDoc('users', user.uid, { role: 'admin' });
        }
        alert("You are now an Admin. Please refresh the page.");
        location.reload();
    }
}

// Initialize on load
await initFirebase();

export { authInstance, dbInstance };
