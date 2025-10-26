// Login functionality
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                alert('Please fill in all fields.');
                return;
            }

            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.username === username && u.password === password);

            if (!user) {
                alert('Invalid username or password.');
                return;
            }

            // Store user session
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('currentUser', username);
            if (user.role === 'admin') localStorage.setItem('isAdmin', 'true'); else localStorage.removeItem('isAdmin');

            // Ensure resident record exists for normal users
            if (user.role !== 'admin') {
                let residents = JSON.parse(localStorage.getItem('residents') || '[]');
                const existingUser = residents.find(r => r.name.toLowerCase() === username.toLowerCase());
                if (!existingUser) {
                    const newResident = { id: Date.now(), name: username, age: 25, address: 'Barangay Resident', contact: '09000000000' };
                    residents.push(newResident);
                    localStorage.setItem('residents', JSON.stringify(residents));
                }
            }

            alert('Login successful! Welcome to the Barangay Management System.');
            if (user.role === 'admin') {
                window.location.href = '../admin/admin.html';
            } else {
                window.location.href = 'home.html';
            }
        });
        
        function showRegister() {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!username || !password) {
                alert('Please fill in username and password to register.');
                return;
            }

            const users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.find(u => u.username === username)) {
                alert('User already exists. Please login instead.');
                return;
            }

            // Create normal user role by default
            users.push({ username, password, role: 'user' });
            localStorage.setItem('users', JSON.stringify(users));

            // Also create a resident record
            let residents = JSON.parse(localStorage.getItem('residents') || '[]');
            residents.push({ id: Date.now(), name: username, age: 25, address: 'Barangay Resident', contact: '09000000000' });
            localStorage.setItem('residents', JSON.stringify(residents));

            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('currentUser', username);
            localStorage.removeItem('isAdmin');

            alert('Registration successful! Welcome to the Barangay Management System.');
            window.location.href = 'home.html';
        }
        
        // Check if already logged in — validate session before redirecting
        (function() {
            try {
                const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
                const currentUser = localStorage.getItem('currentUser');
                if (isLoggedIn && currentUser) {
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    const user = users.find(u => u.username === currentUser);
                    if (user) {
                        // valid session -> continue to home
                        window.location.href = 'home.html';
                        return;
                    }
                }
                // If we get here the session is not valid/stale — clear session flags
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isAdmin');
            } catch (e) {
                // If anything goes wrong, don't block the login page — clean session and continue
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isAdmin');
            }
        })();