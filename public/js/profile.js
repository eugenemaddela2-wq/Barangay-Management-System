
        // Navigation and scroll functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            loadProfile();
            
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
            
            document.getElementById('profileForm').addEventListener('submit', function(e) {
                e.preventDefault();
                saveProfile();
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

        function loadProfile() {
            const currentUser = localStorage.getItem('currentUser');
            const profileKey = `profile_${currentUser}`;
            const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
            
            // Load form data
            if (profile.firstName) document.getElementById('firstName').value = profile.firstName;
            if (profile.middleName) document.getElementById('middleName').value = profile.middleName;
            if (profile.lastName) document.getElementById('lastName').value = profile.lastName;
            if (profile.age) document.getElementById('age').value = profile.age;
            if (profile.birthDate) document.getElementById('birthDate').value = profile.birthDate;
            if (profile.gender) document.getElementById('gender').value = profile.gender;
            if (profile.civilStatus) document.getElementById('civilStatus').value = profile.civilStatus;
            if (profile.address) document.getElementById('address').value = profile.address;
            if (profile.contactNumber) document.getElementById('contactNumber').value = profile.contactNumber;
            if (profile.email) document.getElementById('email').value = profile.email;
            
            // Update display
            updateProfileDisplay(profile);
        }

        function saveProfile() {
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                alert('Please login first.');
                return;
            }
            
            const form = document.getElementById('profileForm');
            const formData = new FormData(form);
            
            const profile = {
                firstName: formData.get('firstName'),
                middleName: formData.get('middleName'),
                lastName: formData.get('lastName'),
                age: formData.get('age'),
                birthDate: formData.get('birthDate'),
                gender: formData.get('gender'),
                civilStatus: formData.get('civilStatus'),
                address: formData.get('address'),
                contactNumber: formData.get('contactNumber'),
                email: formData.get('email')
            };
            
            // Validate required fields
            if (!profile.firstName || !profile.lastName || !profile.age || !profile.birthDate || 
                !profile.gender || !profile.civilStatus || !profile.address || !profile.contactNumber) {
                alert('Please fill in all required fields.');
                return;
            }
            
            const profileKey = `profile_${currentUser}`;
            localStorage.setItem(profileKey, JSON.stringify(profile));
            
            updateProfileDisplay(profile);
            showMessage('Profile updated successfully!');
        }

        function updateProfileDisplay(profile) {
            const fullName = `${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim() || 'Not set';
            
            document.getElementById('displayFullName').textContent = fullName;
            document.getElementById('displayAge').textContent = profile.age || 'Not set';
            document.getElementById('displayBirthDate').textContent = profile.birthDate || 'Not set';
            document.getElementById('displayGender').textContent = profile.gender || 'Not set';
            document.getElementById('displayCivilStatus').textContent = profile.civilStatus || 'Not set';
            document.getElementById('displayAddress').textContent = profile.address || 'Not set';
            document.getElementById('displayContact').textContent = profile.contactNumber || 'Not set';
            document.getElementById('displayEmail').textContent = profile.email || 'Not set';
        }

        function showMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                background: #26d07c;
                color: white;
                border-radius: 5px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            messageDiv.textContent = message;
            
            document.body.appendChild(messageDiv);
            
            setTimeout(() => {
                messageDiv.remove();
            }, 3000);
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                alert('Logged out successfully!');
                window.location.href = 'login.html';
            }
        }

        // Add CSS animation for messages
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);