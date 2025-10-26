// Navigation functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            loadResidentsCount();
            
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

        function loadResidentsCount() {
            const residents = JSON.parse(localStorage.getItem('residents') || '[]');
            const tableBody = document.getElementById('residentsTable');
            
            // Update statistics
            document.getElementById('totalResidents').textContent = residents.length;
            document.getElementById('activeUsers').textContent = residents.length;
            document.getElementById('newToday').textContent = Math.min(residents.length, 3); // Simulate new registrations
            
            // Clear table
            tableBody.innerHTML = '';
            
            // Load residents data (view only)
            residents.forEach((resident, index) => {
                const row = document.createElement('tr');
                const registrationDate = new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toLocaleDateString();
                
                row.innerHTML = `
                    <td>REG-${String(resident.id).slice(-6)}</td>
                    <td>${resident.name}</td>
                    <td><span style="color: #26d07c;">Active</span></td>
                    <td>${registrationDate}</td>
                `;
                tableBody.appendChild(row);
            });
            
            // If no residents, show message
            if (residents.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="4" style="text-align: center; color: #f0f0f0; font-style: italic;">
                        No residents registered in the system yet.
                    </td>
                `;
                tableBody.appendChild(row);
            }
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                alert('Logged out successfully!');
                window.location.href = 'login.html';
            }
        }
    