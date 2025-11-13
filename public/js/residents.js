// Residents page wiring
document.addEventListener('DOMContentLoaded', () => {
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
});
