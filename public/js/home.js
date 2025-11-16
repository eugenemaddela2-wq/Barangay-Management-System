// Home page wiring to show basic counts
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

  const residentsCountEls = document.querySelectorAll('#residentsCount');
  const documentsCountEls = document.querySelectorAll('#documentsCount');
  const eventsCountEls = document.querySelectorAll('#eventsCount');

  async function loadCounts() {
    try {
      const residents = await BMS.getResidents();
      const docs = await BMS.getDocuments();
      const evs = await BMS.getEvents();
      residentsCountEls.forEach(e => e.textContent = (residents||[]).length);
      documentsCountEls.forEach(e => e.textContent = (docs||[]).length);
      eventsCountEls.forEach(e => e.textContent = (evs||[]).length);
    } catch (err) { console.error(err); }
  }

  loadCounts();

  // Realtime updates
  if (window.BMS && window.BMS.connectStream) {
    try {
      window.BMS.connectStream((msg) => {
        if (!msg || !msg.type) return;
        if (msg.type.startsWith('resident') || msg.type.startsWith('document') || msg.type.startsWith('event')) {
          loadCounts();
        }
      });
    } catch (e) { console.warn('Could not connect SSE for counts', e); }
  }
});
