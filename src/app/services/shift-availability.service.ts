import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';

/**
 * Resposta da verificação de disponibilidade de turno
 */
export interface ShiftAvailabilityResponse {
  blocked: boolean;
  message?: string;
}

/**
 * Serviço para verificar disponibilidade de turno específico
 * Endpoint: GET /api/agenda/check-availability?date=YYYY-MM-DD&shift=MANHA|TARDE
 */
@Injectable({ providedIn: 'root' })
export class ShiftAvailabilityService {
  private legacy = inject(LegacyService);

  private baseUrl(): string {
    return `${this.legacy.apiBaseUrl}/agenda`;
  }

  /**
   * Verifica se um turno específico está disponível (não bloqueado)
   * 
   * @param date Data no formato YYYY-MM-DD
   * @param shift Turno: 'MANHA' ou 'TARDE'
   * @returns Promise com status de bloqueio
   * 
   * @example
   * const result = await this.checkAvailability('2025-12-26', 'MANHA');
   * if (result.blocked) {
   *   console.log('Turno bloqueado:', result.message);
   * }
   */
  async checkAvailability(date: string, shift: 'MANHA' | 'TARDE'): Promise<ShiftAvailabilityResponse> {
    try {
      const url = `${this.baseUrl()}/check-availability?date=${date}&shift=${shift}`;
      
      console.log('[ShiftAvailability] Verificando disponibilidade:', { date, shift });
      
      const resp = await fetch(url, { 
        method: 'GET',
        headers: this.legacy.authHeaders() 
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Falha ao verificar disponibilidade: ${errorText}`);
      }

      const data: ShiftAvailabilityResponse = await resp.json();
      console.log('[ShiftAvailability] Resposta:', { date, shift, blocked: data.blocked });

      return data;

    } catch (e) {
      console.error('[ShiftAvailability] Erro:', e);
      throw e;
    }
  }
}
