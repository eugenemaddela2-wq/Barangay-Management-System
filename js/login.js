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

            // Only allow non-admin users if status is Active
            if (user.role !== 'admin' && user.status !== 'Active') {
                alert('Your account is not yet active. Please wait for admin approval.');
                return;
            }

            // Store user session
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('currentUser', username);
            if (user.role === 'admin') localStorage.setItem('isAdmin', 'true'); else localStorage.removeItem('isAdmin');

            // Ensure resident record exists for normal users (if not present, try create using user's name and any registration-provided details)
            if (user.role !== 'admin') {
                let residents = JSON.parse(localStorage.getItem('residents') || '[]');
                const existingUser = residents.find(r => (r.username && r.username === username) || (r.name && r.name.toLowerCase() === (user.name || username).toLowerCase()));
                if (!existingUser) {
                    const newResident = {
                        id: Date.now(),
                        username: user.username || username,
                        name: user.name || username,
                        age: user.age || 25,
                        address: user.address || 'Barangay Resident',
                        contact: user.contact || '09000000000'
                    };
                    residents.push(newResident);
                    localStorage.setItem('residents', JSON.stringify(residents));
                }
            }

            alert('Login successful! Welcome to the Barangay Management System.');
            if (user.role === 'admin') {
                window.location.href = 'admin/admin.html';
            } else {
                window.location.href = 'home.html';
            }
        });
        
        // Toggle register card visibility and handle registration form
        const showBtn = document.getElementById('showRegisterBtn');
        const registerCard = document.getElementById('registerCard');
        const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
        const registerForm = document.getElementById('registerForm');
        if (showBtn && registerCard) {
            showBtn.addEventListener('click', () => { registerCard.style.display = 'block'; document.getElementById('reg_username').focus(); document.getElementById('loginForm').style.display = 'none'; });
        }
        if (cancelRegisterBtn && registerCard) {
            cancelRegisterBtn.addEventListener('click', () => { registerCard.style.display = 'none'; document.getElementById('loginForm').style.display = 'block'; });
        }
        // toggle links
        const toRegisterLink = document.getElementById('toRegisterLink');
        const toLoginLink = document.getElementById('toLoginLink');
        if (toRegisterLink) {
            toRegisterLink.addEventListener('click', function(e) { e.preventDefault(); registerCard.style.display = 'block'; document.getElementById('loginForm').style.display = 'none'; document.getElementById('reg_username').focus(); });
        }
        if (toLoginLink) {
            toLoginLink.addEventListener('click', function(e) { e.preventDefault(); registerCard.style.display = 'none'; document.getElementById('loginForm').style.display = 'block'; document.getElementById('username').focus(); });
        }
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('reg_username').value.trim();
                const password = document.getElementById('reg_password').value.trim();
                const fullname = document.getElementById('reg_name').value.trim();
                const ageVal = document.getElementById('reg_age').value.trim();
                const age = ageVal ? parseInt(ageVal, 10) || undefined : undefined;
                const address = document.getElementById('reg_address').value.trim();
                const contact = document.getElementById('reg_contact').value.trim();

                if (!username || !password || !fullname) {
                    alert('Please fill in username, password and full name.');
                    return;
                }

                const users = JSON.parse(localStorage.getItem('users') || '[]');
                if (users.find(u => u.username === username)) {
                    alert('User already exists. Please login instead.');
                    return;
                }

                const newUser = { id: Date.now(), username, name: fullname, password, role: 'user', status: 'Pending', age: age, address: address, contact: contact };
                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));

                alert('Registration submitted. Your account is pending admin approval. You will be notified once approved.');
                // hide register card and reset form
                registerCard.style.display = 'none';
                registerForm.reset();
            });
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