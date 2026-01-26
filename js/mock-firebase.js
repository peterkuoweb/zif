// Mock Firebase Implementation for Demo Mode
// Uses localStorage to simulate Authentication and Firestore

const STORAGE_KEY_DB = 'zif_mock_db';
const STORAGE_KEY_AUTH = 'zif_mock_auth_user';

class MockAuth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH)) || null;
        this.listeners = [];
    }

    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        callback(this.currentUser);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    async signInWithEmailAndPassword(email, password) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        const db = this._getDb();
        const users = Object.values(db.users || {});
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this._setUser({ uid: user.uid, email: user.email, role: user.role });
            return { user: this.currentUser };
        } else {
            throw new Error("Invalid email or password");
        }
    }

    async createUserWithEmailAndPassword(email, password) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const db = this._getDb();
        const users = Object.values(db.users || {});

        if (users.find(u => u.email === email)) {
            throw new Error("Email already in use");
        }

        const uid = 'user_' + Date.now();
        const newUser = { uid, email, password, role: 'student', name: email.split('@')[0] }; // Default role student

        // First user is Admin
        if (users.length === 0) {
            newUser.role = 'admin';
        }

        if (!db.users) db.users = {};
        db.users[uid] = newUser;
        this._saveDb(db);

        this._setUser({ uid, email, role: newUser.role });
        return { user: this.currentUser };
    }

    async signOut() {
        await new Promise(resolve => setTimeout(resolve, 200));
        this._setUser(null);
    }

    _setUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEY_AUTH);
        }
        this.listeners.forEach(cb => cb(this.currentUser));
    }

    _getDb() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_DB)) || {};
    }

    _saveDb(db) {
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
    }
}

class MockFirestore {
    constructor() {}

    // Simplistic Firestore mock
    // Data structure: { collectionName: { docId: { ...data } } }

    async getDoc(collectionName, docId) {
        const db = this._getDb();
        const data = db[collectionName] ? db[collectionName][docId] : null;
        return {
            exists: () => !!data,
            data: () => data,
            id: docId
        };
    }

    async setDoc(collectionName, docId, data, options = {}) {
        const db = this._getDb();
        if (!db[collectionName]) db[collectionName] = {};

        if (options.merge && db[collectionName][docId]) {
            db[collectionName][docId] = { ...db[collectionName][docId], ...data };
        } else {
            db[collectionName][docId] = data;
        }
        this._saveDb(db);
    }

    async updateDoc(collectionName, docId, data) {
        const db = this._getDb();
        if (db[collectionName] && db[collectionName][docId]) {
            db[collectionName][docId] = { ...db[collectionName][docId], ...data };
            this._saveDb(db);
        } else {
            throw new Error("Document does not exist");
        }
    }

    async getDocs(collectionName, queryFn) {
        const db = this._getDb();
        let docs = Object.values(db[collectionName] || {});

        if (queryFn) {
            docs = queryFn(docs);
        }

        return {
            empty: docs.length === 0,
            docs: docs.map(d => ({
                id: d.id || d.uid, // heuristic for ID
                data: () => d
            }))
        };
    }

    // Helpers
    _getDb() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_DB)) || {};
    }

    _saveDb(db) {
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
    }
}

export const auth = new MockAuth();
export const db = new MockFirestore();
