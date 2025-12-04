import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';

/**
 * Serviço para operações de visitas técnicas
 */
@Injectable({ providedIn: 'root' })
export class TechnicalVisitService {
  private legacy = inject(LegacyService);

  private baseUrl(): string {
    return `${this.legacy.apiBaseUrl}/technical-visits`;
  }

  /**
   * Verifica disponibilidade para a próxima visita (data e turno).
   * O backend verifica pelo técnico logado (via token).
   * 
   * @param date Data no formato YYYY-MM-DD
   * @param shift Turno ('MANHA' ou 'TARDE')
   * @returns Promise<void> - Resolve se OK (200), rejeita se bloqueado (409)
   * @throws Error com mensagem de erro
   */
  async checkAvailability(date: string, shift: string): Promise<void> {
    try {
      const url = `${this.baseUrl()}/check-availability?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;
      
      console.log('[TechnicalVisit] Verificando disponibilidade:', { date, shift });
      
      const resp = await fetch(url, { 
        method: 'GET',
        headers: this.legacy.authHeaders() 
      });

      console.log('[TechnicalVisit] Response status:', resp.status);

      if (resp.ok) {
        // 200 OK - Sem bloqueios
        console.log('[TechnicalVisit] ✓ Disponível - Sem bloqueios encontrados');
        return;
      }

      // Erro - tentar extrair mensagem
      let errorMessage = 'Erro ao verificar disponibilidade';
      
      try {
        const data = await resp.json();
        errorMessage = data.message || errorMessage;
      } catch (_) {
        const text = await resp.text();
        errorMessage = text || errorMessage;
      }

      console.error('[TechnicalVisit] Erro:', resp.status, errorMessage);

      // Se for 409 (conflito - data/turno bloqueado), rejeitar com status
      if (resp.status === 409) {
        const error = new Error(errorMessage);
        (error as any).status = 409;
        throw error;
      } else if (resp.status === 500) {
        console.warn('[TechnicalVisit] Endpoint retornou 500, continuando...');
        return;
      } else {
        throw new Error(errorMessage);
      }

    } catch (e) {
      console.error('[TechnicalVisit] Erro na verificação:', e);
      throw e;
    }
  }

  /**
   * Método legado mantido por compatibilidade.
   * Redireciona para checkAvailability.
   */
  async checkDuplicity(companyId: number, date: string, shift: string): Promise<void> {
    console.log('[TechnicalVisit] checkDuplicity chamado (legado) - redirecionando para checkAvailability');
    return this.checkAvailability(date, shift);
  }
}

