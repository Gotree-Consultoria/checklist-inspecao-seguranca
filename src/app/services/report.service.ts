import { Injectable } from '@angular/core';
import { LegacyService } from './legacy.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private legacy: LegacyService) {}

  // JSON endpoints (use ApiService which returns parsed JSON via HttpClient)
  async postInspectionReport(payload: any) {
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const resp = await fetch('http://localhost:8081/inspection-reports', { 
        headers,
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error('[ReportService] Erro ao postar relatório:', err);
      throw err;
    }
  }

  async fetchInspectionReports(params: Record<string, any> = {}) {
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const qs = new URLSearchParams(params as any).toString();
      const url = 'http://localhost:8081/documents' + (qs ? ('?' + qs) : '');
      
      const resp = await fetch(url, { 
        headers,
        method: 'GET'
      });
      
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error('[ReportService] Erro ao buscar relatórios:', err);
      throw err;
    }
  }

  async fetchLatestDocuments(limit: number = 10) {
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      // Usar fetch diretamente para evitar problemas com HttpClient
      const resp = await fetch('http://localhost:8081/documents/latest', { 
        headers,
        method: 'GET'
      });
      
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error('[ReportService] Erro ao buscar documentos:', err);
      throw err;
    }
  }

  async fetchCompanies() {
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      // Usar fetch diretamente para evitar problemas com HttpClient
      const resp = await fetch('http://localhost:8081/companies', { 
        headers,
        method: 'GET'
      });
      
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error('[ReportService] Erro ao buscar empresas:', err);
      throw err;
    }
  }

  async postCompany(payload: any) {
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const resp = await fetch('http://localhost:8081/companies', { 
        headers,
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error('[ReportService] Erro ao postar empresa:', err);
      throw err;
    }
  }

  async postTechnicalVisit(payload: any) {
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const resp = await fetch('http://localhost:8081/technical-visits', { 
        headers,
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error('[ReportService] Erro ao postar visita técnica:', err);
      throw err;
    }
  }

  // For operations that need raw Response (PDF download, DELETE with raw response)
  private getBase() {
    // LegacyService exposes apiBaseUrl ('' on prod) which matches legacy behavior
    return (this.legacy && (this.legacy as any).apiBaseUrl) || '';
  }

  private authHeaders(): Record<string,string> {
    try { return this.legacy.authHeaders(); } catch(_) { return {}; }
  }

  // Tries multiple slugs until a PDF is returned (mirrors legacy.fetchReportPdf)
  async fetchReportPdf(typeSlugOrArray: string[] | string, reportId: string): Promise<Response> {
    if (!reportId) throw new Error('reportId ausente');
    const types = Array.isArray(typeSlugOrArray) ? typeSlugOrArray.map(t => String(t || '')) : [String(typeSlugOrArray || '')];
    const canonical = ['visit','report','checklist','aep'];
    const candidates: string[] = [];
    types.forEach(t => { if (!candidates.includes(t)) candidates.push(t); });
    canonical.forEach(c => { if (!candidates.includes(c)) candidates.push(c); });
    let lastResp: Response | null = null;
    for (const tRaw of candidates) {
      const t = tRaw == null ? '' : String(tRaw);
      try {
        const url = `${this.getBase()}/documents/${encodeURIComponent(t)}/${encodeURIComponent(reportId)}/pdf`;
        const resp = await fetch(url, { headers: this.authHeaders() });
        lastResp = resp;
        if (!resp.ok) continue;
        const ct = (resp.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('pdf')) return resp;
        continue;
      } catch (err) {
        lastResp = null;
        continue;
      }
    }
    if (lastResp) return lastResp;
    throw new Error('Não foi possível obter PDF para os tipos solicitados.');
  }

  async deleteInspectionReport(reportId: string) {
    if (!reportId) throw new Error('reportId ausente');
    const url = `${this.getBase()}/documents/${encodeURIComponent(reportId)}`;
    return fetch(url, { method: 'DELETE', headers: this.authHeaders() });
  }

  async deleteDocument(type: string, id: string) {
    if (!type || !id) throw new Error('type e id são necessários para exclusão do documento');
    const url = `${this.getBase()}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
    return fetch(url, { method: 'DELETE', headers: this.authHeaders() });
  }
}
