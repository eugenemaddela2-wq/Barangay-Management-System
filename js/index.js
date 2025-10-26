// Navigation functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            initializeSampleData();
            updateStatistics();
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

        function initializeSampleData() {
            // Initialize sample data if not exists
            if (!localStorage.getItem('residents')) {
                const sampleResidents = [
                    { id: 1, name: 'Juan Dela Cruz', age: 35, address: 'Block 1 Lot 1', contact: '09123456789' },
                    { id: 2, name: 'Maria Santos', age: 28, address: 'Block 2 Lot 5', contact: '09987654321' },
                    { id: 3, name: 'Pedro Garcia', age: 42, address: 'Block 3 Lot 8', contact: '09456789123' }
                ];
                localStorage.setItem('residents', JSON.stringify(sampleResidents));
            }
            
            if (!localStorage.getItem('documents')) {
                localStorage.setItem('documents', JSON.stringify([]));
            }
            
            if (!localStorage.getItem('officials')) {
                const sampleOfficials = [
                    { id: 1, name: 'Captain Roberto Cruz', position: 'Barangay Captain', contact: '09111222333' },
                    { id: 2, name: 'Councilor Ana Reyes', position: 'Barangay Councilor', contact: '09444555666' },
                    { id: 3, name: 'Secretary Linda Torres', position: 'Barangay Secretary', contact: '09777888999' }
                ];
                localStorage.setItem('officials', JSON.stringify(sampleOfficials));
            }
            
            if (!localStorage.getItem('events')) {
                localStorage.setItem('events', JSON.stringify([]));
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

        function goToLogin() {
        window.location.href = 'login.html';
        }