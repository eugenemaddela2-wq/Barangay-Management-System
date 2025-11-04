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

// Inline success message near a given container (element) - fades out
function showInlineMessage(message, containerEl) {
    try {
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = 'background:linear-gradient(90deg,#2ecc71,#27ae60);color:#fff;padding:8px 12px;border-radius:6px;display:inline-block;margin-bottom:8px;opacity:0;transition:opacity .25s,transform .25s;transform:translateY(-6px);font-weight:600;box-shadow:0 4px 10px rgba(0,0,0,0.12);z-index:9999;';
        // insert at top of container
        containerEl.insertBefore(msg, containerEl.firstChild);
        // animate in
        requestAnimationFrame(() => { msg.style.opacity = '1'; msg.style.transform = 'translateY(0)'; });
        // remove after 2 seconds
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transform = 'translateY(-6px)';
            setTimeout(() => { if (msg && msg.parentElement) msg.parentElement.removeChild(msg); }, 250);
        }, 1800);
    } catch (e) { console.warn('showInlineMessage failed', e); }
}

// Highlight and scroll to a table row inside a tbody by matching a column value.
function highlightAndScrollRow(tbodyId, columnIndex, matchValue) {
    try {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const normalized = String(matchValue).trim().toLowerCase();
        const tr = rows.find(r => {
            const td = r.children[columnIndex];
            if (!td) return false;
            return String(td.textContent || td.innerText || '').trim().toLowerCase() === normalized;
        });
        if (!tr) return false;
        // scroll into view smoothly
        tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // flash background
        const orig = tr.style.backgroundColor;
        tr.style.transition = 'background-color .6s';
        tr.style.backgroundColor = 'rgba(46,204,113,0.18)';
        setTimeout(() => { tr.style.backgroundColor = orig || ''; }, 900);
        return true;
    } catch (e) { console.warn('highlightAndScrollRow failed', e); return false; }
}

// ---------- Residents ----------
function renderResidentsSection() {
    const residents = JSON.parse(localStorage.getItem('residents') || '[]');
    let html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Age</th><th>Address</th><th>Contact</th><th>Actions</th></tr></thead>
                <tbody id="adminResidentsTable"></tbody>
            </table>
        </div>
        <div style="margin-top:16px; align-items:right; display:flex;">
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
        tr.innerHTML = `<td>${r.id}</td><td>${r.username || ''}</td><td>${r.name}</td><td>${r.age}</td><td>${r.address}</td><td>${r.contact}</td><td><button class="btn" onclick="editResident('${r.id}')">Edit</button> <button class="btn" onclick="deleteResident('${r.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function showResidentForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="residentForm">
                <div class="form-group"><label>Username (optional)</label><input name="username" placeholder="username (if linked to a user)"></div>
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
    // If editing an existing resident, populate fields and save to that id
    if (existing) {
        form.username.value = existing.username || '';
        form.name.value = existing.name || '';
        form.age.value = existing.age || '';
        form.address.value = existing.address || '';
        form.contact.value = existing.contact || '';
        form.onsubmit = function(e) { e.preventDefault(); saveResident(existing.id); };
    } else {
        // Creating new resident
        form.onsubmit = function(e) { e.preventDefault(); saveResident(); };
    }
}

function saveResident(id) {
    const form = document.getElementById('residentForm');
    const residents = JSON.parse(localStorage.getItem('residents') || '[]');
    if (id) {
        const idx = residents.findIndex(r => String(r.id) === String(id));
        residents[idx] = { ...residents[idx], username: form.username.value || residents[idx].username, name: form.name.value, age: form.age.value, address: form.address.value, contact: form.contact.value };
        localStorage.setItem('residents', JSON.stringify(residents));
        showMessage('Resident updated');
    } else {
        const newRes = { id: Date.now(), username: form.username.value || '', name: form.name.value, age: form.age.value, address: form.address.value, contact: form.contact.value };
        residents.push(newRes);
        localStorage.setItem('residents', JSON.stringify(residents));
        showMessage('Resident added');
    }
    // Close the form if present and refresh the residents list
    const formEl = document.getElementById('residentForm');
    if (formEl) {
        // remove the nearest ancestor that is a direct child of #adminSections
        let top = formEl;
        while (top.parentElement && top.parentElement.id !== 'adminSections') {
            top = top.parentElement;
        }
        if (top && top.parentElement && top.parentElement.id === 'adminSections') {
            top.parentElement.removeChild(top);
        } else if (formEl.parentElement) {
            // fallback: remove immediate parent
            formEl.parentElement.remove();
        }
    }
    showSection('residents');
    // Refresh table to show updated data immediately
    const targetId = id || (typeof newRes !== 'undefined' && newRes && newRes.id);
    setTimeout(() => {
        if (typeof loadResidentsTable === 'function') loadResidentsTable();
        setTimeout(() => {
            const sectionCard = document.querySelector('#adminSections .content-card');
            if (sectionCard) showInlineMessage('Saved ✓', sectionCard);
            if (targetId) highlightAndScrollRow('adminResidentsTable', 0, String(targetId));
        }, 120);
    }, 50);
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

async function loadDocumentsTable() {
    const tbody = document.getElementById('adminDocumentsTable');
    tbody.innerHTML = '';

    // Try server first
    try {
        const health = await fetch('/health');
        if (health.ok) {
            const res = await fetch('/api/documents');
            if (res.ok) {
                const docs = await res.json();
                if (!docs || docs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f0f0f0;font-style:italic;">No documents found.</td></tr>';
                    return;
                }
                docs.forEach(d => {
                    const tr = document.createElement('tr');
                    const statusOptions = ['Pending','Processing','Ready for Pickup','Issued','Completed'];
                    const selectHtml = `<select onchange="updateDocumentStatus('${d.id}', this.value)">` + statusOptions.map(s => `<option value="${s}" ${d.status===s? 'selected':''}>${s}</option>`).join('') + `</select>`;
                    tr.innerHTML = `<td>${d.id}</td><td>${d.type}</td><td>${d.resident}</td><td>${d.date}</td><td>${selectHtml}</td><td><button class="btn" onclick="editDocument('${d.id}')">Edit</button> <button class="btn" onclick="deleteDocument('${d.id}')">Delete</button></td>`;
                    tbody.appendChild(tr);
                });
                return;
            }
        }
    } catch (err) {
        // fall through to localStorage fallback
        console.warn('Server documents fetch failed, falling back to localStorage', err);
    }

    // Fallback: localStorage
    const docs = JSON.parse(localStorage.getItem('documents') || '[]');
    if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f0f0f0;font-style:italic;">No documents found.</td></tr>';
        return;
    }
    docs.forEach(d => {
        const tr = document.createElement('tr');
        const statusOptions = ['Pending','Processing','Ready for Pickup','Issued','Completed'];
        const selectHtml = `<select onchange="updateDocumentStatus('${d.id}', this.value)">` + statusOptions.map(s => `<option value="${s}" ${d.status===s? 'selected':''}>${s}</option>`).join('') + `</select>`;
        tr.innerHTML = `<td>${d.id}</td><td>${d.type}</td><td>${d.resident}</td><td>${d.date}</td><td>${selectHtml}</td><td><button class="btn" onclick="editDocument('${d.id}')">Edit</button> <button class="btn" onclick="deleteDocument('${d.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

// Update document status in global documents and per-user copy
async function updateDocumentStatus(id, newStatus) {
    // Try to update via server API (GET current -> PUT with full payload)
    try {
        const health = await fetch('/health');
        if (health.ok) {
            const getRes = await fetch(`/api/documents/${id}`);
            if (getRes.ok) {
                const doc = await getRes.json();
                // prepare payload with all required fields for the server PUT handler
                const payload = { type: doc.type, resident: doc.resident, date: doc.date, status: newStatus };
                const putRes = await fetch(`/api/documents/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (putRes.ok) {
                    showMessage('Document status updated (server)');
                    // Also update local copies if present
                    const docs = JSON.parse(localStorage.getItem('documents') || '[]');
                    const idx = docs.findIndex(d => String(d.id) === String(id));
                    if (idx !== -1) { docs[idx].status = newStatus; localStorage.setItem('documents', JSON.stringify(docs)); }
                    const resident = doc.resident;
                    if (resident) {
                        const key = `documents_${resident}`;
                        const personal = JSON.parse(localStorage.getItem(key) || '[]');
                        const pidx = personal.findIndex(p => String(p.id) === String(id));
                        if (pidx !== -1) { personal[pidx].status = newStatus; localStorage.setItem(key, JSON.stringify(personal)); }
                    }
                    loadDocumentsTable();
                    return;
                }
            }
        }
    } catch (err) {
        console.warn('Server update failed, falling back to localStorage', err);
    }

    // Fallback: update localStorage
    const docs = JSON.parse(localStorage.getItem('documents') || '[]');
    const idx = docs.findIndex(d => String(d.id) === String(id));
    if (idx === -1) return;
    docs[idx].status = newStatus;
    localStorage.setItem('documents', JSON.stringify(docs));

    // update per-user personal list if exists
    const resident = docs[idx].resident;
    if (resident) {
        const key = `documents_${resident}`;
        const personal = JSON.parse(localStorage.getItem(key) || '[]');
        const pidx = personal.findIndex(p => String(p.id) === String(id));
        if (pidx !== -1) {
            personal[pidx].status = newStatus;
            localStorage.setItem(key, JSON.stringify(personal));
        }
    }

    showMessage('Document status updated');
    loadDocumentsTable();
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
    if (!confirm('Are you sure you want to logout?')) return;
    // Call server logout endpoint (best-effort)
    try { fetch('/logout', { method: 'POST', credentials: 'include' }).catch(() => {}); } catch (e) { }
    // clear admin flag and session then redirect using replace so back button won't return
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('currentUser');
    try { window.location.replace('/index.html'); } catch (e) { window.location.href = '../index.html'; }
}

// ---------- Users (admin management) ----------
function renderUsersSection() {
    const html = `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f0f0f0;font-style:italic;">No users found.</td></tr>';
        return;
    }
    users.forEach(u => {
        const tr = document.createElement('tr');
        const statusOptions = ['Pending','Active','Rejected','Admin'];
        const selectHtml = `<select onchange="updateUserStatus('${u.username}', this.value)">` + statusOptions.map(s => `<option value="${s}" ${u.status===s? 'selected':''}>${s}</option>`).join('') + `</select>`;
        tr.innerHTML = `<td>${u.username}</td><td>${u.name || ''}</td><td>${u.role}</td><td>${selectHtml}</td><td><button class="btn" onclick="editUser('${u.username}')">Edit</button> <button class="btn" onclick="deleteUser('${u.username}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

function updateUserStatus(username, newStatus) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return;
    users[idx].status = newStatus;
    localStorage.setItem('users', JSON.stringify(users));

    // If status changed to Active, ensure resident record exists
    if (newStatus === 'Active') {
        const user = users[idx];
        let residents = JSON.parse(localStorage.getItem('residents') || '[]');
        // prefer matching by username if present, otherwise fall back to name match
        const lname = (user.name || user.username).toLowerCase();
        const existing = residents.find(r => (r.username && String(r.username).toLowerCase() === String(user.username).toLowerCase()) || (r.name && r.name.toLowerCase() === lname));
        if (!existing) {
            const newRes = {
                id: Date.now(),
                username: user.username,
                name: user.name || user.username,
                age: user.age || 25,
                address: user.address || 'Barangay Resident',
                contact: user.contact || '09000000000'
            };
            residents.push(newRes);
            localStorage.setItem('residents', JSON.stringify(residents));
            // Auto-open Manage Residents so admin sees it instantly
            try {
                showSection('residents');
            } catch (e) { /* ignore if showSection not available */ }
            // After section is rendered, refresh the table and highlight the new resident
            setTimeout(() => {
                try { if (typeof loadResidentsTable === 'function') loadResidentsTable(); } catch (e) { }
                const sectionCard = document.querySelector('#adminSections .content-card');
                if (sectionCard) showInlineMessage('Resident created ✓', sectionCard);
                // highlight by id (column 0 is ID)
                try { highlightAndScrollRow('adminResidentsTable', 0, String(newRes.id)); } catch (e) { }
            }, 120);
        }
    }

    // If status set to Rejected, we leave residents untouched
    showMessage('User status updated');
    loadUsersTable();
}

function showUserForm(existing) {
    const formHtml = `
        <div class="content-card">
            <form id="userForm">
                <div class="form-group"><label>Username</label><input name="username" required></div>
                <div class="form-group"><label>Full Name</label><input name="name" required></div>
                <div class="form-group"><label>Password</label><input name="password" type="password" required></div>
                <div class="form-group"><label>Role</label><select name="role"><option value="user">User</option><option value="admin">Admin</option></select></div>
                <div class="form-group"><label>Status</label><select name="status"><option value="Pending">Pending</option><option value="Active">Active</option><option value="Rejected">Rejected</option></select></div>
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
        form.name.value = existing.name || '';
        form.password.value = existing.password || '';
        form.role.value = existing.role;
        form.status.value = existing.status || 'Pending';
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
        users[idx] = { id: users[idx].id || Date.now(), username: users[idx].username, name: form.name.value, password: form.password.value, role: form.role.value, status: form.status.value };
        localStorage.setItem('users', JSON.stringify(users));
        showMessage('User updated');
        // If user activated, ensure resident record exists
        if (form.status.value === 'Active') {
            const user = users[idx];
            let residents = JSON.parse(localStorage.getItem('residents') || '[]');
            const existing = residents.find(r => r.name.toLowerCase() === (user.name || user.username).toLowerCase());
            if (!existing) {
                residents.push({ id: Date.now(), username: user.username, name: user.name || user.username, age: 25, address: 'Barangay Resident', contact: '09000000000' });
                localStorage.setItem('residents', JSON.stringify(residents));
            }
        }
    } else {
        if (users.find(u => u.username === form.username.value)) { alert('Username exists'); return; }
        const newUser = { id: Date.now(), username: form.username.value, name: form.name.value, password: form.password.value, role: form.role.value, status: form.status.value || 'Pending' };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        showMessage('User added');
        // If admin created and set Active, create resident immediately
        if (newUser.status === 'Active') {
            let residents = JSON.parse(localStorage.getItem('residents') || '[]');
            residents.push({ id: Date.now(), username: newUser.username, name: newUser.name || newUser.username, age: 25, address: 'Barangay Resident', contact: '09000000000' });
            localStorage.setItem('residents', JSON.stringify(residents));
        }
    }
    // Close the user form if present and refresh the users table
    const formEl = document.getElementById('userForm');
    if (formEl) {
        // remove the nearest ancestor that is a direct child of #adminSections
        let top = formEl;
        while (top.parentElement && top.parentElement.id !== 'adminSections') {
            top = top.parentElement;
        }
        if (top && top.parentElement && top.parentElement.id === 'adminSections') {
            top.parentElement.removeChild(top);
        } else if (formEl.parentElement) {
            // fallback: remove immediate parent
            formEl.parentElement.remove();
        }
    }
    showSection('users');
    // Refresh table to show updated data immediately
    setTimeout(() => {
        if (typeof loadUsersTable === 'function') loadUsersTable();
        // after table render, show inline message and scroll to the updated username
        setTimeout(() => {
            const targetUsername = username || (typeof newUser !== 'undefined' && newUser && newUser.username) || (users[idx] && users[idx].username);
            const sectionCard = document.querySelector('#adminSections .content-card');
            if (sectionCard) showInlineMessage('Saved ✓', sectionCard);
            if (targetUsername) highlightAndScrollRow('adminUsersTable', 0, targetUsername);
        }, 120);
    }, 50);
}

function editUser(username) { const users = JSON.parse(localStorage.getItem('users') || '[]'); const u = users.find(x => x.username === username); showUserForm(u); }
function deleteUser(username) { if (!confirm('Delete this user?')) return; let users = JSON.parse(localStorage.getItem('users') || '[]'); const user = users.find(u => u.username === username); users = users.filter(u => u.username !== username); localStorage.setItem('users', JSON.stringify(users));
    // Also delete associated resident record(s) by matching name
    if (user) {
        let residents = JSON.parse(localStorage.getItem('residents') || '[]');
        if (user.username) {
            residents = residents.filter(r => String(r.username || '').toLowerCase() !== String(user.username).toLowerCase());
        } else if (user.name) {
            residents = residents.filter(r => r.name.toLowerCase() !== user.name.toLowerCase());
        }
        localStorage.setItem('residents', JSON.stringify(residents));
    }
    showMessage('User deleted', 'success'); loadUsersTable(); }

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
