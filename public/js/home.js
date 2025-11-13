// Home page wiring to show basic counts
document.addEventListener('DOMContentLoaded', () => {
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
});
