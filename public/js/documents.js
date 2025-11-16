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
        const status = String(d.status||'').toLowerCase();
        let actions = '';
        if (status === 'issued') {
          actions = `<button class="btn" onclick="printDocument(${d.document_id})">Print</button>`;
        }
        tr.innerHTML = `<td>${d.document_id}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.status)}</td><td>${d.date || ''}</td><td>${d.created_at || ''}</td><td>${actions}</td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) { console.error(err); alert(err.error || 'Could not load documents'); }
  }

  // Realtime updates: refresh when documents change
  if (window.BMS && window.BMS.connectStream) {
    try {
      const es = window.BMS.connectStream((msg) => {
        if (!msg || !msg.type) return;
        if (msg.type.startsWith('document')) {
          loadDocuments();
        }
      });
    } catch (e) { console.warn('Could not connect stream for documents', e); }
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

  // Print document (open printable view)
  window.printDocument = function(id) {
    (async () => {
      try {
        const docs = await BMS.getDocuments();
        const d = (docs||[]).find(x=>x.document_id==id);
        if (!d) return alert('Document not found');
        const w = window.open('', '_blank');
        const html = `<!doctype html><html><head><title>Document ${d.document_id}</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:6px;border:1px solid #ccc}</style></head><body><h1>Barangay Document - ${escapeHtml(d.type)}</h1><table><tr><td><strong>ID</strong></td><td>${d.document_id}</td></tr><tr><td><strong>Type</strong></td><td>${escapeHtml(d.type)}</td></tr><tr><td><strong>Resident</strong></td><td>${d.resident||''}</td></tr><tr><td><strong>Date</strong></td><td>${d.date||''}</td></tr><tr><td><strong>Status</strong></td><td>${d.status||''}</td></tr></table><p style="margin-top:20px">Signature: ________________________</p><script>window.onload=function(){window.print();}</script></body></html>`;
        w.document.write(html);
        w.document.close();
      } catch (err) { console.error(err); alert('Could not open print view'); }
    })();
  };

  loadDocuments();
});
