// Admin page script
(function(){
  function requireAdmin() {
    const u = BMS.currentUser();
    if (!u || u.role !== 'admin') {
      alert('Admin access required.');
      window.location.href = '/login.html';
      throw new Error('Admin required');
    }
    return u;
  }

  let currentSection = 'residents';

  function showSection(name) {
    requireAdmin();
    const container = document.getElementById('adminSections');
    container.innerHTML = '';
    currentSection = name;
    if (name === 'residents') return renderResidents(container);
    if (name === 'officials') return renderOfficials(container);
    if (name === 'events') return renderEvents(container);
    if (name === 'complaints') return renderComplaints(container);
    if (name === 'documents') return renderDocuments(container);
    if (name === 'users') return renderUsers(container);
    container.innerHTML = '<div class="content-card"><p>Select an action.</p></div>';
  }

  async function reloadList(listFn, tableId, renderRow) {
    const container = document.getElementById(tableId);
    if (!container) return;
    try {
      const data = await listFn();
      container.innerHTML = '';
      (data||[]).forEach(item => container.appendChild(renderRow(item)));
    } catch (err) { console.error(err); alert(err.error || 'Failed to load'); }
  }

  function renderRowForResident(r) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.resident_id}</td><td>${escapeHtml(r.name)}</td><td>${r.age||''}</td><td>${escapeHtml(r.address||'')}</td><td>${escapeHtml(r.contact||'')}</td><td><button class="btn" data-id="${r.resident_id}" onclick="adminEditResident(${r.resident_id})">Edit</button> <button class="btn" onclick="adminDeleteResident(${r.resident_id})">Delete</button></td>`;
    return tr;
  }

  window.adminEditResident = async function(id) {
    try {
      requireAdmin();
      const data = await BMS.getResident(id);
      const name = prompt('Name', data.name);
      if (name == null) return;
      const age = prompt('Age', data.age||'');
      const address = prompt('Address', data.address||'');
      const contact = prompt('Contact', data.contact||'');
      try {
        await BMS.updateResident(id, { name, age: Number(age)||null, address, contact });
        alert('Updated');
        reloadList(BMS.getResidents, 'residentsTable', renderRowForResident);
      } catch (err) { alert(err.error || 'Update failed'); }
    } catch (err) { console.error('Edit error:', err); alert('Edit failed: ' + err.message); }
  };

  window.adminDeleteResident = async function(id) {
    requireAdmin();
    if (!confirm('Delete resident?')) return;
    try { await BMS.apiFetch(`/api/residents/${id}`, 'DELETE'); alert('Deleted'); reloadList(BMS.getResidents, 'residentsTable', renderRowForResident); } catch (err) { alert(err.error || 'Delete failed'); }
  };

  function renderResidents(container) {
    container.innerHTML = `
      <div class="content-card">
        <h2>Manage Residents</h2>
        <form id="adminResidentForm">
          <div class="form-group"><label>Name</label><input name="name" required></div>
          <div class="form-group"><label>Age</label><input name="age" type="number"></div>
          <div class="form-group"><label>Address</label><input name="address"></div>
          <div class="form-group"><label>Contact</label><input name="contact"></div>
          <button class="btn" type="submit">Create Resident</button>
        </form>
      </div>
      <div class="content-card">
        <h2>Residents List</h2>
        <button class="btn" onclick="cleanupDuplicateResidents()" style="margin-bottom:10px;background:#f39c12;">🧹 Remove Duplicates</button>
        <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Address</th><th>Contact</th><th>Actions</th></tr></thead><tbody id="residentsTable"></tbody></table></div>
      </div>
    `;
    const form = document.getElementById('adminResidentForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form); const payload = { name: fd.get('name'), age: Number(fd.get('age'))||null, address: fd.get('address'), contact: fd.get('contact') };
      try { await BMS.createResident(payload); alert('Created'); form.reset(); reloadList(BMS.getResidents, 'residentsTable', renderRowForResident); } catch (err) { alert(err.error || 'Create failed'); }
    });
    reloadList(BMS.getResidents, 'residentsTable', renderRowForResident);
  }

  function renderOfficials(container) {
    container.innerHTML = `
      <div class="content-card">
        <h2>Manage Officials</h2>
        <form id="adminOfficialForm">
          <div class="form-group"><label>Name</label><input name="name" required></div>
          <div class="form-group"><label>Position</label><input name="position"></div>
          <div class="form-group"><label>Contact</label><input name="contact"></div>
          <button class="btn" type="submit">Create Official</button>
        </form>
      </div>
      <div class="content-card">
        <h2>Officials List</h2>
        <button class="btn" onclick="cleanupDuplicateOfficials()" style="margin-bottom:10px;background:#f39c12;">🧹 Remove Duplicates</button>
        <div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Position</th><th>Contact</th><th>Actions</th></tr></thead><tbody id="officialsTableAdmin"></tbody></table></div>
      </div>
    `;
    const form = document.getElementById('adminOfficialForm');
    form.addEventListener('submit', async (e) => { e.preventDefault(); const fd = new FormData(form); try { await BMS.createOfficial({ name: fd.get('name'), position: fd.get('position'), contact: fd.get('contact') }); alert('Created'); form.reset(); reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial); } catch (err) { alert(err.error || 'Create failed'); } });
    reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial);
  }

  function renderRowForOfficial(o) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(o.name)}</td><td>${escapeHtml(o.position||'')}</td><td>${escapeHtml(o.contact||'')}</td><td><button class="btn" onclick="adminEditOfficial(${o.official_id})">Edit</button> <button class="btn" onclick="adminDeleteOfficial(${o.official_id})">Delete</button></td>`;
    return tr;
  }
  
  window.adminEditOfficial = async function(id) {
    try {
      requireAdmin();
      const data = await BMS.getOfficials().then(list => list.find(x => x.official_id == id));
      if (!data) return alert('Official not found');
      const name = prompt('Name', data.name);
      if (name == null) return;
      const position = prompt('Position', data.position||'');
      if (position == null) return;
      const contact = prompt('Contact', data.contact||'');
      if (contact == null) return;
      await BMS.updateOfficial(id, { name, position, contact });
      alert('Updated');
      reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial);
    } catch (err) { console.error(err); alert(err.error || 'Update failed'); }
  };
  window.adminDeleteOfficial = async function(id) { if (!confirm('Delete official?')) return; try { await BMS.apiFetch(`/api/officials/${id}`, 'DELETE'); alert('Deleted'); reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial); } catch (err) { alert(err.error || 'Delete failed'); } };

  function renderEvents(container) {
    container.innerHTML = `
      <div class="content-card">
        <h2>Manage Events</h2>
        <form id="adminEventForm">
          <div class="form-group"><label>Title</label><input name="title" required></div>
          <div class="form-group"><label>Date</label><input name="date" type="date"></div>
          <div class="form-group"><label>Time</label><input name="time" type="time"></div>
          <div class="form-group"><label>Location</label><input name="location"></div>
          <button class="btn" type="submit">Create Event</button>
        </form>
      </div>
      <div class="content-card">
        <h2>Events List</h2>
        <div class="table-container"><table class="data-table"><thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Location</th><th>Actions</th></tr></thead><tbody id="eventsTableAdmin"></tbody></table></div>
      </div>
    `;
    const form = document.getElementById('adminEventForm');
    form.addEventListener('submit', async (e) => { e.preventDefault(); const fd = new FormData(form); try { await BMS.createEvent({ title: fd.get('title'), date: fd.get('date'), time: fd.get('time'), location: fd.get('location') }); alert('Created'); form.reset(); reloadList(BMS.getEvents, 'eventsTableAdmin', renderRowForEvent); } catch (err) { alert(err.error || 'Create failed'); } });
    reloadList(BMS.getEvents, 'eventsTableAdmin', renderRowForEvent);
  }

  function renderRowForEvent(ev) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(ev.title)}</td><td>${ev.date||''}</td><td>${ev.time||''}</td><td>${escapeHtml(ev.location||'')}</td><td><button class="btn" onclick="adminEditEvent(${ev.event_id})">Edit</button> <button class="btn" onclick="adminDeleteEvent(${ev.event_id})">Delete</button></td>`; return tr; }
  window.adminDeleteEvent = async function(id){ if(!confirm('Delete event?')) return; try{ await BMS.apiFetch(`/api/events/${id}`,'DELETE'); alert('Deleted'); reloadList(BMS.getEvents,'eventsTableAdmin',renderRowForEvent);}catch(err){alert(err.error||'Delete failed');}};

  window.adminEditEvent = async function(id){
    try{
      requireAdmin();
      const ev = (await BMS.getEvents()).find(x=>x.event_id==id);
      if(!ev) return alert('Event not found');
      const title = prompt('Title', ev.title); if(title==null) return;
      const date = prompt('Date (YYYY-MM-DD)', ev.date||''); if(date==null) return;
      const time = prompt('Time (HH:MM)', ev.time||''); if(time==null) return;
      const location = prompt('Location', ev.location||''); if(location==null) return;
      await BMS.updateEvent(id, { title, date, time, location });
      alert('Updated');
      reloadList(BMS.getEvents,'eventsTableAdmin',renderRowForEvent);
    }catch(err){ console.error(err); alert(err.error||'Update failed'); }
  };

  function renderComplaints(container) {
    container.innerHTML = `
      <div class="content-card">
        <h2>Complaints List</h2>
        <div class="table-container"><table class="data-table"><thead><tr><th>Title</th><th>Details</th><th>Date</th><th>Actions</th></tr></thead><tbody id="complaintsTableAdmin"></tbody></table></div>
      </div>
    `;
    reloadList(BMS.getComplaints, 'complaintsTableAdmin', renderRowForComplaint);
  }
  function renderRowForComplaint(c){ const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.details)}</td><td>${c.date||''}</td><td><button class="btn" onclick="adminChangeComplaintStatus(${c.complaint_id})">Change Status</button> <button class="btn" onclick="adminDeleteComplaint(${c.complaint_id})">Delete</button></td>`; return tr; }
  window.adminDeleteComplaint = async function(id){ if(!confirm('Delete complaint?')) return; try{ await BMS.apiFetch(`/api/complaints/${id}`,'DELETE'); alert('Deleted'); reloadList(BMS.getComplaints,'complaintsTableAdmin',renderRowForComplaint);}catch(err){alert(err.error||'Delete failed');}};

  window.adminChangeComplaintStatus = async function(id){
    try{
      requireAdmin();
      const c = (await BMS.getComplaints()).find(x=>x.complaint_id==id);
      if(!c) return alert('Complaint not found');
      const status = prompt('Status (Pending/Resolved)', c.status||'Pending'); if(status==null) return;
      await BMS.updateComplaint(id, { title: c.title, details: c.details, status });
      alert('Status updated');
      reloadList(BMS.getComplaints,'complaintsTableAdmin',renderRowForComplaint);
    }catch(err){ console.error(err); alert(err.error||'Status change failed'); }
  };

  function renderDocuments(container){ container.innerHTML = `
    <div class="content-card">
      <h2>Documents List</h2>
      <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Type</th><th>Resident</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="documentsTableAdmin"></tbody></table></div>
    </div>`;
    reloadList(BMS.getDocuments,'documentsTableAdmin',renderRowForDocument);
  }
  function renderRowForDocument(d){
    const tr=document.createElement('tr');
    const status = String(d.status||'').toLowerCase();
    const actions = [];
    if (status === 'issued') {
      actions.push(`<button class="btn" onclick="adminPrintDocument(${d.document_id})">Print</button>`);
    } else {
      actions.push(`<button class="btn" onclick="adminApproveDocument(${d.document_id})">Approve</button>`);
      actions.push(`<button class="btn" onclick="adminEditDocument(${d.document_id})">Edit</button>`);
    }
    actions.push(`<button class="btn" onclick="adminDeleteDocument(${d.document_id})">Delete</button>`);
    tr.innerHTML = `<td>${d.document_id}</td><td>${escapeHtml(d.type)}</td><td>${d.resident||''}</td><td>${d.date||''}</td><td>${escapeHtml(d.status||'')}</td><td>${actions.join(' ')}</td>`;
    return tr;
  }
  window.adminDeleteDocument = async function(id){ if(!confirm('Delete document?')) return; try{ await BMS.apiFetch(`/api/documents/${id}`,'DELETE'); alert('Deleted'); reloadList(BMS.getDocuments,'documentsTableAdmin',renderRowForDocument);}catch(err){alert(err.error||'Delete failed');}};

  window.adminEditDocument = async function(id){
    try{
      requireAdmin();
      const d = (await BMS.getDocuments()).find(x=>x.document_id==id);
      if(!d) return alert('Document not found');
      const status = prompt('Status (Processing/Completed)', d.status||'Processing'); if(status==null) return;
      await BMS.updateDocument(id, { type: d.type, resident: d.resident_id || d.resident, date: d.date, status });
      alert('Updated');
      reloadList(BMS.getDocuments,'documentsTableAdmin',renderRowForDocument);
    }catch(err){ console.error(err); alert(err.error||'Update failed'); }
  };

  window.adminApproveDocument = async function(id) {
    try {
      requireAdmin();
      await BMS.updateDocument(id, { status: 'Issued' });
      alert('Document approved and issued');
      reloadList(BMS.getDocuments,'documentsTableAdmin',renderRowForDocument);
    } catch (err) { console.error(err); alert(err.error || 'Approve failed'); }
  };

  window.adminPrintDocument = function(id) {
    // open a printable window with basic document info
    (async () => {
      try {
        const docs = await BMS.getDocuments();
        const d = (docs||[]).find(x=>x.document_id==id);
        if (!d) return alert('Document not found');
        const w = window.open('', '_blank');
        const html = `<!doctype html><html><head><title>Document ${d.document_id}</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:6px;border:1px solid #ccc}</style></head><body><h1>Barangay Document - ${escapeHtml(d.type)}</h1><table><tr><td><strong>ID</strong></td><td>${d.document_id}</td></tr><tr><td><strong>Type</strong></td><td>${escapeHtml(d.type)}</td></tr><tr><td><strong>Resident</strong></td><td>${d.resident||''}</td></tr><tr><td><strong>Date</strong></td><td>${d.date||''}</td></tr><tr><td><strong>Status</strong></td><td>${d.status||''}</td></tr></table><p style="margin-top:20px">Signature: ________________________</p><script>window.onload=function(){window.print();}</script></body></html>`;
        w.document.write(html);
        w.document.close();
      } catch (err) { console.error(err); alert('Could not open print view'); }
    })();
  };

  function renderUsers(container) {
    container.innerHTML = `
      <div class="content-card">
        <h2>Manage Users</h2>
        <form id="adminUserForm">
          <div class="form-group"><label>Full Name</label><input name="full_name" required></div>
          <div class="form-group"><label>Username</label><input name="username" required></div>
          <div class="form-group"><label>Password</label><input name="password" type="password" required></div>
          <div class="form-group"><label>Role</label><select name="role"><option value="resident">resident</option><option value="official">official</option><option value="admin">admin</option></select></div>
          <button class="btn" type="submit">Create User</button>
        </form>
      </div>
      <div class="content-card">
        <h2>Users List</h2>
        <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Full Name</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody id="usersTable"></tbody></table></div>
      </div>
    `;

    const form = document.getElementById('adminUserForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await BMS.apiFetch('/api/users', 'POST', { username: fd.get('username'), password: fd.get('password'), full_name: fd.get('full_name'), role: fd.get('role') });
        alert('User created');
        form.reset();
        reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser);
      } catch (err) { alert(err.error || 'Create user failed'); }
    });

    reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser);
  }

  function renderRowForUser(u) {
    const tr = document.createElement('tr');
    const statusText = u.approved ? 'Approved' : 'Pending';
    const statusColor = u.approved ? '#27ae60' : '#f39c12';
    tr.innerHTML = `
      <td>${u.user_id}</td>
      <td>${escapeHtml(u.full_name || '')}</td>
      <td>${escapeHtml(u.username)}</td>
      <td>
        <select class="role-select" data-id="${u.user_id}" onchange="adminChangeUserRole(${u.user_id}, this.value)">
          <option value="resident" ${u.role === 'resident' ? 'selected' : ''}>resident</option>
          <option value="official" ${u.role === 'official' ? 'selected' : ''}>official</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td><span style="color:${statusColor};font-weight:bold;">${statusText}</span></td>
      <td>
        <button class="btn" onclick="adminApproveUser(${u.user_id}, ${u.approved ? 'false' : 'true'})" style="margin-right:6px;">${u.approved ? 'Revoke' : 'Approve'}</button>
        <button class="btn" onclick="adminEditUser(${u.user_id})" style="margin-right:6px;">Edit</button>
        <button class="btn" onclick="adminDeleteUser(${u.user_id})">Delete</button>
      </td>
    `;
    return tr;
  }

  window.adminChangeUserRole = async function(id, newRole) {
    try {
      await BMS.apiFetch(`/api/users/${id}`, 'PUT', { role: newRole });
      alert('Role updated');
      reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser);
    } catch (err) { alert(err.error || 'Role change failed'); }
  };

  window.adminApproveUser = async function(id, approve) {
    try {
      await BMS.apiFetch(`/api/users/${id}`, 'PUT', { approved: approve });
      alert(approve ? 'User approved' : 'User approval revoked');
      reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser);
    } catch (err) { alert(err.error || 'Approval change failed'); }
  };

  window.adminEditUser = async function(id) {
    try {
      requireAdmin();
      const data = await BMS.apiFetch(`/api/users/${id}`);
      const fullName = prompt('Full Name', data.full_name || '');
      if (fullName == null) return;
      const username = prompt('Username', data.username || '');
      if (username == null) return;
      const changePassword = confirm('Do you want to set a new password for this user?');
      let password = undefined;
      if (changePassword) {
        password = prompt('New password (min 6 chars)');
        if (password == null) return; // cancelled
        if (password.length > 0 && password.length < 6) return alert('Password must be at least 6 characters');
      }
      try {
        const payload = { full_name: fullName, username };
        if (password !== undefined && password.length > 0) payload.password = password;
        await BMS.apiFetch(`/api/users/${id}`, 'PUT', payload);
        alert('User updated');
        reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser);
      } catch (err) { alert(err.error || 'Update failed'); }
    } catch (err) { console.error('Edit user error:', err); alert('Edit failed: ' + (err.message || err.error)); }
  };

  window.adminDeleteUser = async function(id) { if (!confirm('Delete user?')) return; try { await BMS.apiFetch(`/api/users/${id}`, 'DELETE'); alert('Deleted'); reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser); } catch (err) { alert(err.error || 'Delete failed'); } };

  function exportAll(){ requireAdmin(); (async ()=>{
    const out = {};
    try{
      out.residents = await BMS.getResidents();
      out.officials = await BMS.getOfficials();
      out.events = await BMS.getEvents();
      out.complaints = await BMS.getComplaints();
      out.documents = await BMS.getDocuments();
      out.users = await BMS.apiFetch('/api/users');
      const blob = new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `bms-export-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove();
    }catch(err){ alert(err.error || 'Export failed'); }
  })(); }

  async function importAll(e){ requireAdmin(); const file = e.target.files && e.target.files[0]; if(!file) return; try{ const txt = await file.text(); const obj = JSON.parse(txt); if(obj.residents){ for(const r of obj.residents){ try{ await BMS.createResident({ name: r.name, age: r.age, address: r.address, contact: r.contact }); }catch(e){ /* skip errors */ } } }
    if(obj.officials){ for(const o of obj.officials){ try{ await BMS.createOfficial({ name:o.name, position:o.position, contact:o.contact }); }catch(e){} } }
    alert('Import attempted (duplicates/skipped are possible)');
  }catch(err){ alert('Import failed: ' + (err.message||err.error)); }
  }
  window.importAll = importAll;

  window.adminLogout = function(){ BMS.logout(); window.location.href = '/login.html'; };

  window.cleanupDuplicateOfficials = async function() {
    if (!confirm('This will keep only the first entry for each name and delete duplicates. Continue?')) return;
    try {
      const officials = await BMS.getOfficials();
      const seen = new Map();
      const toDelete = [];
      
      officials.forEach(o => {
        const key = (o.name || '').toLowerCase().trim();
        if (!seen.has(key)) {
          seen.set(key, o.official_id);
        } else {
          toDelete.push(o.official_id);
        }
      });
      
      if (toDelete.length === 0) {
        alert('No duplicates found!');
        return;
      }
      
      let deleted = 0;
      for (const id of toDelete) {
        try {
          await BMS.apiFetch(`/api/officials/${id}`, 'DELETE');
          deleted++;
        } catch (e) {
          console.error('Failed to delete official', id, e);
        }
      }
      
      alert(`Deleted ${deleted} duplicate official(s)`);
      reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial);
    } catch (err) { alert('Cleanup failed: ' + (err.error || err.message)); }
  };

  window.cleanupDuplicateResidents = async function() {
    if (!confirm('This will keep only the first entry for each name and delete duplicates. Continue?')) return;
    try {
      const residents = await BMS.getResidents();
      const seen = new Map(); // name -> first id
      const toDelete = [];
      
      residents.forEach(r => {
        const key = (r.name || '').toLowerCase().trim();
        if (!seen.has(key)) {
          seen.set(key, r.resident_id);
        } else {
          toDelete.push(r.resident_id);
        }
      });
      
      if (toDelete.length === 0) {
        alert('No duplicates found!');
        return;
      }
      
      let deleted = 0;
      for (const id of toDelete) {
        try {
          await BMS.apiFetch(`/api/residents/${id}`, 'DELETE');
          deleted++;
        } catch (e) {
          console.error('Failed to delete resident', id, e);
        }
      }
      
      alert(`Deleted ${deleted} duplicate resident(s)`);
      reloadList(BMS.getResidents, 'residentsTable', renderRowForResident);
    } catch (err) { alert('Cleanup failed: ' + (err.error || err.message)); }
  };

  function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // On load, ensure admin session
  document.addEventListener('DOMContentLoaded', () => {
    try{ requireAdmin(); }catch(e){ return; }
    // default show residents
    showSection('residents');

    // subscribe to server-sent events to keep admin UI realtime
    if (window.BMS && window.BMS.connectStream) {
      try {
        const es = window.BMS.connectStream((msg) => {
          if (!msg || !msg.type) return;
          // reload relevant tables based on event type when visible
          const t = msg.type;
          try {
            if (t.startsWith('resident') && currentSection === 'residents') reloadList(BMS.getResidents, 'residentsTable', renderRowForResident);
            if (t.startsWith('official') && currentSection === 'officials') reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial);
            if (t.startsWith('event') && currentSection === 'events') reloadList(BMS.getEvents, 'eventsTableAdmin', renderRowForEvent);
            if (t.startsWith('complaint') && currentSection === 'complaints') reloadList(BMS.getComplaints, 'complaintsTableAdmin', renderRowForComplaint);
            if (t.startsWith('document') && currentSection === 'documents') reloadList(BMS.getDocuments, 'documentsTableAdmin', renderRowForDocument);
            if (t.startsWith('user') && currentSection === 'users') reloadList(() => BMS.apiFetch('/api/users'), 'usersTable', renderRowForUser);
          } catch (e) { console.error('Error handling stream event', e); }
        });
      } catch (e) { console.warn('Could not connect SSE', e); }
    }
  });

  // expose showSection for button onclick
  window.showSection = showSection;
})();
