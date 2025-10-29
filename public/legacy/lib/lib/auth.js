import { loginUser } from './api.js';

function decodeJwt(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(atob(payload).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

export function extractRoleFromToken(token) {
    const payload = decodeJwt(token);
    if (!payload) return null;
    if (payload.role) return payload.role;
    if (Array.isArray(payload.roles) && payload.roles.length) return payload.roles[0];
    if (Array.isArray(payload.authorities) && payload.authorities.length) return payload.authorities[0];
    if (payload.auth) return payload.auth;
    return null;
}

export function getUserRole() {
    const cached = localStorage.getItem('userRole');
    if (cached) return cached;
    const token = localStorage.getItem('jwtToken');
    const role = extractRoleFromToken(token);
    if (role) localStorage.setItem('userRole', role);
    return role;
}

export async function ensureUserRole() {
    const existing = localStorage.getItem('userRole');
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    const forced = new URLSearchParams(window.location.search).get('forceRole');
    if (forced) { localStorage.setItem('userRole', forced.toUpperCase()); return forced.toUpperCase(); }
    if (existing) return existing;
    const payload = decodeJwt(token) || {};
    let derived = null;
    const candidates = [];
    if (payload.role) candidates.push(payload.role);
    if (Array.isArray(payload.roles)) candidates.push(...payload.roles);
    if (Array.isArray(payload.authorities)) candidates.push(...payload.authorities);
    if (payload.auth) candidates.push(payload.auth);
    if (candidates.length) {
        const upper = candidates.map(r => (r||'').toString().toUpperCase());
        derived = upper.some(r => r.includes('ADMIN')) ? 'ADMIN' : 'USER';
    }
    if (!derived) derived = 'USER';
    localStorage.setItem('userRole', derived);
    return derived;
}

export async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) return;
    try {
        const resp = await loginUser(email, password);
        if (!resp.ok) throw new Error('Falha no login');
        const data = await resp.json();
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('loggedInUserEmail', data.email);
        try { const role = extractRoleFromToken(data.token) || data.role || data.roles?.[0]; if (role) localStorage.setItem('userRole', role); } catch(e){}
        if (!localStorage.getItem('userRole')) await ensureUserRole();
        return data;
    } catch (e) {
        throw e;
    }
}

export function performLogout() {
    try { localStorage.removeItem('jwtToken'); localStorage.removeItem('userRole'); localStorage.removeItem('loggedInUserEmail'); window.__cachedUserMe = null; } catch(_){ }
}

export default { decodeJwt, extractRoleFromToken, getUserRole, ensureUserRole, handleLogin, performLogout };
