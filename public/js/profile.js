// Profile page wiring (local update only)
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

  const profileForm = document.getElementById('profileForm');
  const displayFullName = document.getElementById('displayFullName');
  const displayAge = document.getElementById('displayAge');
  const displayBirthDate = document.getElementById('displayBirthDate');
  const displayGender = document.getElementById('displayGender');
  const displayCivilStatus = document.getElementById('displayCivilStatus');
  const displayAddress = document.getElementById('displayAddress');
  const displayContact = document.getElementById('displayContact');
  const displayEmail = document.getElementById('displayEmail');

  async function loadLocalProfile() {
    const p = {};
    // try to load from server if logged in
    const userData = JSON.parse(localStorage.getItem('bms_user') || 'null');
    if (userData) {
      // placeholder until async load
    }
    try {
      const server = window.BMS && window.BMS.getProfile ? await window.BMS.getProfile() : null;
      if (server && server.profile) {
        Object.assign(p, server.profile);
      }
      if (server && server.user) {
        p.fullName = server.user.full_name || p.fullName;
      }
    } catch (e) {
      // fallback to localStorage if server unavailable
      const stored = JSON.parse(localStorage.getItem('bms_profile') || '{}');
      Object.assign(p, stored);
    }
    if (displayFullName) displayFullName.textContent = p.fullName || 'Not set';
    if (displayAge) displayAge.textContent = p.age || 'Not set';
    if (displayBirthDate) displayBirthDate.textContent = p.birthDate || 'Not set';
    if (displayGender) displayGender.textContent = p.gender || 'Not set';
    if (displayCivilStatus) displayCivilStatus.textContent = p.civilStatus || 'Not set';
    if (displayAddress) displayAddress.textContent = p.address || 'Not set';
    if (displayContact) displayContact.textContent = p.contactNumber || 'Not set';
    if (displayEmail) displayEmail.textContent = p.email || 'Not set';
    if (profileForm && p) {
      profileForm.firstName.value = p.firstName || '';
      profileForm.middleName.value = p.middleName || '';
      profileForm.lastName.value = p.lastName || '';
      profileForm.age.value = p.age || '';
      profileForm.birthDate.value = p.birthDate || '';
      profileForm.gender.value = p.gender || '';
      profileForm.civilStatus.value = p.civilStatus || '';
      profileForm.address.value = p.address || '';
      profileForm.contactNumber.value = p.contactNumber || '';
      profileForm.email.value = p.email || '';
    }
  }

  if (profileForm) {
    bindForm('profileForm', async (data) => {
      const fullName = `${data.firstName||''} ${data.middleName||''} ${data.lastName||''}`.trim();
      const payload = {
        full_name: fullName,
        firstName: data.firstName, middleName: data.middleName, lastName: data.lastName,
        age: data.age, birthDate: data.birthDate, gender: data.gender,
        civilStatus: data.civilStatus, address: data.address, contactNumber: data.contactNumber, email: data.email
      };
      try {
        const res = await window.BMS.updateProfile(payload);
        // update local display
        if (res && res.user) {
          localStorage.setItem('bms_user', JSON.stringify(res.user));
        }
        if (res && res.profile) {
          localStorage.setItem('bms_profile', JSON.stringify(res.profile));
        }
        loadLocalProfile();
        alert('Profile saved');
      } catch (err) {
        console.error('Failed to save profile', err);
        alert(err.error || 'Failed to save profile');
      }
    });
  }

  loadLocalProfile().catch((e) => { console.warn('Could not load profile', e); });
});
