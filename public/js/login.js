// Page wiring for login and register
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerCard = document.getElementById('registerCard');
  const toRegisterLink = document.getElementById('toRegisterLink');
  const toLoginLink = document.getElementById('toLoginLink');
  const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');

  if (toRegisterLink) toRegisterLink.addEventListener('click', (e) => { 
    e.preventDefault(); 
    if (loginForm) loginForm.style.display = 'none'; 
    if (registerCard) registerCard.style.display = 'block'; 
  });
  if (toLoginLink) toLoginLink.addEventListener('click', (e) => { 
    e.preventDefault(); 
    if (loginForm) loginForm.style.display = 'block'; 
    if (registerCard) registerCard.style.display = 'none'; 
  });
  if (cancelRegisterBtn) cancelRegisterBtn.addEventListener('click', () => { 
    if (loginForm) loginForm.style.display = 'block'; 
    if (registerCard) registerCard.style.display = 'none'; 
  });

  if (loginForm) {
    bindForm('loginForm', async (data) => {
      if (!data.username || !data.password) return alert('Please enter username and password');
      try {
        const result = await BMS.login(data.username.trim(), data.password);
        // Redirect based on role
        if (result.user.role === 'admin') {
          location.href = '/admin/admin.html';
        } else {
          location.href = '/home.html';
        }
      } catch (err) {
        alert(err.error || 'Login failed - check your credentials');
      }
    });
  }

  if (document.getElementById('registerForm')) {
    bindForm('registerForm', async (data, form) => {
      const username = data.reg_username && data.reg_username.trim();
      const password = data.reg_password;
      if (!username || !password) return alert('Username and password are required');
      if (password.length < 6) return alert('Password must be at least 6 characters');
      try {
        await BMS.register(username, password, 'resident');
        alert('Registration successful. You are now logged in.');
        location.href = '/home.html';
      } catch (err) {
        alert(err.error || 'Registration failed');
      }
    });
  }
});
