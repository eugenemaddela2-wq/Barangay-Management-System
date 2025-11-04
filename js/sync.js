// Sync manager for offline-first operation with cloud DB sync
const SyncManager = {
    // Track if we're online and connected to server
    isOnline: false,
    pendingSync: new Set(), // track collections with pending changes
    lastSync: {}, // timestamp of last successful sync per collection

    // Collections we sync (matches server.js API endpoints)
    collections: ['documents', 'residents', 'events', 'officials', 'complaints', 'users'],

    // Initialize sync manager
    async init() {
        // Check online status initially and when it changes
        this.checkConnection();
        window.addEventListener('online', () => this.checkConnection());
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyOffline();
        });

        // Load last sync times
        this.lastSync = JSON.parse(localStorage.getItem('lastSync') || '{}');
        
        // Start periodic sync if online
        if (this.isOnline) {
            this.syncAll();
            setInterval(() => this.syncAll(), 5 * 60 * 1000); // sync every 5 min when online
        }
    },

    // Check if we can reach the server
    async checkConnection() {
        try {
            const health = await fetch('/health');
            this.isOnline = health.ok;
            if (this.isOnline) {
                this.notifyOnline();
                this.syncAll(); // try sync when we come online
            }
        } catch (err) {
            this.isOnline = false;
            this.notifyOffline();
        }
    },

    // Show online/offline status to user
    notifyOnline() {
        const msg = document.createElement('div');
        msg.className = 'sync-status online';
        msg.textContent = '🟢 Online - Changes will sync to cloud';
        this.showNotification(msg);
    },

    notifyOffline() {
        const msg = document.createElement('div');
        msg.className = 'sync-status offline';
        msg.textContent = '🔴 Offline - Changes saved locally';
        this.showNotification(msg);
    },

    showNotification(msgEl) {
        // Remove any existing status
        document.querySelectorAll('.sync-status').forEach(el => el.remove());
        
        // Show new status in top-right
        msgEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            border-radius: 5px;
            z-index: 9999;
        `;
        document.body.appendChild(msgEl);
    },

    // Mark a collection as needing sync
    markForSync(collection) {
        this.pendingSync.add(collection);
        if (this.isOnline) {
            this.syncCollection(collection);
        }
    },

    // Sync all collections that have pending changes
    async syncAll() {
        if (!this.isOnline) return;
        
        for (const collection of this.collections) {
            await this.syncCollection(collection);
        }
    },

    // Sync a specific collection with the server
    async syncCollection(collection) {
        if (!this.isOnline) return;

        try {
            // Get server data first
            const serverRes = await fetch(`/api/${collection}`);
            if (!serverRes.ok) return;
            const serverData = await serverRes.json();

            // Get local data
            const localData = JSON.parse(localStorage.getItem(collection) || '[]');
            
            // Track what we've processed to avoid dupes
            const processed = new Set();
            
            // Merged results
            const merged = [];

            // Process server items first (they win conflicts except for pending local changes)
            for (const serverItem of serverData) {
                const id = String(serverItem.id);
                processed.add(id);

                // Find local version if any
                const localItem = localData.find(i => String(i.id) === id);
                
                // Use local if it's newer than our last sync
                if (localItem && this.lastSync[collection] && 
                    new Date(localItem.modified || localItem.date) > new Date(this.lastSync[collection])) {
                    // Local changes win - push to server
                    try {
                        await fetch(`/api/${collection}/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(localItem)
                        });
                        merged.push(localItem);
                    } catch (err) {
                        console.warn(`Failed to push local ${collection} changes for ${id}`, err);
                        merged.push(localItem); // keep local version
                    }
                } else {
                    // Server wins
                    merged.push(serverItem);
                }
            }

            // Add local-only items (new ones not yet synced)
            for (const localItem of localData) {
                const id = String(localItem.id);
                if (!processed.has(id)) {
                    // Try to push to server
                    try {
                        const res = await fetch(`/api/${collection}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(localItem)
                        });
                        if (res.ok) {
                            const saved = await res.json();
                            merged.push(saved);
                            processed.add(id);
                        }
                    } catch (err) {
                        console.warn(`Failed to push new ${collection} item ${id}`, err);
                        merged.push(localItem); // keep local version
                    }
                }
            }

            // Save merged results locally
            localStorage.setItem(collection, JSON.stringify(merged));
            
            // Update last sync time
            this.lastSync[collection] = new Date().toISOString();
            localStorage.setItem('lastSync', JSON.stringify(this.lastSync));
            
            // Remove from pending
            this.pendingSync.delete(collection);

            console.log(`Synced ${collection}: ${merged.length} items`);

        } catch (err) {
            console.warn(`Error syncing ${collection}`, err);
        }
    },

    // Helper to generate a local ID (temporary until sync)
    generateLocalId() {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Initialize sync manager when page loads
document.addEventListener('DOMContentLoaded', () => SyncManager.init());

// Export for use in other files
window.SyncManager = SyncManager;