// Centralized client-side API helper for BMS
const API_BASE = '';// same origin when server serves `public/`

function getToken() {
  return localStorage.getItem('bms_token');
}

function setToken(token) {
  if (token) localStorage.setItem('bms_token', token);
}

function jwtDecode(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

function isTokenExpired(token, leewaySeconds = 60) {
  const p = jwtDecode(token);
  if (!p || !p.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return p.exp <= now + leewaySeconds;
}

async function tryRefreshToken() {
  const token = getToken();
  if (!token) return false;
  try {
    // call refresh endpoint which relies on Authorization header
    const res = await fetch(API_BASE + '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.token) {
      setToken(data.token);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function apiFetch(path, method = 'GET', body = null) {
  // before request, attempt refresh if token is near expiry
  const token = getToken();
  if (token && isTokenExpired(token, 120)) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      logout();
      location.href = '/login.html';
      throw { error: 'Session expired' };
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, error: data.error || data.message || 'Request failed' };
  return data;
}

// Auth
async function register(username, password, role = 'resident') {
  const data = await apiFetch('/api/auth/register', 'POST', { username, password, role });
  setToken(data.token);
  localStorage.setItem('bms_user', JSON.stringify(data.user));
  return data;
}

async function login(username, password) {
  const data = await apiFetch('/api/auth/login', 'POST', { username, password });
  setToken(data.token);
  localStorage.setItem('bms_user', JSON.stringify(data.user));
  return data;
}

function logout() {
  localStorage.removeItem('bms_token');
  localStorage.removeItem('bms_user');
}

function currentUser() {
  return JSON.parse(localStorage.getItem('bms_user') || 'null');
}

// Residents CRUD
async function getResidents() { return apiFetch('/api/residents'); }
async function getResident(id) { return apiFetch(`/api/residents/${id}`); }
async function createResident(payload) { return apiFetch('/api/residents', 'POST', payload); }
async function updateResident(id, payload) { return apiFetch(`/api/residents/${id}`, 'PUT', payload); }
async function deleteResident(id) { return apiFetch(`/api/residents/${id}`, 'DELETE'); }

// Officials CRUD
async function getOfficials() { return apiFetch('/api/officials'); }
async function createOfficial(payload) { return apiFetch('/api/officials', 'POST', payload); }
async function updateOfficial(id, payload) { return apiFetch(`/api/officials/${id}`, 'PUT', payload); }
async function deleteOfficial(id) { return apiFetch(`/api/officials/${id}`, 'DELETE'); }

// Events CRUD
async function getEvents() { return apiFetch('/api/events'); }
async function createEvent(payload) { return apiFetch('/api/events', 'POST', payload); }
async function updateEvent(id, payload) { return apiFetch(`/api/events/${id}`, 'PUT', payload); }
async function deleteEvent(id) { return apiFetch(`/api/events/${id}`, 'DELETE'); }

// Complaints CRUD
async function getComplaints() { return apiFetch('/api/complaints'); }
async function createComplaint(payload) { return apiFetch('/api/complaints', 'POST', payload); }
async function updateComplaint(id, payload) { return apiFetch(`/api/complaints/${id}`, 'PUT', payload); }
async function deleteComplaint(id) { return apiFetch(`/api/complaints/${id}`, 'DELETE'); }

// Documents CRUD
async function getDocuments() { return apiFetch('/api/documents'); }
async function createDocument(payload) { return apiFetch('/api/documents', 'POST', payload); }
async function updateDocument(id, payload) { return apiFetch(`/api/documents/${id}`, 'PUT', payload); }
async function deleteDocument(id) { return apiFetch(`/api/documents/${id}`, 'DELETE'); }

// Simple helpers for pages to call
window.BMS = {
  // auth
  register, login, logout, currentUser,
  // token helpers
  jwtDecode, isTokenExpired,
  // residents
  getResidents, getResident, createResident, updateResident, deleteResident,
  // officials
  getOfficials, createOfficial, updateOfficial, deleteOfficial,
  // events
  getEvents, createEvent, updateEvent, deleteEvent,
  // complaints
  getComplaints, createComplaint, updateComplaint, deleteComplaint,
  // documents
  getDocuments, createDocument, updateDocument, deleteDocument,
  // helper
  apiFetch
};

// DOM convenience: basic form submit binding by id
function bindForm(id, handler) {
  const f = document.getElementById(id);
  if (!f) return;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    try {
      await handler(data, form);
    } catch (err) {
      console.error('Form handler error', err);
      alert(err.error || 'Operation failed');
    }
  });
}

window.bindForm = bindForm;

// Example: call on page load to show user info
document.addEventListener('DOMContentLoaded', () => {
  const user = currentUser();
  const el = document.getElementById('bms-current-user');
  if (el && user) el.textContent = `${user.username} (${user.role})`;
});
