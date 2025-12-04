import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';

/**
 * Serviço para validações de agenda antes de enviar relatório
 */
@Injectable({ providedIn: 'root' })
export class AgendaValidationService {
  private legacy = inject(LegacyService);

  private baseUrl(): string {
    return `${this.legacy.apiBaseUrl}/api/agenda`;
  }

  /**
   * Valida se o relatório pode ser enviado verificando conflitos de agenda.
   * 
   * @param visitId ID da visita técnica
   * @param date Data da visita (formato YYYY-MM-DD)
   * @param shift Turno da visita ('MANHA' ou 'TARDE')
   * @returns Promise<void> - Resolva se válido, rejeita se houver conflito
   * @throws Error com mensagem de conflito (status 409) ou validação (status 400)
   */
  async validateReportSubmission(visitId: number, date: string, shift: string): Promise<void> {
    try {
      const url = `${this.baseUrl()}/validate-report?visitId=${visitId}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;
      
      console.log('[AgendaValidation] Validando relatório:', { visitId, date, shift });
      console.log('[AgendaValidation] URL:', url);
      
      const resp = await fetch(url, { 
        method: 'GET',
        headers: this.legacy.authHeaders() 
      });

      console.log('[AgendaValidation] Response status:', resp.status);

      if (resp.ok) {
        // 200 OK - Validação passou
        console.log('[AgendaValidation] Validação bem-sucedida');
        return;
      }

      // Erro - tentar extrair mensagem
      let errorMessage = 'Erro desconhecido na validação da agenda';
      
      try {
        const data = await resp.json();
        errorMessage = data.message || errorMessage;
      } catch (_) {
        const text = await resp.text();
        errorMessage = text || errorMessage;
      }

      console.error('[AgendaValidation] Erro:', resp.status, errorMessage);

      // Rejeitar com mensagem apropriada
      if (resp.status === 409) {
        throw new Error(`BLOQUEIO DE AGENDA: ${errorMessage}`);
      } else if (resp.status === 400) {
        throw new Error(`Validação inválida: ${errorMessage}`);
      } else {
        throw new Error(errorMessage);
      }

    } catch (e) {
      console.error('[AgendaValidation] Erro na validação:', e);
      throw e;
    }
  }
}
