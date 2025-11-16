// Complaints page wiring
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

  const tableBody = document.getElementById('complaintsTable');

  async function loadComplaints() {
    try {
      const data = await BMS.getComplaints();
      if (!tableBody) return;
      tableBody.innerHTML = '';
      if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#f0f0f0;font-style:italic;">No complaints submitted yet.</td></tr>';
        return;
      }
      data.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.details)}</td><td>${c.date || ''}</td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      alert(err.error || 'Could not load complaints');
    }
  }

  bindForm('complaintForm', async (data, form) => {
    const title = (data.title || '').trim();
    const details = (data.details || '').trim();
    if (!title || !details) return alert('Please provide title and details');
    try {
      await BMS.createComplaint({ title, details });
      form.reset();
      loadComplaints();
      alert('Complaint submitted');
    } catch (err) {
      console.error(err);
      alert(err.error || 'Failed to submit complaint');
    }
  });

  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  loadComplaints();
});
