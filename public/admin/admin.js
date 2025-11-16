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

  function showSection(name) {
    requireAdmin();
    const container = document.getElementById('adminSections');
    container.innerHTML = '';
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
        <div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Position</th><th>Contact</th><th>Actions</th></tr></thead><tbody id="officialsTableAdmin"></tbody></table></div>
      </div>
    `;
    const form = document.getElementById('adminOfficialForm');
    form.addEventListener('submit', async (e) => { e.preventDefault(); const fd = new FormData(form); try { await BMS.createOfficial({ name: fd.get('name'), position: fd.get('position'), contact: fd.get('contact') }); alert('Created'); form.reset(); reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial); } catch (err) { alert(err.error || 'Create failed'); } });
    reloadList(BMS.getOfficials, 'officialsTableAdmin', renderRowForOfficial);
  }

  function renderRowForOfficial(o) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(o.name)}</td><td>${escapeHtml(o.position||'')}</td><td>${escapeHtml(o.contact||'')}</td><td><button class="btn" onclick="adminDeleteOfficial(${o.official_id})">Delete</button></td>`;
    return tr;
  }
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

  function renderRowForEvent(ev) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(ev.title)}</td><td>${ev.date||''}</td><td>${ev.time||''}</td><td>${escapeHtml(ev.location||'')}</td><td><button class="btn" onclick="adminDeleteEvent(${ev.event_id})">Delete</button></td>`; return tr; }
  window.adminDeleteEvent = async function(id){ if(!confirm('Delete event?')) return; try{ await BMS.apiFetch(`/api/events/${id}`,'DELETE'); alert('Deleted'); reloadList(BMS.getEvents,'eventsTableAdmin',renderRowForEvent);}catch(err){alert(err.error||'Delete failed');}};

  function renderComplaints(container) {
    container.innerHTML = `
      <div class="content-card">
        <h2>Complaints List</h2>
        <div class="table-container"><table class="data-table"><thead><tr><th>Title</th><th>Details</th><th>Date</th><th>Actions</th></tr></thead><tbody id="complaintsTableAdmin"></tbody></table></div>
      </div>
    `;
    reloadList(BMS.getComplaints, 'complaintsTableAdmin', renderRowForComplaint);
  }
  function renderRowForComplaint(c){ const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.details)}</td><td>${c.date||''}</td><td><button class="btn" onclick="adminDeleteComplaint(${c.complaint_id})">Delete</button></td>`; return tr; }
  window.adminDeleteComplaint = async function(id){ if(!confirm('Delete complaint?')) return; try{ await BMS.apiFetch(`/api/complaints/${id}`,'DELETE'); alert('Deleted'); reloadList(BMS.getComplaints,'complaintsTableAdmin',renderRowForComplaint);}catch(err){alert(err.error||'Delete failed');}};

  function renderDocuments(container){ container.innerHTML = `
    <div class="content-card">
      <h2>Documents List</h2>
      <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Type</th><th>Resident</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="documentsTableAdmin"></tbody></table></div>
    </div>`;
    reloadList(BMS.getDocuments,'documentsTableAdmin',renderRowForDocument);
  }
  function renderRowForDocument(d){ const tr=document.createElement('tr'); tr.innerHTML=`<td>${d.document_id}</td><td>${escapeHtml(d.type)}</td><td>${d.resident||''}</td><td>${d.date||''}</td><td>${escapeHtml(d.status||'')}</td><td><button class="btn" onclick="adminDeleteDocument(${d.document_id})">Delete</button></td>`; return tr; }
  window.adminDeleteDocument = async function(id){ if(!confirm('Delete document?')) return; try{ await BMS.apiFetch(`/api/documents/${id}`,'DELETE'); alert('Deleted'); reloadList(BMS.getDocuments,'documentsTableAdmin',renderRowForDocument);}catch(err){alert(err.error||'Delete failed');}};

  function renderUsers(container){ container.innerHTML = `
    <div class="content-card">
      <h2>Manage Users</h2>
      <form id="adminUserForm">
        <div class="form-group"><label>Username</label><input name="username" required></div>
        <div class="form-group"><label>Password</label><input name="password" type="password" required></div>
        <div class="form-group"><label>Role</label><select name="role"><option value="resident">resident</option><option value="official">official</option><option value="admin">admin</option></select></div>
        <button class="btn" type="submit">Create User</button>
      </form>
    </div>
    <div class="content-card">
      <h2>Users List</h2>
      <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Actions</th></tr></thead><tbody id="usersTable"></tbody></table></div>
    </div>`;
    const form = document.getElementById('adminUserForm');
    form.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd=new FormData(form); try{ await BMS.apiFetch('/api/users','POST',{ username: fd.get('username'), password: fd.get('password'), role: fd.get('role')}); alert('User created'); form.reset(); reloadList(()=>BMS.apiFetch('/api/users'),'usersTable',renderRowForUser);}catch(err){alert(err.error||'Create user failed');}});
    reloadList(()=>BMS.apiFetch('/api/users'),'usersTable',renderRowForUser);
  }
  function renderRowForUser(u){ const tr=document.createElement('tr'); tr.innerHTML=`<td>${u.user_id}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.role)}</td><td><button class="btn" onclick="adminDeleteUser(${u.user_id})">Delete</button></td>`; return tr; }
  window.adminDeleteUser = async function(id){ if(!confirm('Delete user?')) return; try{ await BMS.apiFetch(`/api/users/${id}`,'DELETE'); alert('Deleted'); reloadList(()=>BMS.apiFetch('/api/users'),'usersTable',renderRowForUser);}catch(err){alert(err.error||'Delete failed');}};

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

  function adminLogout(){ BMS.logout(); window.location.href = '/login.html'; }

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
  });

  // expose showSection for button onclick
  window.showSection = showSection;
})();
