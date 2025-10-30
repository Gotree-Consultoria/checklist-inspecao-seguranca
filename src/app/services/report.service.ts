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
      
      if (!payload || typeof payload !== 'object') {
        throw new Error('Payload inválido: não é um objeto');
      }
      
      // 🔍 DEBUG: Criar uma cópia do payload sem as imagens para log (ficam muito grandes)
      const payloadForLogging = JSON.parse(JSON.stringify(payload));
      if (payloadForLogging.clientSignature?.signatureImage) {
        payloadForLogging.clientSignature.signatureImage = `[BASE64 - ${payloadForLogging.clientSignature.signatureImage.length} chars]`;
      }
      if (payloadForLogging.technicianSignature?.signatureImage) {
        payloadForLogging.technicianSignature.signatureImage = `[BASE64 - ${payloadForLogging.technicianSignature.signatureImage.length} chars]`;
      }
      
      console.log('[ReportService] 📤 Enviando para /inspection-reports');
      console.log('[ReportService] 🔍 Validando e limpando IDs aninhados...');
      this.validatePayloadIds(payload);
      
      // 🗑️ IMPORTANTE: Remover qualquer campo 'id' null/undefined que possa causar validação no backend
      const cleanedPayload = this.removeNullIds(payload);
      
      console.log('[ReportService] 📋 Payload (sem Base64):', JSON.stringify(payloadForLogging, null, 2));
      
      const jsonPayload = JSON.stringify(cleanedPayload);
      console.log('[ReportService] � Estrutura do payload:', Object.keys(payload));
      console.log('[ReportService] 📊 Tamanho:', jsonPayload.length, 'bytes');
      
      const resp = await fetch('http://localhost:8081/inspection-reports', { 
        headers,
        method: 'POST',
        body: jsonPayload  // Usando cleanedPayload (sem IDs nulos)
      });
      
      if (!resp.ok) {
        let errorDetails = `Status ${resp.status}: ${resp.statusText}`;
        try {
          const contentType = resp.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorBody = await resp.json();
            errorDetails += ` | ${JSON.stringify(errorBody)}`;
            console.error('[ReportService] ❌ Erro JSON do backend:', errorBody);
            console.error('[ReportService] 🔍 DICA: "The given id must not be null" geralmente significa:');
            console.error('[ReportService] 🔍   1. Uma entidade com @GeneratedValue está sendo salva com id=null');
            console.error('[ReportService] 🔍   2. Um relacionamento @ManyToOne está faltando ou mal estruturado');
            console.error('[ReportService] 🔍   3. Um cascade não está configurado corretamente');
            console.error('[ReportService] 📊 Payload enviado:', payloadForLogging);
          } else {
            const errorText = await resp.text();
            errorDetails += ` | ${errorText}`;
            console.error('[ReportService] ❌ Erro texto do backend:', errorText);
          }
        } catch (parseErr) {
          console.warn('[ReportService] ⚠️ Não foi possível fazer parse da resposta de erro', parseErr);
        }
        throw new Error(errorDetails);
      }
      
      const data = await resp.json();
      console.log('[ReportService] ✅ Inspeção salva com sucesso:', data);
      return data;
    } catch (err) {
      console.error('[ReportService] ❌ ERRO ao postar inspeção:', err);
      throw err;
    }
  }

  private validatePayloadIds(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Verificar se há campo 'id' com valor null
    if (obj.hasOwnProperty('id')) {
      if (obj.id === null || obj.id === undefined) {
        console.warn(`[ReportService] ⚠️ Campo 'id' é nulo em: ${path || 'raiz'}`);
      } else {
        console.log(`[ReportService] ✅ Campo 'id' encontrado em ${path}: ${obj.id}`);
      }
    }
    
    // Verificar recursivamente em arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        this.validatePayloadIds(item, `${path}[${idx}]`);
      });
    } else {
      // Verificar recursivamente em objetos
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.validatePayloadIds(obj[key], `${path}.${key}`);
        }
      });
    }
  }

  private removeNullIds(obj: any, depth: number = 0): any {
    if (depth > 20) return obj; // Proteção contra recursão infinita
    
    if (!obj || typeof obj !== 'object') return obj;
    
    // Se for array, processar cada elemento
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNullIds(item, depth + 1));
    }
    
    // Se for objeto, criar cópia sem campos 'id' nulos e 'undefined'
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      // Se for o campo 'id' e for null/undefined, não incluir
      if (key === 'id' && (obj[key] === null || obj[key] === undefined)) {
        console.log(`[ReportService] 🗑️ Removendo campo 'id' nulo`);
        return; // Pula este campo
      }
      
      // Se for 'undefined', pular (não enviar)
      if (obj[key] === undefined) {
        console.log(`[ReportService] 🗑️ Removendo campo '${key}' (undefined)`);
        return;
      }
      
      // Se for objeto/array, processar recursivamente
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        cleaned[key] = this.removeNullIds(obj[key], depth + 1);
      } else {
        cleaned[key] = obj[key];
      }
    });
    
    return cleaned;
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
        // Tentar capturar o erro detalhado do backend
        let errorDetails = `Status ${resp.status}: ${resp.statusText}`;
        try {
          const contentType = resp.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorBody = await resp.json();
            errorDetails += ` | ${JSON.stringify(errorBody)}`;
          } else {
            const errorText = await resp.text();
            errorDetails += ` | ${errorText}`;
          }
        } catch (parseErr) {
          console.warn('[ReportService] Não foi possível fazer parse da resposta de erro', parseErr);
        }
        throw new Error(errorDetails);
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
