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
  totalUsers: number;
  totalCompanies: number;
  totalDocuments: number;
  totalVisitTimeHours: number;
  totalVisitTimeMinutes: number;
}

export interface AdminDocumentsByUser {
  userId?: number | string;
  userName?: string;
  totalVisits: number;
  totalAeps: number;
  totalRisks: number;
  totalDocuments: number;
}

export interface AdminDocument {
  id: number;
  documentType: string;
  title: string;
  clientName: string;
  creationDate: string;
  signed: boolean;
  emailSent: boolean;
  clientEmail?: string;
  sentAt?: string;
  technicianName: string;
}

export interface PageInfo {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminAllDocumentsResponse {
  content: AdminDocument[];
  page: PageInfo;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private legacy = inject(LegacyService);

  private base() { return `${this.legacy.apiBaseUrl}/api/dashboard`; }

  async myStats(): Promise<MyDashboardStats> {
    const url = `${this.base()}/my-stats`;
    console.log('[DashboardService] Chamando URL:', url);
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[DashboardService] Erro na resposta:', resp.status, text);
      throw new Error(`Falha ao carregar dashboard: ${text}`);
    }
    const data = await resp.json();
    console.log('[DashboardService] myStats recebido:', data);
    return data;
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
    console.log('[DashboardService] Chamando URL:', url);
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[DashboardService] Erro na resposta:', resp.status, text);
      throw new Error(`Falha ao carregar documentos por usuário: ${text}`);
    }
    const data = await resp.json();
    console.log('[DashboardService] Dados recebidos:', data);
    return data;
  }

  // Admin: latest documents across platform (admin view)
  async latestAll(): Promise<any[]> {
    const url = `${this.legacy.apiBaseUrl}/documents/latest/all`;
    console.log('[DashboardService] Chamando URL:', url);
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[DashboardService] Erro na resposta:', resp.status, text);
      throw new Error(`Falha ao carregar últimos documentos admin: ${text}`);
    }
    const data = await resp.json();
    console.log('[DashboardService] latestAll recebido:', data);
    return data;
  }

  // Admin: all documents in system with pagination
  async adminAllDocuments(
    page: number = 0,
    size: number = 5,
    type?: string,
    clientName?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AdminAllDocumentsResponse> {
    let url = `${this.legacy.apiBaseUrl}/documents/admin/all`;
    const params: string[] = [];
    params.push(`page=${page}`);
    params.push(`size=${size}`);
    if (type) params.push(`type=${encodeURIComponent(type)}`);
    if (clientName) params.push(`clientName=${encodeURIComponent(clientName)}`);
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (params.length) url += `?${params.join('&')}`;
    console.log('[DashboardService] Chamando URL:', url);
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[DashboardService] Erro na resposta:', resp.status, text);
      throw new Error(`Falha ao carregar todos os documentos: ${text}`);
    }
    const data = await resp.json();
    console.log('[DashboardService] adminAllDocuments recebido:', data);
    return data;
  }
}
