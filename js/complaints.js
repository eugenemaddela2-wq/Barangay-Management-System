document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            loadComplaints();

            document.getElementById('complaintForm').addEventListener('submit', function(e) {
                e.preventDefault();
                submitComplaint();
            });
        });

        function initializeNavigation() {
            const toggleClick = document.querySelector(".toggleBox");
            const container = document.querySelector(".container");
            if (toggleClick && container) {
                toggleClick.addEventListener('click', (e) => {
                    e.preventDefault();
                    toggleClick.classList.toggle('active');
                    container.classList.toggle('active');
                });
            }
        }

        function submitComplaint() {
            const title = document.getElementById('complaintTitle').value.trim();
            const details = document.getElementById('complaintDetails').value.trim();
            if (!title || !details) { alert('Please fill in both title and details.'); return; }

            const complaintsKey = 'complaints';
            const complaints = JSON.parse(localStorage.getItem(complaintsKey) || '[]');
            complaints.push({ title, details, date: new Date().toLocaleString() });
            localStorage.setItem(complaintsKey, JSON.stringify(complaints));

            document.getElementById('complaintForm').reset();
            loadComplaints();
        }

        function loadComplaints() {
            const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
            const tbody = document.getElementById('complaintsTable');
            tbody.innerHTML = '';
            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#f0f0f0;font-style:italic;">No complaints submitted yet.</td></tr>';
                return;
            }

            complaints.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.details)}</td><td>${c.date}</td>`;
                tbody.appendChild(tr);
            });
        }

        function escapeHtml(text) {
            return text.replace(/[&<>"']/g, function (m) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[m]; });
        }

        function logout() {
            if (typeof window.__shared_logout__ === 'function') return window.__shared_logout__();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                window.location.replace('/index.html');
            }
        }