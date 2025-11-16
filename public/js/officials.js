// Officials page wiring
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

  const officialsTable = document.getElementById('officialsTable');
  const officialsGrid = document.getElementById('officialsGrid');

  async function loadOfficials() {
    try {
      const data = await BMS.getOfficials();
      if (officialsTable) {
        officialsTable.innerHTML = '';
        (data||[]).forEach(o => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${escapeHtml(o.name)}</td><td>${escapeHtml(o.position||'')}</td><td>${escapeHtml(o.contact||'')}</td><td>9am-5pm</td>`;
          officialsTable.appendChild(tr);
        });
      }
      if (officialsGrid) {
        officialsGrid.innerHTML = '';
        (data||[]).forEach(o => {
          const card = document.createElement('div');
          card.className = 'official-card';
          card.innerHTML = `<h3>${escapeHtml(o.name)}</h3><p>${escapeHtml(o.position||'')}</p><p>${escapeHtml(o.contact||'')}</p>`;
          officialsGrid.appendChild(card);
        });
      }
    } catch (err) { console.error(err); }
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  loadOfficials();
});
