// Residents page wiring
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menu toggle
  const toggleBox = document.querySelector('.toggleBox');
  const container = document.querySelector('.container');
  if (toggleBox && container) {
    toggleBox.addEventListener('click', (e) => {
      e.preventDefault();
      toggleBox.classList.toggle('active');
      container.classList.toggle('active');
    });
  }

  // Logout function
  window.logout = function() {
    BMS.logout();
    location.href = '/login.html';
  };

  const residentsTable = document.getElementById('residentsTable');
  const totalResidentsEl = document.getElementById('totalResidents');
  async function loadResidents() {
    try {
      const data = await BMS.getResidents();
      if (residentsTable) {
        residentsTable.innerHTML = '';
        (data||[]).forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${r.resident_id}</td><td>${escapeHtml(r.name)}</td><td>Active</td><td>${r.created_at||''}</td>`;
          residentsTable.appendChild(tr);
        });
      }
      if (totalResidentsEl) totalResidentsEl.textContent = (data||[]).length;
    } catch (err) { console.error(err); }
  }
  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  loadResidents();
  // Realtime updates
  if (window.BMS && window.BMS.connectStream) {
    try {
      window.BMS.connectStream((msg) => {
        if (!msg || !msg.type) return;
        if (msg.type.startsWith('resident')) loadResidents();
      });
    } catch (e) { console.warn('Could not connect SSE for residents', e); }
  }
});
