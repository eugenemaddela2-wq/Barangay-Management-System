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

  function loadLocalProfile() {
    const p = JSON.parse(localStorage.getItem('bms_profile') || '{}');
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
      const p = {
        firstName: data.firstName, middleName: data.middleName, lastName: data.lastName,
        fullName, age: data.age, birthDate: data.birthDate, gender: data.gender,
        civilStatus: data.civilStatus, address: data.address, contactNumber: data.contactNumber, email: data.email
      };
      localStorage.setItem('bms_profile', JSON.stringify(p));
      loadLocalProfile();
      alert('Profile saved locally');
    });
  }

  loadLocalProfile();
});
