import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class LegacyService {
  apiBaseUrl = environment.apiBaseUrl;  // ✅ Pega do environment

  constructor() {
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiBaseUrl = 'http://localhost:8081';
      }
      // Em produção, mantém o apiBaseUrl do environment (/api)
    }
  }

  authHeaders() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
      'Content-Type': 'application/json'
    };
  }

  getBase() {
    return this.apiBaseUrl;  // ✅ Usa o environment
  }

  decodeJwt(token: string | null) {
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

  extractRoleFromToken(token: string | null) {
    const payload = this.decodeJwt(token as string);
    if (!payload) return null;
    if (payload.role) return payload.role;
    if (Array.isArray(payload.roles) && payload.roles.length) return payload.roles[0];
    if (Array.isArray(payload.authorities) && payload.authorities.length) return payload.authorities[0];
    if (payload.auth) return payload.auth;
    return null;
  }

  async ensureUserRole(): Promise<string | null> {
    const existing = localStorage.getItem('userRole');
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    if (existing) return existing;
    const payload = this.decodeJwt(token) || {};
    let derived: string | null = null;
    const candidates: any[] = [];
    if (payload.role) candidates.push(payload.role);
    if (Array.isArray(payload.roles)) candidates.push(...payload.roles);
    if (Array.isArray(payload.authorities)) candidates.push(...payload.authorities);
    if (payload.auth) candidates.push(payload.auth);
    if (candidates.length) {
      const upper = candidates.map(r => (r || '').toString().toUpperCase());
      derived = upper.some(r => r.includes('ADMIN')) ? 'ADMIN' : 'USER';
    }
    if (!derived) {
      try {
  const resp = await fetch(`${this.apiBaseUrl}/users/me`, { headers: this.authHeaders() });
        if (resp.ok) {
          const me = await resp.json().catch(() => ({}));
          const roleField = (me.role || me.perfil || me.tipo || '').toString().toUpperCase();
          derived = roleField.includes('ADMIN') ? 'ADMIN' : 'USER';
        }
      } catch (_) {}
    }
    if (!derived) derived = 'USER';
    try { localStorage.setItem('userRole', derived); } catch(_) {}
    return derived;
  }

  getUserRole(): string | null {
    const cached = localStorage.getItem('userRole');
    if (cached) return cached;
    const token = localStorage.getItem('jwtToken');
    const role = this.extractRoleFromToken(token);
    if (role) try { localStorage.setItem('userRole', role); } catch(_) {}
    return role;
  }

  async fetchUserProfile(force = false): Promise<any | null> {
    if (!force && (window as any).__cachedUserMe) return (window as any).__cachedUserMe;
    try {
  const resp = await fetch(`${this.apiBaseUrl}/users/me`, { headers: this.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao carregar perfil');
      const data = await resp.json();
      (window as any).__cachedUserMe = data;
      return data;
    } catch (e) {
      console.warn('fetchUserProfile erro:', e && (e as Error).message);
      return null;
    }
  }

  escapeHtml(str: string) {
  return (str || '').replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s] || ''));
  }

  performLogout() {
    try { localStorage.removeItem('jwtToken'); } catch(_) {}
    try { localStorage.removeItem('userRole'); } catch(_) {}
    window.location.href = '/#/login';
  }

  async loadLegacyScript(scriptPath: string = '/legacy/loadComponents.js'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('window não disponível'));
        return;
      }

      const script = document.createElement('script');
      script.src = scriptPath;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Erro ao carregar ${scriptPath}`));
      document.head.appendChild(script);
    });
  }
}

