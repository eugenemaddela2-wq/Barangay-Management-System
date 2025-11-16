// Index page - handle login/logout button display and logout functionality
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const user = BMS.currentUser();
  
  if (user) {
    // User is logged in - show logout button
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    // User is not logged in - show login button
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
  
  // Load stats
  loadStats();
});

window.logoutFromHome = function() {
  BMS.logout();
  location.href = '/login.html';
};

async function loadStats() {
  try {
    const residents = await BMS.getResidents();
    const docs = await BMS.getDocuments();
    const evs = await BMS.getEvents();
    
    document.getElementById('residentsCount').textContent = (residents||[]).length;
    document.getElementById('documentsCount').textContent = (docs||[]).length;
    document.getElementById('eventsCount').textContent = (evs||[]).length;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}
