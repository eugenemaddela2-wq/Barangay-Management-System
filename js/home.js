// Navigation and scroll functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            updateStatistics();
            
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

        function updateStatistics() {
            const residentsCount = document.getElementById('residentsCount');
            const documentsCount = document.getElementById('documentsCount');
            const eventsCount = document.getElementById('eventsCount');
            
            if (residentsCount) {
                const residents = JSON.parse(localStorage.getItem('residents') || '[]');
                residentsCount.textContent = residents.length;
            }
            
            if (documentsCount) {
                const documents = JSON.parse(localStorage.getItem('documents') || '[]');
                documentsCount.textContent = documents.length;
            }
            
            if (eventsCount) {
                const events = JSON.parse(localStorage.getItem('events') || '[]');
                eventsCount.textContent = events.length;
            }
        }

        function logout() {
            // Delegate to shared logout handler which clears session and prevents back-navigation
            if (typeof window.__shared_logout__ === 'function') return window.__shared_logout__();
            // fallback
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                window.location.replace('/index.html');
            }
        }