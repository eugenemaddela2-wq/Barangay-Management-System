// Documents page wiring
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

  const tableBody = document.getElementById('documentsTable');

  async function loadDocuments() {
    try {
      const data = await BMS.getDocuments();
      if (!tableBody) return;
      tableBody.innerHTML = '';
      if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f0f0f0;font-style:italic;">No documents requested yet.</td></tr>';
        return;
      }
      data.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.document_id}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.status)}</td><td>${d.date || ''}</td><td>${d.created_at || ''}</td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) { console.error(err); alert(err.error || 'Could not load documents'); }
  }

  bindForm('documentForm', async (data, form) => {
    const type = (data.type || '').trim();
    const purpose = (data.purpose || '').trim();
    if (!type || !purpose) return alert('Please select a document type and provide a purpose');
    try {
      await BMS.createDocument({ type, status: 'Processing', date: new Date().toISOString().split('T')[0] });
      form.reset();
      loadDocuments();
      alert('Document request submitted');
    } catch (err) { console.error(err); alert(err.error || 'Failed to submit request'); }
  });

  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  loadDocuments();
});
