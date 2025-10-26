// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Barangay Management System loaded');
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize sample data
    initializeSampleData();
    
    // Update statistics on home page
    updateStatistics();
});

function initializeNavigation() {
    const toggleClick = document.querySelector(".toggleBox");
    const container = document.querySelector(".container");
    
    if (toggleClick && container) {
        toggleClick.addEventListener('click', (e) => {
            e.preventDefault();
            toggleClick.classList.toggle('active');
            container.classList.toggle('active');
        });
    }
}

function initializeSampleData() {
    // Initialize sample data if not exists
    if (!localStorage.getItem('residents')) {
        const sampleResidents = [
            { id: 1, name: 'Juan Dela Cruz', age: 35, address: 'Block 1 Lot 1', contact: '09123456789' },
            { id: 2, name: 'Maria Santos', age: 28, address: 'Block 2 Lot 5', contact: '09987654321' },
            { id: 3, name: 'Pedro Garcia', age: 42, address: 'Block 3 Lot 8', contact: '09456789123' }
        ];
        localStorage.setItem('residents', JSON.stringify(sampleResidents));
    }
    
    if (!localStorage.getItem('documents')) {
        const sampleDocuments = [
            { id: 1, type: 'Barangay Clearance', resident: 'Juan Dela Cruz', date: '2024-01-15', status: 'Issued' },
            { id: 2, type: 'Certificate of Residency', resident: 'Maria Santos', date: '2024-01-20', status: 'Processing' },
            { id: 3, type: 'Business Permit', resident: 'Pedro Garcia', date: '2024-01-25', status: 'Issued' }
        ];
        localStorage.setItem('documents', JSON.stringify(sampleDocuments));
    }
    
    if (!localStorage.getItem('officials')) {
        const sampleOfficials = [
            { id: 1, name: 'Captain Roberto Cruz', position: 'Barangay Captain', contact: '09111222333' },
            { id: 2, name: 'Councilor Ana Reyes', position: 'Barangay Councilor', contact: '09444555666' },
            { id: 3, name: 'Secretary Linda Torres', position: 'Barangay Secretary', contact: '09777888999' }
        ];
        localStorage.setItem('officials', JSON.stringify(sampleOfficials));
    }
    
    if (!localStorage.getItem('events')) {
        const sampleEvents = [
            { id: 1, title: 'Community Clean-up Drive', date: '2024-02-15', time: '08:00 AM', location: 'Barangay Hall' },
            { id: 2, title: 'Health and Wellness Seminar', date: '2024-02-20', time: '02:00 PM', location: 'Community Center' },
            { id: 3, title: 'Barangay Assembly Meeting', date: '2024-02-25', time: '07:00 PM', location: 'Barangay Hall' }
        ];
        localStorage.setItem('events', JSON.stringify(sampleEvents));
    }
    
    // Initialize a simple users list (username/password/role). Two admin users are provided for login.
    if (!localStorage.getItem('users')) {
        const sampleUsers = [
            { username: 'admin1', password: 'adminpass1', role: 'admin' },
            { username: 'admin2', password: 'adminpass2', role: 'admin' },
            { username: 'demo', password: 'demopass', role: 'user' }
        ];
        localStorage.setItem('users', JSON.stringify(sampleUsers));
    }
}

function updateStatistics() {
    const residentsCount = document.getElementById('residentsCount');
    const documentsCount = document.getElementById('documentsCount');
    const eventsCount = document.getElementById('eventsCount');
    
    if (residentsCount) {
        const residents = JSON.parse(localStorage.getItem('residents') || '[]');
        residentsCount.textContent = residents.length;
    }
    
    if (documentsCount) {
        const documents = JSON.parse(localStorage.getItem('documents') || '[]');
        documentsCount.textContent = documents.length;
    }
    
    if (eventsCount) {
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        eventsCount.textContent = events.length;
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        alert('Logged out successfully!');
        window.location.href = '../index.html';
    }
}

function showLogin() {
    alert('Login functionality would be implemented here!\n\nFor demo purposes, you can access all features without login.');
}

// Utility functions for data management
function saveData(key, data) {
    // If SupabaseHelper is available, delegate to it (non-blocking)
    if (window.SupabaseHelper && typeof window.SupabaseHelper.saveData === 'function') {
        // map key names to table names if needed (we'll assume same names)
        try {
            window.SupabaseHelper.saveData(key, data);
            return;
        } catch (e) {
            console.warn('SupabaseHelper.saveData failed, falling back to localStorage', e);
        }
    }
    localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key) {
    if (window.SupabaseHelper && typeof window.SupabaseHelper.loadData === 'function') {
        try {
            // may return a promise; callers expect sync array, so we handle both
            const res = window.SupabaseHelper.loadData(key);
            if (res && typeof res.then === 'function') {
                // async path: return a promise so callers can await if needed
                return res;
            }
            return res;
        } catch (e) {
            console.warn('SupabaseHelper.loadData failed, falling back to localStorage', e);
        }
    }

    return JSON.parse(localStorage.getItem(key) || '[]');
}

function generateId() {
    return Date.now() + Math.random();
}

// Form validation
function validateForm(formData) {
    for (let key in formData) {
        if (!formData[key] || formData[key].trim() === '') {
            return false;
        }
    }
    return true;
}

// Show success message
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#26d07c' : '#ff6b6b'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Ensure navigation toggle is always on top and receives pointer events
const navStyle = document.createElement('style');
navStyle.textContent = `
    /* Force the floating navigation container and toggle to be clickable */
    .container { z-index: 20000 !important; pointer-events: auto !important; }
    .toggleBox { z-index: 20001 !important; pointer-events: auto !important; }
`;
document.head.appendChild(navStyle);