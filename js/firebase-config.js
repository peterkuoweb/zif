// Firebase Configuration
// Follow instructions in FIREBASE_SETUP.md to fill this in.

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Toggle this to true to use real Firebase.
// If false, it uses LocalStorage (Demo Mode).
const USE_FIREBASE = false;

// Export for use in other modules if using a bundler,
// but since we are using vanilla JS imports/tags, these will be global or imported via ES modules.
// We'll treat them as globals or ES modules depending on implementation.
// For this project, we'll use ES modules.

export { firebaseConfig, USE_FIREBASE };
