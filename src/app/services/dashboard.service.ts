import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';

export interface TopCompany { companyName: string; documentCount: number }
export interface MyDashboardStats {
  totalVisits: number;
  totalAeps: number;
  totalRisks: number;
  totalVisitTimeHours: number;
  totalVisitTimeMinutes: number;
  topCompanies: TopCompany[];
}

export interface AdminDashboardStats {
  usersActive: number;
  companies: number;
  totalDocuments: number;
  totalVisitTimeHours?: number;
  totalVisitTimeMinutes?: number;
}

export interface AdminDocumentsByUser {
  userId?: number | string;
  userName?: string;
  visits?: number;
  aeps?: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private legacy = inject(LegacyService);

  private base() { return `${this.legacy.apiBaseUrl}/api/dashboard`; }

  async myStats(): Promise<MyDashboardStats> {
    const url = `${this.base()}/my-stats`;
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha ao carregar dashboard: ${text}`);
    }
    return resp.json();
  }

  // Admin: get global platform KPIs
  async adminStats(): Promise<AdminDashboardStats> {
    const url = `${this.base()}/admin-stats`;
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha ao carregar admin stats: ${text}`);
    }
    return resp.json();
  }

  // Admin: documents aggregated by user, optional filters
  async adminDocuments(filters?: { userId?: string | number; type?: string; }): Promise<AdminDocumentsByUser[]> {
    let url = `${this.base()}/admin-stats/documents`;
    const params: string[] = [];
    if (filters) {
      if (filters.userId != null) params.push(`userId=${encodeURIComponent(String(filters.userId))}`);
      if (filters.type) params.push(`type=${encodeURIComponent(String(filters.type))}`);
    }
    if (params.length) url += `?${params.join('&')}`;
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha ao carregar documentos por usuário: ${text}`);
    }
    return resp.json();
  }

  // Admin: latest documents across platform (admin view)
  async latestAll(): Promise<any[]> {
    const url = `${this.legacy.apiBaseUrl}/documents/latest/all`;
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha ao carregar últimos documentos admin: ${text}`);
    }
    return resp.json();
  }
}
