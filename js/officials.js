// Navigation and scroll functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            loadOfficials();
            
            // Handle scroll to hide header
            let lastScrollTop = 0;
            window.addEventListener('scroll', function() {
                let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const title = document.querySelector('.title');
                
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    title.classList.add('hidden');
                } else {
                    title.classList.remove('hidden');
                }
                lastScrollTop = scrollTop;
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

        function loadOfficials() {
            const officials = JSON.parse(localStorage.getItem('officials') || '[]');
            loadOfficialsGrid(officials);
            loadOfficialsTable(officials);
        }

        function loadOfficialsGrid(officials) {
            const grid = document.getElementById('officialsGrid');
            grid.innerHTML = '';
            
            if (officials.length === 0) {
                grid.innerHTML = `
                    <div class="official-card">
                        <div class="official-avatar">
                            <i class="fa fa-user-circle"></i>
                        </div>
                        <h3>No Officials Listed</h3>
                        <p class="position">Information Not Available</p>
                        <p class="contact"><i class="fa fa-phone"></i> Contact barangay office</p>
                    </div>
                `;
                return;
            }
            
            officials.forEach(official => {
                const card = document.createElement('div');
                card.className = 'official-card';
                card.innerHTML = `
                    <div class="official-avatar">
                        <i class="fa fa-user-circle"></i>
                    </div>
                    <h3>${official.name}</h3>
                    <p class="position">${official.position}</p>
                    <p class="contact"><i class="fa fa-phone"></i> ${official.contact}</p>
                `;
                grid.appendChild(card);
            });
        }

        function loadOfficialsTable(officials) {
            const tableBody = document.getElementById('officialsTable');
            tableBody.innerHTML = '';
            
            if (officials.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="4" style="text-align: center; color: #f0f0f0; font-style: italic;">
                        No officials information available.
                    </td>
                `;
                tableBody.appendChild(row);
                return;
            }
            
            officials.forEach(official => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${official.name}</td>
                    <td>${official.position}</td>
                    <td>${official.contact}</td>
                    <td>Mon-Fri 8:00 AM - 5:00 PM</td>
                `;
                tableBody.appendChild(row);
            });
        }

        function logout() {
            if (typeof window.__shared_logout__ === 'function') return window.__shared_logout__();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                window.location.replace('/index.html');
            }
        }
        