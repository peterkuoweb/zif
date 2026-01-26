# Firebase Setup Guide for ZIF (智作坊)

This platform supports both a **Demo Mode** (using LocalStorage) and a **Production Mode** (using Firebase). To enable cloud storage for users, courses, and progress, follow these steps to set up Firebase.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name your project (e.g., `zif-platform`) and follow the setup steps.
4. Google Analytics is optional.

## 2. Enable Authentication
1. In the project dashboard, select **"Authentication"** from the left sidebar.
2. Click **"Get started"**.
3. Select **"Sign-in method"** tab.
4. Enable **"Email/Password"**.
5. (Optional) Enable **"Google"** provider if you want to support Google Login. You will need to configure the OAuth consent screen in Google Cloud Console.

## 3. Enable Firestore Database
1. Select **"Firestore Database"** from the left sidebar.
2. Click **"Create database"**.
3. Choose **"Start in production mode"**.
4. Select a location (e.g., `asia-east1` for Taiwan).
5. Click **"Enable"**.

### Set Security Rules
For testing, you can use these rules (Warning: Open to everyone):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
**For production**, you should restrict access so only authenticated users can read/write their own data.

## 4. Get Configuration
1. Click the **Gear icon** (Project Settings) next to "Project Overview" in the left sidebar.
2. Scroll down to the **"Your apps"** section.
3. Click the **Web icon (`</>`)**.
4. Register the app (e.g., "ZIF Web").
5. Copy the `firebaseConfig` object provided. It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "zif-platform.firebaseapp.com",
     projectId: "zif-platform",
     storageBucket: "zif-platform.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

## 5. Connect to ZIF
1. Open the file `js/firebase-config.js` in the source code.
2. Paste your `firebaseConfig` object there.
3. Change `const USE_FIREBASE = false;` to `const USE_FIREBASE = true;`.

Your platform is now connected to the cloud!
