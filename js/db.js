// js/db.js
const DB_NAME = 'OpensiaDB';
const DB_VERSION = 1;

let db;

/**
 * Initializes the IndexedDB.
 * Returns a promise that resolves when the DB is ready.
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error: ", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store for settings
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }

            // Store for file explorer items (folders and notebooks)
            if (!db.objectStoreNames.contains('items')) {
                const itemsStore = db.createObjectStore('items', { keyPath: 'id' });
                itemsStore.createIndex('parentId', 'parentId', { unique: false });
                itemsStore.createIndex('type', 'type', { unique: false }); // 'folder' or 'notebook'
            }

            // Store for sources (files uploaded to a notebook)
            if (!db.objectStoreNames.contains('sources')) {
                const sourcesStore = db.createObjectStore('sources', { keyPath: 'id' });
                sourcesStore.createIndex('notebookId', 'notebookId', { unique: false });
            }

            // Store for chat messages
            if (!db.objectStoreNames.contains('messages')) {
                const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
                messagesStore.createIndex('notebookId', 'notebookId', { unique: false });
            }
        };
    });
}

// --- Settings CRUD ---

async function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getSetting(key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = (e) => reject(e.target.error);
    });
}

// --- Items (Folders/Notebooks) CRUD ---

async function addItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        const request = store.add(item);
        request.onsuccess = () => resolve(item);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function updateItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readonly');
        const store = transaction.objectStore('items');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function deleteItem(id) {
    // Also recursively delete children if it's a folder, but for simplicity we'll just delete the item here.
    // In a real app, you'd cascade deletes.
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

// --- Sources CRUD ---

async function addSource(source) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sources'], 'readwrite');
        const store = transaction.objectStore('sources');
        const request = store.add(source);
        request.onsuccess = () => resolve(source);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getSourcesByNotebook(notebookId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sources'], 'readonly');
        const store = transaction.objectStore('sources');
        const index = store.index('notebookId');
        const request = index.getAll(notebookId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function deleteSource(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sources'], 'readwrite');
        const store = transaction.objectStore('sources');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

// --- Messages CRUD ---

async function addMessage(message) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        const request = store.add(message);
        request.onsuccess = () => resolve(message);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getMessagesByNotebook(notebookId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('notebookId');
        const request = index.getAll(notebookId);
        request.onsuccess = () => {
             // Sort messages by timestamp
             const messages = request.result.sort((a, b) => a.timestamp - b.timestamp);
             resolve(messages);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}