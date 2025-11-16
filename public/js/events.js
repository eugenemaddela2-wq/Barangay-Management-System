// Events page wiring
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

  const eventsTable = document.getElementById('eventsTable');
  const eventsGrid = document.getElementById('eventsGrid');

  async function loadEvents() {
    try {
      const data = await BMS.getEvents();
      if (eventsTable) {
        eventsTable.innerHTML = '';
        if (!data || data.length === 0) {
          eventsTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #f0f0f0; font-style: italic;">No events scheduled at this time.</td></tr>';
        } else {
          data.forEach(ev => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${escapeHtml(ev.title)}</td><td>${ev.date||''}</td><td>${ev.time||''}</td><td>${escapeHtml(ev.location||'')}</td><td>Active</td>`;
            eventsTable.appendChild(tr);
          });
        }
      }
      if (eventsGrid) {
        eventsGrid.innerHTML = '';
        (data||[]).slice(0,6).forEach(ev => {
          const div = document.createElement('div');
          div.className = 'event-card';
          div.innerHTML = `<div class="event-date"><div class="day">${formatDay(ev.date)}</div><div class="month">${formatMonth(ev.date)}</div></div><div class="event-details"><h3>${escapeHtml(ev.title)}</h3><p class="event-time"><i class="fa fa-clock"></i> ${ev.time||''}</p><p class="event-location"><i class="fa fa-map-marker-alt"></i> ${escapeHtml(ev.location||'')}</p></div>`;
          eventsGrid.appendChild(div);
        });
      }
    } catch (err) { console.error(err); }
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function formatDay(d) { if (!d) return '--'; return new Date(d).getDate(); }
  function formatMonth(d) { if (!d) return '---'; return new Date(d).toLocaleString('default', { month: 'short' }); }

  loadEvents();
});
