// Auth manager for JWT tokens and login state
const AuthManager = {
    token: null,
    user: null,

    init() {
        // Try to restore session
        const savedToken = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('currentUser');
        if (savedToken && savedUser) {
            this.token = savedToken;
            this.user = JSON.parse(savedUser);
        }
    },

    async login(username, password) {
        try {
            // Try server login first
            if (SyncManager.isOnline) {
                // Get API base URL - use window.location.origin for same-origin or explicit cloud URL
                const apiBase = window.location.protocol === 'file:' 
                    ? 'http://localhost:5000' // Local development with file:// protocol
                    : window.location.origin; // Server deployment

                const response = await fetch(`${apiBase}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.token = data.token;
                        this.user = data.user;
                        this.saveSession();
                        return { success: true, online: true };
                    }
                }
            }

            // Offline fallback - check stored users
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                this.user = { username: user.username, role: user.role };
                this.saveSession();
                return { success: true, online: false };
            }

            return { success: false, error: 'Invalid credentials' };
        } catch (err) {
            console.warn('Login error:', err);
            return { success: false, error: err.message };
        }
    },

    async register(username, password) {
        try {
            // Try server registration first
            if (SyncManager.isOnline) {
                // Get API base URL - use window.location.origin for same-origin or explicit cloud URL
                const apiBase = window.location.protocol === 'file:' 
                    ? 'http://localhost:5000' // Local development with file:// protocol
                    : window.location.origin; // Server deployment

                const response = await fetch(`${apiBase}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.token = data.token;
                        this.user = data.user;
                        this.saveSession();
                        return { success: true, online: true };
                    }
                    return { success: false, error: data.error };
                }
            }

            // Offline fallback - save to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.some(u => u.username === username)) {
                return { success: false, error: 'Username already exists' };
            }

            const newUser = {
                username,
                password, // store plain password for offline login
                role: 'user',
                id: SyncManager.generateLocalId()
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            this.user = { username: newUser.username, role: newUser.role };
            this.saveSession();
            
            // Mark users for sync when online
            SyncManager.markForSync('users');
            // Notify user that registration was saved locally and will sync when online
            try { if (typeof showMessage === 'function') showMessage('Registration saved locally; will sync when online', 'warning'); } catch(e) {}

            // Try immediate sync if we become online soon
            try {
                if (typeof SyncManager !== 'undefined') {
                    // Re-check connection and attempt to sync the users collection immediately when possible
                    await SyncManager.checkConnection();
                    if (SyncManager.isOnline) {
                        await SyncManager.syncCollection('users');
                    }
                }
            } catch (syncErr) {
                // Ignore sync errors here; SyncManager will retry periodically
                console.warn('Immediate sync attempt failed:', syncErr);
            }
            return { success: true, online: false };
        } catch (err) {
            console.warn('Registration error:', err);
            return { success: false, error: err.message };
        }
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
    },

    saveSession() {
        if (this.token) {
            localStorage.setItem('authToken', this.token);
        }
        if (this.user) {
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            localStorage.setItem('isAdmin', this.user.role === 'admin');
        }
    },

    // Helper to get auth headers for API calls
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }
};

// Initialize auth when page loads
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});