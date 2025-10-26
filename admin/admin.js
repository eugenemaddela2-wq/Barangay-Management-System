// Admin page script
document.addEventListener('DOMContentLoaded', function() {
    // Simple access control: allow if localStorage.isAdmin === 'true' or currentUser is listed as admin in users
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userRecord = users.find(u => u.username === currentUser);
    const isAdmin = localStorage.getItem('isAdmin') === 'true' || (userRecord && userRecord.role === 'admin');
    if (!isAdmin) {
        alert('Admin access required. Redirecting to login.');
        window.location.href = '../login.html';
        return;
    }

    // Initialize nav toggle from shared script
    if (typeof initializeNavigation === 'function') initializeNavigation();

    // Default section
    showSection('residents');
});

function showSection(section) {
    const container = document.getElementById('adminSections');
    container.innerHTML = '';

    switch(section) {
        case 'residents':
            container.appendChild(renderResidentsSection());
            break;
        case 'documents':
            container.appendChild(renderDocumentsSection());
            break;
        case 'events':
            container.appendChild(renderEventsSection());
            break;
        case 'officials':
            container.appendChild(renderOfficialsSection());
            break;
        case 'complaints':
            container.appendChild(renderComplaintsSection());
            break;
        case 'users':
            container.appendChild(renderUsersSection());
            break;
        default:
            container.innerHTML = '<div class="content-card">Unknown section</div>';
    }
}

// Generic helpers
function makeCard(title, innerHtml) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.innerHTML = `<h2>${title}</h2><div>${innerHtml}</div>`;
    return card;
}

// ---------- Residents ----------
function renderResidentsSection() {
    const residents = JSON.parse(localStorage.getItem('residents') || '[]');
    let html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Address</th><th>Contact</th><th>Actions</th></tr></thead>
                <tbody id="adminResidentsTable"></tbody>
            </table>
        </div>
        <div style="margin-top:16px;">
            <button class="btn" onclick="showResidentForm()">Add Resident</button>
        </div>
    `;

    const card = makeCard('Manage Residents', html);

    setTimeout(() => { loadResidentsTable(); }, 0);
    return card;
}

function loadResidentsTable() {
    const tbody = document.getElementById('adminResidentsTable');
    const residents = JSON.parse(localStorage.getItem('residents') || '[]');
    tbody.innerHTML = '';
    if (residents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f0f0f0;font-style:italic;">No residents found.</td></tr>';
        return;
    }
    residents.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.id}</td><td>${r.name}</td><td>${r.age}</td><td>${r.address}</td><td>${r.contact}</td><td><button class="btn" onclick="editResident('${r.id}')">Edit</button> <button class="btn" onclick="deleteResident('${r.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function showResidentForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="residentForm">
                <div class="form-group"><label>Name</label><input name="name" required></div>
                <div class="form-group"><label>Age</label><input name="age" type="number" required></div>
                <div class="form-group"><label>Address</label><input name="address" required></div>
                <div class="form-group"><label>Contact</label><input name="contact" required></div>
                <div><button class="btn" type="submit">Save</button></div>
            </form>
        </div>
    `;
    const container = document.getElementById('adminSections');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = formHtml;
    container.prepend(wrapper);

    const form = document.getElementById('residentForm');
    if (existing) {
        form.name.value = existing.name;
        form.age.value = existing.age;
        form.address.value = existing.address;
        form.contact.value = existing.contact;
        form.onsubmit = function(e) { e.preventDefault(); saveResident(existing.id); };
    } else {
        form.onsubmit = function(e) { e.preventDefault(); saveResident(); };
    }
}

function saveResident(id) {
    const form = document.getElementById('residentForm');
    const residents = JSON.parse(localStorage.getItem('residents') || '[]');
    if (id) {
        const idx = residents.findIndex(r => String(r.id) === String(id));
        residents[idx] = { ...residents[idx], name: form.name.value, age: form.age.value, address: form.address.value, contact: form.contact.value };
        localStorage.setItem('residents', JSON.stringify(residents));
        showMessage('Resident updated');
    } else {
        const newRes = { id: Date.now(), name: form.name.value, age: form.age.value, address: form.address.value, contact: form.contact.value };
        residents.push(newRes);
        localStorage.setItem('residents', JSON.stringify(residents));
        showMessage('Resident added');
    }
    showSection('residents');
}

function editResident(id) {
    const residents = JSON.parse(localStorage.getItem('residents') || '[]');
    const r = residents.find(x => String(x.id) === String(id));
    showResidentForm(r);
}

function deleteResident(id) {
    if (!confirm('Delete this resident?')) return;
    let residents = JSON.parse(localStorage.getItem('residents') || '[]');
    residents = residents.filter(r => String(r.id) !== String(id));
    localStorage.setItem('residents', JSON.stringify(residents));
    showMessage('Resident deleted', 'success');
    loadResidentsTable();
}

// ---------- Documents ----------
function renderDocumentsSection() {
    const html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>ID</th><th>Type</th><th>Resident</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody id="adminDocumentsTable"></tbody>
            </table>
        </div>
        <div style="margin-top:16px;"><button class="btn" onclick="showDocumentForm()">Add Document</button></div>
    `;
    const card = makeCard('Manage Documents', html);
    setTimeout(() => loadDocumentsTable(), 0);
    return card;
}

function loadDocumentsTable() {
    const tbody = document.getElementById('adminDocumentsTable');
    const docs = JSON.parse(localStorage.getItem('documents') || '[]');
    tbody.innerHTML = '';
    if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f0f0f0;font-style:italic;">No documents found.</td></tr>';
        return;
    }
    docs.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.id}</td><td>${d.type}</td><td>${d.resident}</td><td>${d.date}</td><td>${d.status}</td><td><button class="btn" onclick="editDocument('${d.id}')">Edit</button> <button class="btn" onclick="deleteDocument('${d.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function showDocumentForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="documentForm">
                <div class="form-group"><label>Type</label><input name="type" required></div>
                <div class="form-group"><label>Resident</label><input name="resident" required></div>
                <div class="form-group"><label>Date</label><input name="date" type="date" required></div>
                <div class="form-group"><label>Status</label><input name="status" required></div>
                <div><button class="btn" type="submit">Save</button></div>
            </form>
        </div>
    `;
    const container = document.getElementById('adminSections');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = formHtml;
    container.prepend(wrapper);
    const form = document.getElementById('documentForm');
    if (existing) {
        form.type.value = existing.type;
        form.resident.value = existing.resident;
        form.date.value = existing.date;
        form.status.value = existing.status;
        form.onsubmit = function(e) { e.preventDefault(); saveDocument(existing.id); };
    } else {
        form.onsubmit = function(e) { e.preventDefault(); saveDocument(); };
    }
}

function saveDocument(id) {
    const form = document.getElementById('documentForm');
    const docs = JSON.parse(localStorage.getItem('documents') || '[]');
    if (id) {
        const idx = docs.findIndex(d => String(d.id) === String(id));
        docs[idx] = { ...docs[idx], type: form.type.value, resident: form.resident.value, date: form.date.value, status: form.status.value };
        localStorage.setItem('documents', JSON.stringify(docs));
        showMessage('Document updated');
    } else {
        const newDoc = { id: Date.now(), type: form.type.value, resident: form.resident.value, date: form.date.value, status: form.status.value };
        docs.push(newDoc);
        localStorage.setItem('documents', JSON.stringify(docs));
        showMessage('Document added');
    }
    showSection('documents');
}

function editDocument(id) {
    const docs = JSON.parse(localStorage.getItem('documents') || '[]');
    const d = docs.find(x => String(x.id) === String(id));
    showDocumentForm(d);
}

function deleteDocument(id) {
    if (!confirm('Delete this document?')) return;
    let docs = JSON.parse(localStorage.getItem('documents') || '[]');
    docs = docs.filter(d => String(d.id) !== String(id));
    localStorage.setItem('documents', JSON.stringify(docs));
    showMessage('Document deleted', 'success');
    loadDocumentsTable();
}

// ---------- Events ----------
function renderEventsSection() {
    const html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>ID</th><th>Title</th><th>Date</th><th>Time</th><th>Location</th><th>Actions</th></tr></thead>
                <tbody id="adminEventsTable"></tbody>
            </table>
        </div>
        <div style="margin-top:16px;"><button class="btn" onclick="showEventForm()">Add Event</button></div>
    `;
    const card = makeCard('Manage Events', html);
    setTimeout(() => loadEventsTable(), 0);
    return card;
}

function loadEventsTable() {
    const tbody = document.getElementById('adminEventsTable');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    tbody.innerHTML = '';
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f0f0f0;font-style:italic;">No events found.</td></tr>';
        return;
    }
    events.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${ev.id}</td><td>${ev.title}</td><td>${ev.date}</td><td>${ev.time}</td><td>${ev.location}</td><td><button class="btn" onclick="editEvent('${ev.id}')">Edit</button> <button class="btn" onclick="deleteEvent('${ev.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function showEventForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="eventForm">
                <div class="form-group"><label>Title</label><input name="title" required></div>
                <div class="form-group"><label>Date</label><input name="date" type="date" required></div>
                <div class="form-group"><label>Time</label><input name="time" type="time" required></div>
                <div class="form-group"><label>Location</label><input name="location" required></div>
                <div><button class="btn" type="submit">Save</button></div>
            </form>
        </div>
    `;
    const container = document.getElementById('adminSections');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = formHtml;
    container.prepend(wrapper);
    const form = document.getElementById('eventForm');
    if (existing) {
        form.title.value = existing.title;
        form.date.value = existing.date;
        form.time.value = existing.time;
        form.location.value = existing.location;
        form.onsubmit = function(e) { e.preventDefault(); saveEvent(existing.id); };
    } else {
        form.onsubmit = function(e) { e.preventDefault(); saveEvent(); };
    }
}

function saveEvent(id) {
    const form = document.getElementById('eventForm');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    if (id) {
        const idx = events.findIndex(e => String(e.id) === String(id));
        events[idx] = { ...events[idx], title: form.title.value, date: form.date.value, time: form.time.value, location: form.location.value };
        localStorage.setItem('events', JSON.stringify(events));
        showMessage('Event updated');
    } else {
        const newEv = { id: Date.now(), title: form.title.value, date: form.date.value, time: form.time.value, location: form.location.value };
        events.push(newEv);
        localStorage.setItem('events', JSON.stringify(events));
        showMessage('Event added');
    }
    showSection('events');
}

function editEvent(id) { const events = JSON.parse(localStorage.getItem('events') || '[]'); const e = events.find(x => String(x.id) === String(id)); showEventForm(e); }
function deleteEvent(id) { if (!confirm('Delete this event?')) return; let events = JSON.parse(localStorage.getItem('events') || '[]'); events = events.filter(e => String(e.id) !== String(id)); localStorage.setItem('events', JSON.stringify(events)); showMessage('Event deleted', 'success'); loadEventsTable(); }

// ---------- Officials ----------
function renderOfficialsSection() {
    const html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Position</th><th>Contact</th><th>Actions</th></tr></thead>
                <tbody id="adminOfficialsTable"></tbody>
            </table>
        </div>
        <div style="margin-top:16px;"><button class="btn" onclick="showOfficialForm()">Add Official</button></div>
    `;
    const card = makeCard('Manage Officials', html);
    setTimeout(() => loadOfficialsTable(), 0);
    return card;
}

function loadOfficialsTable() {
    const tbody = document.getElementById('adminOfficialsTable');
    const officials = JSON.parse(localStorage.getItem('officials') || '[]');
    tbody.innerHTML = '';
    if (officials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f0f0f0;font-style:italic;">No officials found.</td></tr>';
        return;
    }
    officials.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.id}</td><td>${o.name}</td><td>${o.position}</td><td>${o.contact}</td><td><button class="btn" onclick="editOfficial('${o.id}')">Edit</button> <button class="btn" onclick="deleteOfficial('${o.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function showOfficialForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="officialForm">
                <div class="form-group"><label>Name</label><input name="name" required></div>
                <div class="form-group"><label>Position</label><input name="position" required></div>
                <div class="form-group"><label>Contact</label><input name="contact" required></div>
                <div><button class="btn" type="submit">Save</button></div>
            </form>
        </div>
    `;
    const container = document.getElementById('adminSections');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = formHtml;
    container.prepend(wrapper);
    const form = document.getElementById('officialForm');
    if (existing) {
        form.name.value = existing.name;
        form.position.value = existing.position;
        form.contact.value = existing.contact;
        form.onsubmit = function(e) { e.preventDefault(); saveOfficial(existing.id); };
    } else {
        form.onsubmit = function(e) { e.preventDefault(); saveOfficial(); };
    }
}

function saveOfficial(id) {
    const form = document.getElementById('officialForm');
    const officials = JSON.parse(localStorage.getItem('officials') || '[]');
    if (id) {
        const idx = officials.findIndex(o => String(o.id) === String(id));
        officials[idx] = { ...officials[idx], name: form.name.value, position: form.position.value, contact: form.contact.value };
        localStorage.setItem('officials', JSON.stringify(officials));
        showMessage('Official updated');
    } else {
        const newOff = { id: Date.now(), name: form.name.value, position: form.position.value, contact: form.contact.value };
        officials.push(newOff);
        localStorage.setItem('officials', JSON.stringify(officials));
        showMessage('Official added');
    }
    showSection('officials');
}

function editOfficial(id) { const officials = JSON.parse(localStorage.getItem('officials') || '[]'); const o = officials.find(x => String(x.id) === String(id)); showOfficialForm(o); }
function deleteOfficial(id) { if (!confirm('Delete this official?')) return; let officials = JSON.parse(localStorage.getItem('officials') || '[]'); officials = officials.filter(o => String(o.id) !== String(id)); localStorage.setItem('officials', JSON.stringify(officials)); showMessage('Official deleted', 'success'); loadOfficialsTable(); }

// ---------- Complaints ----------
function renderComplaintsSection() {
    const html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Title</th><th>Details</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody id="adminComplaintsTable"></tbody>
            </table>
        </div>
    `;
    const card = makeCard('Manage Complaints', html);
    setTimeout(() => loadComplaintsTable(), 0);
    return card;
}

function loadComplaintsTable() {
    const tbody = document.getElementById('adminComplaintsTable');
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    tbody.innerHTML = '';
    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#f0f0f0;font-style:italic;">No complaints found.</td></tr>';
        return;
    }
    complaints.forEach((c, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.title}</td><td>${c.details}</td><td>${c.date}</td><td><button class="btn" onclick="deleteComplaint(${idx})">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function deleteComplaint(idx) {
    if (!confirm('Delete this complaint?')) return;
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    complaints.splice(idx, 1);
    localStorage.setItem('complaints', JSON.stringify(complaints));
    showMessage('Complaint removed');
    loadComplaintsTable();
}

// Logout uses shared logout fun if available
function adminLogout() {
    // clear admin flag and session then redirect
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('currentUser');
    alert('Logged out');
    window.location.href = '../index.html';
}

// ---------- Users (admin management) ----------
function renderUsersSection() {
    const html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody id="adminUsersTable"></tbody>
            </table>
        </div>
        <div style="margin-top:16px;"><button class="btn" onclick="showUserForm()">Add User</button></div>
    `;
    const card = makeCard('Manage Users', html);
    setTimeout(() => loadUsersTable(), 0);
    return card;
}

function loadUsersTable() {
    const tbody = document.getElementById('adminUsersTable');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#f0f0f0;font-style:italic;">No users found.</td></tr>';
        return;
    }
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.username}</td><td>${u.role}</td><td><button class="btn" onclick="editUser('${u.username}')">Edit</button> <button class="btn" onclick="deleteUser('${u.username}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function showUserForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="userForm">
                <div class="form-group"><label>Username</label><input name="username" required></div>
                <div class="form-group"><label>Password</label><input name="password" type="password" required></div>
                <div class="form-group"><label>Role</label><select name="role"><option value="user">User</option><option value="admin">Admin</option></select></div>
                <div><button class="btn" type="submit">Save</button></div>
            </form>
        </div>
    `;
    const container = document.getElementById('adminSections');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = formHtml;
    container.prepend(wrapper);
    const form = document.getElementById('userForm');
    if (existing) {
        form.username.value = existing.username;
        form.password.value = existing.password;
        form.role.value = existing.role;
        form.username.disabled = true;
        form.onsubmit = function(e) { e.preventDefault(); saveUser(existing.username); };
    } else {
        form.onsubmit = function(e) { e.preventDefault(); saveUser(); };
    }
}

function saveUser(username) {
    const form = document.getElementById('userForm');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (username) {
        const idx = users.findIndex(u => u.username === username);
        users[idx] = { username: users[idx].username, password: form.password.value, role: form.role.value };
        localStorage.setItem('users', JSON.stringify(users));
        showMessage('User updated');
    } else {
        if (users.find(u => u.username === form.username.value)) { alert('Username exists'); return; }
        users.push({ username: form.username.value, password: form.password.value, role: form.role.value });
        localStorage.setItem('users', JSON.stringify(users));
        showMessage('User added');
    }
    showSection('users');
}

function editUser(username) { const users = JSON.parse(localStorage.getItem('users') || '[]'); const u = users.find(x => x.username === username); showUserForm(u); }
function deleteUser(username) { if (!confirm('Delete this user?')) return; let users = JSON.parse(localStorage.getItem('users') || '[]'); users = users.filter(u => u.username !== username); localStorage.setItem('users', JSON.stringify(users)); showMessage('User deleted', 'success'); loadUsersTable(); }

// ---------- Export / Import ----------
function exportAll() {
    const exportData = {
        residents: JSON.parse(localStorage.getItem('residents') || '[]'),
        documents: JSON.parse(localStorage.getItem('documents') || '[]'),
        events: JSON.parse(localStorage.getItem('events') || '[]'),
        officials: JSON.parse(localStorage.getItem('officials') || '[]'),
        complaints: JSON.parse(localStorage.getItem('complaints') || '[]'),
        users: JSON.parse(localStorage.getItem('users') || '[]')
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bms-export.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importAll(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.residents) localStorage.setItem('residents', JSON.stringify(data.residents));
            if (data.documents) localStorage.setItem('documents', JSON.stringify(data.documents));
            if (data.events) localStorage.setItem('events', JSON.stringify(data.events));
            if (data.officials) localStorage.setItem('officials', JSON.stringify(data.officials));
            if (data.complaints) localStorage.setItem('complaints', JSON.stringify(data.complaints));
            if (data.users) localStorage.setItem('users', JSON.stringify(data.users));
            showMessage('Data imported successfully');
            showSection('residents');
        } catch (err) {
            alert('Invalid import file');
        }
    };
    reader.readAsText(file);
}
