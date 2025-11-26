import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';
import { DocumentSummaryDTO } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private legacy = inject(LegacyService);

  /**
   * Envia e-mail para um documento
   * @param docTypeTag 'risk', 'visit', 'aep', 'checklist'
   * @param id ID do documento
   */
  async sendEmail(docTypeTag: string, id: number | string): Promise<any> {
    if (!docTypeTag || !id) {
      throw new Error('docTypeTag e id são necessários');
    }

    try {
      const url = `${this.legacy.apiBaseUrl}/documents/email/${encodeURIComponent(String(docTypeTag))}/${encodeURIComponent(String(id))}`;
      
      console.log('[DocumentService] 📧 Enviando e-mail para:', url);

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.legacy.authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!resp.ok) {
        let errorDetails = `Status ${resp.status}: ${resp.statusText}`;
        try {
          const contentType = resp.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorBody = await resp.json();
            errorDetails += ` | ${JSON.stringify(errorBody)}`;
            console.error('[DocumentService] ❌ Erro ao enviar:', errorBody);
          } else {
            const errorText = await resp.text();
            errorDetails += ` | ${errorText}`;
            console.error('[DocumentService] ❌ Erro ao enviar:', errorText);
          }
        } catch (parseErr) {
          console.warn('[DocumentService] ⚠️ Erro ao fazer parse da resposta:', parseErr);
        }
        throw new Error(errorDetails);
      }

      const data = await resp.json();
      console.log('[DocumentService] ✅ E-mail enviado com sucesso:', data);
      return data;
    } catch (err) {
      console.error('[DocumentService] ❌ ERRO ao enviar e-mail:', err);
      throw err;
    }
  }

  /**
   * Converte o nome do tipo de documento para a tag da API
   * @param typeName Nome do documento (ex: 'Checklist de Riscos', 'Relatório de Visita')
   * @returns Tag da API (ex: 'risk', 'visit', 'aep')
   */
  getDocTypeTag(typeName: string | null | undefined): string {
    if (!typeName) return '';
    
    const lower = String(typeName).toLowerCase();
    
    // Risco
    if (lower.includes('risco')) return 'risk';
    
    // Visita/Relatório
    if (lower.includes('visita') || lower.includes('relat')) return 'visit';
    
    // Ergonômica
    if (lower.includes('ergonômica') || lower.includes('ergonomica') || lower.includes('aep')) return 'aep';
    
    // Checklist
    if (lower.includes('checklist') || lower.includes('inspecão') || lower.includes('inspeção')) return 'checklist';
    
    return '';
  }
}
